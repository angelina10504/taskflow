// Deterministic scorers for the eval harness. No LLM-as-judge anywhere:
// every check is exact-match, set-equality, or keyword containment, so a
// score change between runs can only come from the model or the prompt.
//
// Normalization deliberately MIRRORS the production controllers
// (aiController quick-add/extract/decompose): lowercase → enum check → null,
// assignee ids filtered to the roster. A "pass" therefore means production
// would have accepted and stored exactly the expected values.

const { __evalInternals } = require('../controllers/aiController');
const { STATUS_ENUM, PRIORITY_ENUM } = __evalInternals;
const { MEMBER_IDS } = require('./roster');

const lc = (s) => String(s).toLowerCase();
const anyOf = (exp) => (Array.isArray(exp) ? exp : [exp]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Controller rule: values outside the enum collapse to null.
const normEnum = (allowed, v) =>
  allowed.includes(typeof v === 'string' ? v.toLowerCase() : v) ? v.toLowerCase() : null;

// Controller rule: ids not in the member list are dropped.
const normAssignees = (ids) =>
  (Array.isArray(ids) ? ids : [])
    .map(String)
    .filter((id) => MEMBER_IDS.includes(id))
    .sort();

// The prompt mandates "YYYY-MM-DD" — anything else is an instruction violation.
const normDue = (v) => {
  if (v === null || v === undefined || v === '') return null;
  return DATE_RE.test(String(v)) ? String(v) : `invalid(${v})`;
};

const setEq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

const checkTitle = (expect, title, fails) => {
  const t = typeof title === 'string' ? title.trim() : '';
  const has = (expect.title_has || []).every((k) => lc(t).includes(lc(k)));
  const lacks = !(expect.title_lacks || []).some((k) => lc(t).includes(lc(k)));
  const ok = t.length > 0 && has && lacks;
  if (!ok) fails.push(`title: got "${t}"`);
  return ok;
};

const checkField = (name, got, expected, fails) => {
  const ok = anyOf(expected === undefined ? null : expected).some((want) =>
    Array.isArray(want) ? setEq([...want].sort(), got) : want === got
  );
  if (!ok) fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(expected === undefined ? null : expected)}`);
  return ok;
};

// ── Quick-Add: one raw model object vs one expectation ──────────────────────
const scoreQuickAdd = (c, raw) => {
  const fails = [];
  const checks = {
    title: checkTitle(c.expect, raw.title, fails),
    priority: checkField('priority', normEnum(PRIORITY_ENUM, raw.priority), c.expect.priority, fails),
    due: checkField('due', normDue(raw.due_date), c.expect.due, fails),
    status: checkField('status', normEnum(STATUS_ENUM, raw.status), c.expect.status, fails),
    assignees: false,
  };
  const gotA = normAssignees(raw.assignee_ids);
  const wantSets = c.expect.assignees_oneOf || [c.expect.assignees || []];
  checks.assignees = wantSets.some((w) => setEq([...w].sort(), gotA));
  if (!checks.assignees) fails.push(`assignees: got [${gotA}], want ${JSON.stringify(wantSets)}`);
  return { pass: fails.length === 0, checks, fails };
};

// ── Meeting Notes → Tasks: a list of raw items vs count/must/forbid rules ───
const scoreExtract = (c, rawItems) => {
  const fails = [];
  const items = (Array.isArray(rawItems) ? rawItems : []).map((it) => ({
    title: typeof it.title === 'string' ? it.title.trim() : '',
    description: typeof it.description === 'string' ? it.description : '',
    priority: normEnum(PRIORITY_ENUM, it.priority),
    due: normDue(it.due_date),
    assignees: normAssignees(it.assignee_ids),
  }));

  const [lo, hi] = c.expect.count;
  if (items.length < lo || items.length > hi) {
    fails.push(`count: got ${items.length} items, want ${lo}-${hi} (titles: ${items.map((i) => `"${i.title}"`).join(', ') || 'none'})`);
  }

  for (const must of c.expect.must) {
    const hit = items.find((it) => must.match.every((k) => lc(it.title).includes(lc(k))));
    if (!hit) {
      fails.push(`missing item matching [${must.match}]`);
      continue;
    }
    if (must.priority !== undefined) checkField(`[${must.match}] priority`, hit.priority, must.priority, fails);
    if (must.due !== undefined) checkField(`[${must.match}] due`, hit.due, must.due, fails);
    if (must.assignees !== undefined || must.assignees_oneOf !== undefined) {
      const wantSets = must.assignees_oneOf || [must.assignees];
      if (!wantSets.some((w) => setEq([...w].sort(), hit.assignees))) {
        fails.push(`[${must.match}] assignees: got [${hit.assignees}], want ${JSON.stringify(wantSets)}`);
      }
    }
    if (must.desc_has && !must.desc_has.every((k) => lc(hit.description).includes(lc(k)))) {
      fails.push(`[${must.match}] description missing [${must.desc_has}]: got "${hit.description}"`);
    }
  }

  for (const bad of c.expect.forbid) {
    const offender = items.find((it) => lc(it.title).includes(lc(bad)));
    if (offender) fails.push(`forbidden keyword "${bad}" in item "${offender.title}"`);
  }

  return { pass: fails.length === 0, fails };
};

// ── Decompose: structural instruction-following checks ──────────────────────
const scoreDecompose = (c, rawItems) => {
  const fails = [];
  const items = Array.isArray(rawItems) ? rawItems : [];

  if (items.length < 5 || items.length > 10) fails.push(`count: got ${items.length} subtasks, want 5-10`);

  const titles = items.map((it) => (typeof it.title === 'string' ? it.title.trim() : ''));
  if (titles.some((t) => !t || t.length > 100)) fails.push('a subtask title is empty or over 100 chars');
  if (new Set(titles.map(lc)).size !== titles.length) fails.push('duplicate subtask titles');

  const priorities = items.map((it) => normEnum(PRIORITY_ENUM, it.priority));
  if (priorities.some((p) => p === null)) fails.push('a subtask is missing a valid priority (prompt requires one)');
  if (!priorities.some((p) => p === 'high' || p === 'urgent')) fails.push('no high/urgent subtask — foundational work should be high');

  for (const it of items) {
    const m = it.estimated_minutes;
    if (m === null || m === undefined) continue;
    const n = Number(m);
    if (!Number.isFinite(n) || n < 30 || n > 960) {
      fails.push(`estimated_minutes ${JSON.stringify(m)} outside the prompt's 30-960 range`);
      break;
    }
  }

  const blob = lc(items.map((it) => `${it.title} ${it.description || ''}`).join(' '));
  const hits = c.keywords.filter((k) => blob.includes(lc(k)));
  if (hits.length < c.min_keyword_hits) {
    fails.push(`plan off-topic: only ${hits.length}/${c.min_keyword_hits} required domain keywords found (${hits.join(', ') || 'none'})`);
  }

  return { pass: fails.length === 0, fails };
};

