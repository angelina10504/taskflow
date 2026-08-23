const OpenAI = require('openai');
const { modelFor, validateModelConfig } = require('../config/aiModels');

// Provider-agnostic: any OpenAI-compatible endpoint works (Groq, Gemini, OpenRouter,
// local Ollama, …). Defaults target Groq's free tier; override via .env.
const BASE_URL = process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1';

// Which model a given feature calls. Every call site names its feature — the
// same string it already passes to loggedChat — so routing decisions live in
// config/aiModels.js rather than being scattered across controllers.
// Unrouted features get AI_MODEL; see FEATURE_MODEL_ENV for what is routed.
const getModel = (feature) => modelFor(feature);

// Treat any unset key or "your_..._here" style placeholder as "no key configured"
// so callers fall back gracefully instead of erroring.
const isPlaceholderKey = (k) => !k || /^your_.*_here$/.test(k.trim());

// Why the AI layer is or is not usable, in one place. A misconfigured model is
// treated exactly like a missing key: features degrade to their deterministic
// fallbacks rather than erroring, and /ops reports the reason. Not cached — the
// checks are two array lookups, and caching would go stale on an env change.
const aiStatus = () => {
  if (isPlaceholderKey(process.env.AI_API_KEY)) {
    return {
      available: false,
      reason: 'no_api_key',
      detail: 'AI_API_KEY is not set — every AI feature is serving its rule-based fallback.',
      problems: [],
    };
  }
  const { usable, problems, allowed } = validateModelConfig();
  if (!usable) {
    return {
      available: false,
      reason: 'invalid_model',
      detail: `Model configuration is not usable: ${problems.join('; ')}. Fix it in .env, or set AI_ALLOW_UNKNOWN_MODEL=1 to try it anyway.`,
      problems,
    };
  }
  return {
    available: true,
    reason: null,
    detail: allowed && problems.length ? `Unrecognized model allowed by AI_ALLOW_UNKNOWN_MODEL: ${problems.join('; ')}` : null,
    problems,
    model: modelFor(),
  };
};

let client = null;
const getClient = () => {
  if (!aiStatus().available) return null;
  if (client) return client;
  client = new OpenAI({ apiKey: process.env.AI_API_KEY, baseURL: BASE_URL });
  return client;
};

module.exports = { getClient, getModel, aiStatus };
