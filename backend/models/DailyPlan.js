const mongoose = require('mongoose');

// One cached plan per user per day. The plan costs an LLM call, so it's
// computed once each morning (or on explicit refresh) — not on every visit.
const dailyPlanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD in server time
    briefing: { type: String, default: '' },
    aiAvailable: { type: Boolean, default: false },
    capacity: { type: Number, default: 3 },
    candidateCount: { type: Number, default: 0 },
    picks: [
      {
        task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
        reason: String,
        estimateMin: Number,
        estimateSource: { type: String, enum: ['set', 'similar', null], default: null },
      },
    ],
  },
  { timestamps: true }
);

dailyPlanSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyPlan', dailyPlanSchema);
