#!/usr/bin/env node
// TaskFlow AI eval harness.
//
//   node evals/run.js                         # run every suite
//   node evals/run.js --suite quick-add       # one suite (quick-add | extract-tasks | decompose)
//   node evals/run.js --limit 5               # first N cases of each suite (smoke test)
//   node evals/run.js --concurrency 2         # parallel requests (default 2 — Groq free tier)
//   node evals/run.js --threshold 0.8         # exit 1 if overall pass rate falls below this
//
// The harness imports the REAL system prompts and validation rules from the
// production controller, pins the clock (roster.js), sends requests shaped
// exactly like production, and scores deterministically (score.js). Results
// land in evals/results/latest.json.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Evals share rate limits with whatever key they use — set EVAL_API_KEY to a
// separate key/org so a big eval run can never starve the production app.
if (process.env.EVAL_API_KEY) process.env.AI_API_KEY = process.env.EVAL_API_KEY;

const fs = require('fs');
const { getClient, MODEL } = require('../utils/aiClient');
const { __evalInternals } = require('../controllers/aiController');
const { QUICK_ADD_SYSTEM, EXTRACT_SYSTEM, DECOMPOSE_SYSTEM, TODAY_SYSTEM, buildCalendar } = __evalInternals;
const { PINNED_NOW, CURRENT_USER, MEMBERS } = require('./roster');
const { scoreQuickAdd, scoreExtract, scoreDecompose, scoreToday } = require('./score');

// Approximate Groq pricing, USD per 1M tokens (input, output).
const PRICES = {
  'llama-3.3-70b-versatile': [0.59, 0.79],
  'llama-3.1-8b-instant': [0.05, 0.08],
};
const [PRICE_IN, PRICE_OUT] = PRICES[MODEL] || PRICES['llama-3.3-70b-versatile'];

const CALENDAR = buildCalendar(10, PINNED_NOW);

// Each suite mirrors its controller: same system prompt, same payload shape,
// same max_tokens, same "slice from { to }" JSON recovery.
const SUITES = {
  'quick-add': {
    cases: require('./datasets/quick-add.cases'),
    system: QUICK_ADD_SYSTEM,
    maxTokens: 300,
    payload: (c) => ({ text: c.text, calendar: CALENDAR, current_user: CURRENT_USER, members: MEMBERS }),
    score: (c, json) => scoreQuickAdd(c, json),
  },
  'extract-tasks': {
    cases: require('./datasets/extract-tasks.cases'),
    system: EXTRACT_SYSTEM,
    maxTokens: 1500,
    payload: (c) => ({ notes: c.notes, calendar: CALENDAR, current_user: CURRENT_USER, members: MEMBERS }),
    score: (c, json) => scoreExtract(c, Array.isArray(json.items) ? json.items : []),
  },
  decompose: {
    cases: require('./datasets/decompose.cases'),
    system: DECOMPOSE_SYSTEM,
    maxTokens: 1800,
    payload: (c) => ({ goal: c.goal, project: { name: 'TaskFlow', description: 'Kanban project management app' } }),
    score: (c, json) => scoreDecompose(c, Array.isArray(json.items) ? json.items : []),
  },
  today: {
    cases: require('./datasets/today.cases'),
    system: TODAY_SYSTEM,
    maxTokens: 900,
    payload: (c) => ({ today: new Date(PINNED_NOW).toDateString(), capacity: c.capacity, candidates: c.candidates }),
    score: (c, json) => scoreToday(c, json),
  },
};

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : 'n/a');

const runCase = async (ai, suite, c) => {
  const t0 = Date.now();
  const base = { id: c.id, category: c.category || null };
  try {
    const completion = await ai.chat.completions.create(
      {
        model: MODEL,
        max_tokens: suite.maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: suite.system },
          { role: 'user', content: JSON.stringify(suite.payload(c), null, 2) },
        ],
      },
      { maxRetries: 5, timeout: 90000 }
    );
    const latencyMs = Date.now() - t0;
    const usage = completion.usage || {};
    const out = completion.choices?.[0]?.message?.content || '';
    let json;
    try {
      json = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
    } catch (e) {
      return { ...base, pass: false, fails: ['unparseable model output'], latencyMs, usage };
    }
    const scored = suite.score(c, json);
    return { ...base, ...scored, latencyMs, usage: { prompt: usage.prompt_tokens || 0, completion: usage.completion_tokens || 0 } };
  } catch (err) {
    const msg = err.message || String(err);
    return {
      ...base,
      pass: false,
      fails: [`request failed: ${msg}`],
      latencyMs: Date.now() - t0,
      usage: {},
      // A per-MINUTE limit is worth retrying; a per-DAY limit means the whole
      // budget is gone and every further request is wasted.
      dayLimited: /tokens per day|\(TPD\)/i.test(msg),
    };
  }
};

