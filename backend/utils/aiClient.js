const OpenAI = require('openai');
const { modelFor } = require('../config/aiModels');

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

let client = null;
const getClient = () => {
  if (client) return client;
  const apiKey = process.env.AI_API_KEY;
  if (isPlaceholderKey(apiKey)) return null;
  client = new OpenAI({ apiKey, baseURL: BASE_URL });
  return client;
};

module.exports = { getClient, getModel };
