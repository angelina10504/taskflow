const Task = require('../models/Task');
const Project = require('../models/Project');
const HealthReport = require('../models/HealthReport');
require('../models/User'); // registers the User schema for .populate('assignedTo')
const { computeVelocityStats } = require('./velocityStats');
const { getClient, MODEL } = require('./aiClient');

// Risk is derived deterministically from the computed stats — the LLM never
// decides the risk level, it only phrases the headline.
const deriveRisk = (stats) => {
  const issues = [];
  const dp = stats.deadlineProjection;

  if (stats.overdue.length) {
    issues.push(
      `${stats.overdue.length} overdue task(s), worst by ${stats.overdue[0].daysOverdue} day(s)`
    );
  }
  if (stats.staleInProgress.length) {
    issues.push(`${stats.staleInProgress.length} in-progress task(s) untouched for 5+ days`);
  }
  if (dp.willMiss) {
    issues.push(
      dp.slackDays != null
        ? `projected to miss the deadline by ${Math.abs(dp.slackDays)} day(s)`
        : 'projected to miss the deadline'
    );
  }
  if (dp.deadline && stats.totals.open > 0 && stats.throughput.weeklyAvg === 0) {
    issues.push('open work but no recent completions to forecast from');
  }

  let riskLevel = 'on_track';
  if (issues.length) riskLevel = 'at_risk';
  if (dp.willMiss || stats.overdue.length >= 3) riskLevel = 'off_track';

  return { riskLevel, issues };
};

const defaultHeadline = (riskLevel, stats, issues) => {
  if (riskLevel === 'on_track') {
    return `On track — ${stats.totals.open} open task(s), ${stats.throughput.weeklyAvg}/week throughput.`;
  }
  return issues[0] ? `Attention: ${issues[0]}.` : 'Review the board — potential risks detected.';
};

// Scan one project: compute stats, derive risk, persist a HealthReport, and
// broadcast it to the project's Socket.IO room (if io is provided).
const scanProject = async (projectId, io, trigger = 'manual') => {
  const project = await Project.findById(projectId);
  if (!project) return null;

  const tasks = await Task.find({ project: project._id }).populate('assignedTo', 'name email');
  const stats = computeVelocityStats(tasks, project);
  const { riskLevel, issues } = deriveRisk(stats);

  const prev = await HealthReport.findOne({ project: project._id }).sort('-createdAt');
  const riskChanged = !!prev && prev.riskLevel !== riskLevel;

  let headline = defaultHeadline(riskLevel, stats, issues);
  let aiNarrative = false;

  // Only spend an LLM call when there is something to act on.
  const ai = getClient();
  if (ai && riskLevel !== 'on_track') {
    try {
      const completion = await ai.chat.completions.create({
        model: MODEL,
        max_tokens: 80,
        messages: [
          {
            role: 'system',
            content:
              'You are a project health monitor. Given metrics JSON for a Kanban project, reply with ONE short sentence (max 20 words) telling the project lead the single most important thing to act on. No preamble, no quotes.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              project: stats.project.name,
              riskLevel,
              issues,
              totals: stats.totals,
              throughput: stats.throughput,
              deadlineProjection: stats.deadlineProjection,
            }),
          },
        ],
      });
      const text = completion.choices?.[0]?.message?.content?.trim();
      if (text) {
        headline = text.replace(/^"+|"+$/g, '');
        aiNarrative = true;
      }
    } catch (err) {
      // Keep the computed headline — the radar must never fail because the LLM did.
      console.error('Risk radar AI headline failed:', err.message);
    }
  }

  const report = await HealthReport.create({
    project: project._id,
    workspace: project.workspace,
    riskLevel,
    headline,
    issues,
    metrics: {
      open: stats.totals.open,
      done: stats.totals.done,
      overdueCount: stats.overdue.length,
      staleCount: stats.staleInProgress.length,
      weeklyAvg: stats.throughput.weeklyAvg,
      projectedDate: stats.deadlineProjection.projectedDate,
      deadline: stats.deadlineProjection.deadline,
      willMiss: stats.deadlineProjection.willMiss,
    },
    riskChanged,
    trigger,
    aiNarrative,
  });

  if (io) io.to(project._id.toString()).emit('health-report', report);
  return report;
};

// Reports newer than this are considered fresh enough for the boot catch-up
// scan to skip (avoids re-scanning on every nodemon restart / redeploy).
const FRESH_MS = 20 * 60 * 60 * 1000;

const scanAllActiveProjects = async (io, trigger = 'scheduled') => {
  const projects = await Project.find({ status: 'active' }).select('_id');
  let scanned = 0;
  for (const p of projects) {
    if (trigger === 'boot') {
      const latest = await HealthReport.findOne({ project: p._id })
        .sort('-createdAt')
        .select('createdAt');
      if (latest && Date.now() - latest.createdAt.getTime() < FRESH_MS) continue;
    }
    try {
      await scanProject(p._id, io, trigger);
      scanned++;
    } catch (err) {
      console.error('Risk radar scan failed for project', p._id.toString(), err.message);
    }
  }
  console.log(`🩺 Risk radar: scanned ${scanned}/${projects.length} active project(s) [${trigger}]`);
  return scanned;
};

module.exports = { scanProject, scanAllActiveProjects, deriveRisk };
