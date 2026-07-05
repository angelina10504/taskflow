// Deterministic half of the Today planner. Everything here is computed in
// code — the LLM never invents a number. It receives these features, picks
// which tasks make today's plan, and explains each pick; validation rejects
// anything outside the candidate set. Same contract as the rest of the app:
// model proposes, code decides.

const MS_PER_DAY = 86400000;
const round1 = (n) => Math.round(n * 10) / 10;

const PRIORITY_WEIGHT = { urgent: 30, high: 20, medium: 10, low: 3 };

// Per-task features from live board data. `now` is injectable for tests.
const buildFeatures = (task, now = Date.now()) => {
  const due = task.dueDate ? new Date(task.dueDate).getTime() : null;
  const daysToDue = due != null ? round1((due - now) / MS_PER_DAY) : null;
  const overdueDays = daysToDue != null && daysToDue < 0 ? round1(-daysToDue) : 0;
  const staleDays =
    task.status === 'in_progress' && task.updatedAt
      ? Math.max(0, Math.floor((now - new Date(task.updatedAt).getTime()) / MS_PER_DAY))
      : 0;
  const projDeadline = task.project?.deadline ? new Date(task.project.deadline).getTime() : null;
  return {
    daysToDue,
    overdueDays,
    priority: task.priority || 'medium',
    status: task.status,
    staleDays,
    estimateMin: typeof task.estimatedTime === 'number' && task.estimatedTime > 0 ? task.estimatedTime : null,
    projectDeadlineDays: projDeadline != null ? round1((projDeadline - now) / MS_PER_DAY) : null,
  };
};

// One number the model can lean on (and the fallback ranking sorts by).
const baseScore = (f) => {
  let s = PRIORITY_WEIGHT[f.priority] ?? 10;
  if (f.overdueDays > 0) s += 40 + 3 * Math.min(f.overdueDays, 10);
  else if (f.daysToDue != null && f.daysToDue <= 7) s += (7 - f.daysToDue) * 4;
  if (f.status === 'in_progress') s += 12; // finish what's started
  s += Math.min(f.staleDays * 2, 10); // idle in-progress work is silently rotting
  if (f.projectDeadlineDays != null && f.projectDeadlineDays <= 14) s += 8;
  return Math.round(s);
};

// Honest plan size: anchored to what the user actually finishes, not wishes.
const planCapacity = (completedLast7d) =>
  Math.min(Math.max(2 + Math.ceil(completedLast7d / 2), 3), 6);

// Rule-based reason string — used when no AI key is configured, so the
// fallback plan is explainable too (never dress it up as an AI opinion).
const ruleReason = (f) => {
  const bits = [];
  if (f.overdueDays > 0) bits.push(`overdue by ${Math.round(f.overdueDays)}d`);
  else if (f.daysToDue != null && f.daysToDue <= 7) bits.push(`due in ${Math.max(0, Math.round(f.daysToDue))}d`);
  if (f.priority === 'urgent' || f.priority === 'high') bits.push(`${f.priority} priority`);
  if (f.status === 'in_progress') bits.push(f.staleDays >= 2 ? `in progress, idle ${f.staleDays}d` : 'already in progress');
  if (f.projectDeadlineDays != null && f.projectDeadlineDays <= 14 && f.projectDeadlineDays >= 0)
    bits.push(`project deadline in ${Math.round(f.projectDeadlineDays)}d`);
  return bits.length ? bits[0].charAt(0).toUpperCase() + bits.join(' · ').slice(1) : 'Highest-ranked open task';
};

const cosine = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s; // embeddings are L2-normalized
};

const median = (nums) => {
  if (!nums.length) return null;
  const sorted = [...nums].sort((x, y) => x - y);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// k-NN effort estimate: for tasks with no estimate of their own, take the
// median estimatedTime of the most similar COMPLETED tasks (by the stored
// MiniLM embeddings — no model call, no training, honest provenance).
const knnEstimate = (taskEmbedding, doneTasks, { k = 3, minSim = 0.45 } = {}) => {
  if (!Array.isArray(taskEmbedding) || !taskEmbedding.length) return null;
  const sims = [];
  for (const d of doneTasks) {
    if (!Array.isArray(d.embedding) || d.embedding.length !== taskEmbedding.length) continue;
    if (typeof d.estimatedTime !== 'number' || d.estimatedTime <= 0) continue;
    const sim = cosine(taskEmbedding, d.embedding);
    if (sim >= minSim) sims.push({ sim, min: d.estimatedTime });
  }
  if (sims.length < 2) return null; // not enough evidence — say nothing
  sims.sort((a, b) => b.sim - a.sim);
  return Math.round(median(sims.slice(0, k).map((s) => s.min)));
};

module.exports = { buildFeatures, baseScore, planCapacity, ruleReason, knnEstimate, PRIORITY_WEIGHT };
