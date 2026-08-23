// The one place a model id or its price lives.
//
// Everything that needs to know which model to call or what it costs reads from
// here: utils/aiClient.js (getModel), controllers/aiController.js (/ops cost
// table), utils/riskRadar.js, and evals/run.js. The CI workflow deliberately
// carries no model literal either — it passes repo variables through as
// overrides and lets DEFAULT_MODEL apply when they are unset.
//
// Adding or repricing a model is one edit, in this file.

// Shipping default when AI_MODEL is unset.
const DEFAULT_MODEL = 'openai/gpt-oss-120b';

// Per-1M-token list prices in USD, from Groq's model docs (verified 2026-08-24:
// console.groq.com/docs/model/openai/gpt-oss-120b and .../gpt-oss-20b). Cost
// visibility for /ops and eval reports — not billing.
const CATALOG = [
  { id: 'openai/gpt-oss-120b', inPerM: 0.15, outPerM: 0.6 },
  { id: 'openai/gpt-oss-20b', inPerM: 0.075, outPerM: 0.3 },
];

// Tombstones for models the provider has shut down. Kept deliberately: a stale
// .env should produce "shut down on <date>, use <x> instead" rather than the
// bare "unknown model" that cost this project two silent breakages in a week.
const RETIRED = [
  {
    id: 'llama-3.3-70b-versatile',
    retiredOn: '2026-08-16',
    replacement: 'openai/gpt-oss-120b',
  },
  {
    id: 'llama-3.1-8b-instant',
    retiredOn: '2026-08-16',
    replacement: 'openai/gpt-oss-20b',
  },
];

// Per-feature model routing. A feature listed here reads its model from the
// named env var; everything else uses AI_MODEL. Routing is opt-in: when the
// var is unset the feature falls back to AI_MODEL, so cloning the repo and
// setting only AI_MODEL behaves exactly as it did before routing existed.
//
// A feature belongs here only with a current eval result behind it. The
// original justification (8B scoring 6/6 on decompose) is void — that model is
// retired — so this map is empty until the suite is re-run. See evals/README.md.
const FEATURE_MODEL_ENV = {};

// Env is read per call, not at module load, so dotenv ordering and per-process
// overrides (eval runs, CI) always take effect.
// .trim() because dotenv preserves whitespace inside quoted values — a stray
// space in AI_MODEL="… " would otherwise reach the provider as a bad model id.
const modelFor = (feature) => {
  const envVar = FEATURE_MODEL_ENV[feature];
  const routed = envVar && process.env[envVar];
  return (routed || process.env.AI_MODEL || DEFAULT_MODEL).trim();
};

// Exact id first, then substring, so a versioned or prefixed variant still
// prices correctly without "20b" accidentally matching "gpt-oss-120b".
const findRate = (model) =>
  CATALOG.find((m) => m.id === model) || CATALOG.find((m) => (model || '').includes(m.id));

// An unpriced model returns the default model's rate flagged `unknown` rather
// than silently pretending to be priced — callers can surface the caveat, and
// a mis-set model name shows up instead of quietly skewing every cost figure.
const DEFAULT_RATE = CATALOG.find((m) => m.id === DEFAULT_MODEL) || CATALOG[0];
const ratesFor = (model) => findRate(model) || { ...DEFAULT_RATE, unknown: true };

const costOf = (model, promptTokens, completionTokens) => {
  const r = ratesFor(model);
  return ((promptTokens || 0) * r.inPerM + (completionTokens || 0) * r.outPerM) / 1e6;
};

// Fail at boot, not at 3am in production. Two dead model names shipped silently
// in one week (llama-3.3-70b-versatile and llama-3.1-8b-instant, both retired
// 2026-08-16); each would have been a one-line boot error instead of a 502 on a
// user request. Only explicitly-set values are checked — unset stays valid, so
// routing remains opt-in and a bare clone still boots.
//
// Escape hatch: AI_ALLOW_UNKNOWN_MODEL=1 downgrades this to a warning, so trying
// a model Groq shipped this morning does not require editing this file first.
const validateModelConfig = (env = process.env) => {
  const problems = [];
  for (const name of ['AI_MODEL', ...Object.values(FEATURE_MODEL_ENV)]) {
    const value = (env[name] || '').trim();
    if (!value) continue; // unset is always valid — it falls back
    if (findRate(value)) continue;
    const dead = RETIRED.find((m) => m.id === value);
    problems.push(
      dead
        ? `${name}="${value}" was shut down on ${dead.retiredOn}. Use "${dead.replacement}".`
        : `${name}="${value}" is not a known model. Known: ${CATALOG.map((m) => m.id).join(', ')}.`
    );
  }
  if (!problems.length) return { ok: true, problems: [] };

  const detail = problems.map((p) => `  - ${p}`).join('\n');
  if (/^(1|true|yes)$/i.test((env.AI_ALLOW_UNKNOWN_MODEL || '').trim())) {
    console.warn(`[aiModels] model config not recognized (AI_ALLOW_UNKNOWN_MODEL is set):\n${detail}`);
    return { ok: false, problems, allowed: true };
  }
  throw new Error(
    `Invalid AI model configuration in .env:\n${detail}\n` +
      '  Fix the value, or set AI_ALLOW_UNKNOWN_MODEL=1 to boot anyway.'
  );
};

module.exports = {
  DEFAULT_MODEL,
  CATALOG,
  RETIRED,
  FEATURE_MODEL_ENV,
  modelFor,
  ratesFor,
  costOf,
  validateModelConfig,
};
