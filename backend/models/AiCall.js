const mongoose = require('mongoose');

// One row per LLM provider call (outcome ok/error, with token usage), plus
// token-less event rows (rejected = validation refused the model's output,
// cache = a cached plan/report saved a call). Deliberately content-free:
// no prompt or response text is ever stored, so ops metrics can be shown to
// any signed-in user without leaking board content across workspaces.
const aiCallSchema = new mongoose.Schema({
  user: {
    // Optional: risk-radar scans run from boot/cron with no user in scope.
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  feature: {
    type: String,
    enum: ['velocity', 'command', 'quick_add', 'extract', 'decompose', 'ask', 'today', 'health'],
    required: true,
    index: true,
  },
  model: { type: String, default: '' },
  promptTokens: { type: Number, default: 0 },
  completionTokens: { type: Number, default: 0 },
  latencyMs: { type: Number, default: 0 },
  outcome: {
    type: String,
    enum: ['ok', 'error', 'rejected', 'cache'],
    required: true,
    index: true,
  },
  // Content-free note: provider error message, rejection reason, scan trigger.
  detail: { type: String, maxlength: 200, default: '' },
  createdAt: {
    type: Date,
    default: Date.now,
    // TTL: observability data is operational, not archival — keep 30 days.
    expires: 60 * 60 * 24 * 30,
  },
});

aiCallSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AiCall', aiCallSchema);
