const mongoose = require('mongoose');

// A point-in-time health snapshot for a project, produced by the Risk Radar
// (scheduled cron scan, boot catch-up scan, or a manual "Scan now").
const healthReportSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    riskLevel: {
      type: String,
      enum: ['on_track', 'at_risk', 'off_track'],
      required: true,
    },
    headline: {
      type: String,
      required: true,
    },
    issues: [
      {
        type: String,
      },
    ],
    metrics: {
      open: Number,
      done: Number,
      overdueCount: Number,
      staleCount: Number,
      weeklyAvg: Number,
      projectedDate: Date,
      deadline: Date,
      willMiss: Boolean,
    },
    // True when riskLevel differs from the previous report for this project.
    riskChanged: {
      type: Boolean,
      default: false,
    },
    trigger: {
      type: String,
      enum: ['scheduled', 'boot', 'manual'],
      default: 'scheduled',
    },
    // True when the headline was written by the LLM (vs. the computed fallback).
    aiNarrative: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Latest-report-per-project is the hot query
healthReportSchema.index({ project: 1, createdAt: -1 });

module.exports = mongoose.model('HealthReport', healthReportSchema);
