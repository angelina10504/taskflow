const AiCall = require('../models/AiCall');

// Fire-and-forget: observability must never slow down or fail a user request.
const record = (fields) => {
  AiCall.create(fields).catch((err) => console.error('[aiLog] write failed:', err.message));
};

// Drop-in replacement for ai.chat.completions.create(params): times the call,
// extracts token usage from the response, and logs one content-free AiCall row.
// Re-throws provider errors so call sites keep their existing fallback paths.
const loggedChat = async (ai, params, meta = {}) => {
  const t0 = Date.now();
  try {
    const completion = await ai.chat.completions.create(params);
    const u = completion.usage || {};
    record({
      ...meta,
      model: params.model,
      latencyMs: Date.now() - t0,
      promptTokens: u.prompt_tokens || 0,
      completionTokens: u.completion_tokens || 0,
      outcome: 'ok',
    });
    return completion;
  } catch (err) {
    record({
      ...meta,
      model: params.model,
      latencyMs: Date.now() - t0,
      outcome: 'error',
      detail: String(err.message || err).slice(0, 200),
    });
    throw err;
  }
};

// Token-less events: 'rejected' (validation refused the model's output and the
// deterministic fallback served the user) and 'cache' (a cached result saved a
// provider call). These are what make fallback/cache rates visible.
const recordAiEvent = ({ user = null, feature, outcome, detail = '' }) =>
  record({ user, feature, outcome, detail: String(detail).slice(0, 200) });

module.exports = { loggedChat, recordAiEvent };