const runSuite = async (ai, name, suite, { limit, concurrency }) => {
  const cases = limit ? suite.cases.slice(0, limit) : suite.cases;
  console.log(`\n── ${name} ─ ${cases.length} cases ${'─'.repeat(Math.max(1, 40 - name.length))}`);
  const results = [];
  let next = 0;
  let aborted = false;
  const worker = async () => {
    while (next < cases.length && !aborted) {
      const c = cases[next++];
      const r = await runCase(ai, suite, c);
      results.push(r);
      console.log(` ${r.pass ? '✓' : '✗'} ${r.id}${r.pass ? '' : `  →  ${r.fails.join(' | ')}`}`);
      if (r.dayLimited && !aborted) {
        aborted = true;
        console.log(' !! DAILY token budget exhausted — aborting; further requests would be wasted');
      }
      await sleep(350); // stay friendly to free-tier rate limits
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));

  // Repair pass: per-MINUTE rate-limit casualties get one more attempt after
  // the window resets, so infra hiccups never masquerade as quality failures.
  const casualties = results
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => !r.pass && r.fails.some((f) => f.startsWith('request failed')));
  if (casualties.length && !aborted) {
    console.log(` retrying ${casualties.length} rate-limited case(s) after a 20s cooldown…`);
    await sleep(20000);
    for (const { r, i } of casualties) {
      const c = cases.find((x) => x.id === r.id);
      results[i] = await runCase(ai, suite, c);
      const nr = results[i];
      console.log(` ${nr.pass ? '✓' : '✗'} ${nr.id} (retry)${nr.pass ? '' : `  →  ${nr.fails.join(' | ')}`}`);
      if (nr.dayLimited) {
        aborted = true;
        console.log(' !! DAILY token budget exhausted — aborting; further requests would be wasted');
        break;
      }
      await sleep(1000);
    }
  }

  const passed = results.filter((r) => r.pass).length;
  console.log(` suite: ${passed}/${results.length} passed (${pct(passed, results.length)})`);

  // Per-field accuracy (quick-add) and per-category breakdown — the numbers
  // that matter more than the single pass rate.
  if (results.some((r) => r.checks)) {
    const fields = ['title', 'priority', 'due', 'assignees', 'status'];
    const acc = fields
      .map((f) => `${f} ${pct(results.filter((r) => r.checks && r.checks[f]).length, results.length)}`)
      .join(' · ');
    console.log(` field accuracy: ${acc}`);
  }
  const cats = [...new Set(results.map((r) => r.category).filter(Boolean))];
  if (cats.length > 1) {
    const line = cats
      .map((cat) => {
        const rs = results.filter((r) => r.category === cat);
        return `${cat} ${rs.filter((r) => r.pass).length}/${rs.length}`;
      })
      .join(' · ');
    console.log(` by category: ${line}`);
  }
  return { results, aborted };
};

const main = async () => {
  const ai = getClient();
  if (!ai) {
    console.error('No AI key configured — set AI_API_KEY in backend/.env before running evals.');
    process.exit(2);
  }

  const suiteArg = arg('suite', 'all');
  const limit = Number(arg('limit', 0)) || 0;
  const concurrency = Number(arg('concurrency', 2)) || 2;
  const threshold = Number(arg('threshold', 0.8));

  const names = suiteArg === 'all' ? Object.keys(SUITES) : [suiteArg];
  if (names.some((n) => !SUITES[n])) {
    console.error(`Unknown suite "${suiteArg}". Valid: ${Object.keys(SUITES).join(', ')}, all`);
    process.exit(2);
  }

  console.log(`TaskFlow AI evals · model: ${MODEL} · clock pinned to 2026-07-01 (Wed)`);
  const started = Date.now();
  const bySuite = {};
  let aborted = false;
  for (let s = 0; s < names.length; s++) {
    const out = await runSuite(ai, names[s], SUITES[names[s]], { limit, concurrency });
    bySuite[names[s]] = out.results;
    if (out.aborted) {
      aborted = true;
      break;
    }
    if (s < names.length - 1) {
      console.log(' (15s cooldown so the next suite starts with a fresh rate-limit window…)');
      await sleep(15000);
    }
  }

  const all = Object.values(bySuite).flat();
  const passed = all.filter((r) => r.pass).length;
  const latencies = all.map((r) => r.latencyMs).sort((a, b) => a - b);
  const tokIn = all.reduce((s, r) => s + (r.usage.prompt || 0), 0);
  const tokOut = all.reduce((s, r) => s + (r.usage.completion || 0), 0);
  const cost = (tokIn * PRICE_IN + tokOut * PRICE_OUT) / 1e6;

  console.log(`\n${'═'.repeat(56)}`);
  console.log(` OVERALL: ${passed}/${all.length} passed (${pct(passed, all.length)}) in ${((Date.now() - started) / 1000).toFixed(0)}s`);
  console.log(` latency: p50 ${latencies[Math.floor(latencies.length / 2)] || 0}ms · max ${latencies[latencies.length - 1] || 0}ms`);
  console.log(` tokens: ${tokIn.toLocaleString()} in / ${tokOut.toLocaleString()} out · est. cost $${cost.toFixed(4)}`);

  const report = {
    ranAt: new Date().toISOString(),
    model: MODEL,
    pinnedClock: '2026-07-01T12:00:00Z',
    aborted,
    overall: { passed, total: all.length, passRate: all.length ? passed / all.length : 0 },
    latencyMs: { p50: latencies[Math.floor(latencies.length / 2)] || 0, max: latencies[latencies.length - 1] || 0 },
    tokens: { in: tokIn, out: tokOut, estCostUsd: Number(cost.toFixed(4)) },
    suites: Object.fromEntries(
      Object.entries(bySuite).map(([n, rs]) => [
        n,
        { passed: rs.filter((r) => r.pass).length, total: rs.length, cases: rs },
      ])
    ),
  };
  const outRel = arg('out', 'results/latest.json');
  const outPath = path.isAbsolute(outRel) ? outRel : path.join(__dirname, outRel);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(` report: evals/${outRel}`);

  if (aborted) {
    console.error(' ABORTED: daily token quota exhausted — results are partial, re-run when it resets');
    process.exit(3);
  }
  if (all.length && passed / all.length < threshold) {
    console.error(` FAIL: pass rate below threshold (${threshold})`);
    process.exit(1);
  }
};

main().catch((err) => {
  console.error('Eval run crashed:', err);
  process.exit(2);
});
