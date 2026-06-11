const OpenAI = require('openai');

// Provider-agnostic: any OpenAI-compatible endpoint works (Groq, Gemini, OpenRouter,
// local Ollama, …). Defaults target Groq's free tier; override via .env.
const MODEL = process.env.AI_MODEL || 'llama-3.3-70b-versatile';
const BASE_URL = process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1';

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

module.exports = { getClient, MODEL };