// ── today plan ───────────────────────────────────────────────────────────────
// Mirrors the production validation in getTodayPlan: ids must come from the
// candidate set, no dupes, capacity respected — plus case-specific ranking
// expectations (must_first / must_include / must_exclude / order_pairs).
const scoreToday = (c, json) => {
  const fails = [];
  const picks = Array.isArray(json.picks) ? json.picks : [];
  if (!Array.isArray(json.picks)) fails.push('picks missing or not an array');

  const validIds = new Set(c.candidates.map((x) => x.id));
  const ids = picks.map((p) => String(p.id));

  if (ids.some((id) => !validIds.has(id))) fails.push('a pick id is not in the candidate set (hallucinated task)');
  if (new Set(ids).size !== ids.length) fails.push('duplicate picks');
  if (picks.length === 0) fails.push('empty plan');
  if (picks.length > c.capacity) fails.push(`over capacity: picked ${picks.length}, capacity ${c.capacity}`);
  if (picks.some((p) => typeof p.reason !== 'string' || p.reason.trim().length < 5)) fails.push('a pick has no usable reason');
  if (picks.some((p) => typeof p.reason === 'string' && p.reason.length > 160)) fails.push('a reason exceeds the length limit');
  if (typeof json.briefing !== 'string' || json.briefing.trim().length < 10) fails.push('briefing missing or too short');

  const e = c.expect || {};
  for (const id of e.must_include || []) {
    if (!ids.includes(id)) fails.push(`must include ${id} (${c.candidates.find((x) => x.id === id)?.title?.slice(0, 40)})`);
  }
  for (const id of e.must_exclude || []) {
    if (ids.includes(id)) fails.push(`must exclude ${id} (${c.candidates.find((x) => x.id === id)?.title?.slice(0, 40)})`);
  }
  if (e.must_first && ids[0] !== e.must_first) fails.push(`first pick should be ${e.must_first}, got ${ids[0] || 'none'}`);
  for (const [above, below] of e.order_pairs || []) {
    const ia = ids.indexOf(above);
    const ib = ids.indexOf(below);
    if (ia === -1) fails.push(`must include ${above} for ordering check`);
    else if (ib !== -1 && ib < ia) fails.push(`${above} should rank above ${below}`);
  }
  if (e.reasons_mention_numbers && picks.length && !picks.some((p) => /\d/.test(p.reason || ''))) {
    fails.push('no reason cites a concrete number (days overdue, deadline distance…)');
  }

  return { pass: fails.length === 0, fails };
};

module.exports = { scoreQuickAdd, scoreExtract, scoreDecompose, scoreToday };
