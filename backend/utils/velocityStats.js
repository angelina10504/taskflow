const MS_PER_DAY = 1000 * 60 * 60 * 24;

const round = (n, d = 1) => {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
};

const median = (nums) => {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const userLabel = (u) => {
  if (!u) return 'Unassigned';
  if (typeof u === 'object') return u.name || u.email || 'Unknown';
  return String(u);
};

/**
 * Compute deterministic velocity & estimate metrics for a project's tasks.
 * No AI here — these are the hard numbers. The LLM only interprets the output.
 *
 * @param {Array} tasks    Mongoose task docs (assignedTo may be populated).
 * @param {Object} project Mongoose project doc (for name + deadline).
 * @param {Date}   now     Reference time (injectable for tests).
 */
const computeVelocityStats = (tasks, project, now = new Date()) => {
  const nowMs = now.getTime();
  const done = tasks.filter((t) => t.status === 'done');
  const open = tasks.filter((t) => t.status !== 'done');

  // --- Status / priority breakdowns ---
  const byStatus = {};
  const byPriority = {};
  for (const t of tasks) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
  }

  // --- Throughput (completions in trailing windows) ---
  const completedSince = (days) =>
    done.filter(
      (t) => t.completedAt && nowMs - new Date(t.completedAt).getTime() <= days * MS_PER_DAY
    ).length;

  const completedLast7d = completedSince(7);
  const completedLast14d = completedSince(14);
  const completedLast30d = completedSince(30);

  // Weekly average derived from the last 30d window (falls back to all-time done).
  let weeklyAvg;
  if (completedLast30d > 0) {
    weeklyAvg = round((completedLast30d / 30) * 7, 2);
  } else if (done.length > 0) {
    const firstCreated = Math.min(...tasks.map((t) => new Date(t.createdAt).getTime()));
    const spanWeeks = Math.max((nowMs - firstCreated) / (MS_PER_DAY * 7), 1);
    weeklyAvg = round(done.length / spanWeeks, 2);
  } else {
    weeklyAvg = 0;
  }

  // --- Cycle time (createdAt -> completedAt) for completed tasks ---
  const cycleDays = done
    .filter((t) => t.completedAt && t.createdAt)
    .map((t) => (new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()) / MS_PER_DAY)
    .filter((d) => d >= 0);

  const cycleTime = {
    sampleSize: cycleDays.length,
    avgDays: cycleDays.length ? round(cycleDays.reduce((a, b) => a + b, 0) / cycleDays.length) : null,
    medianDays: cycleDays.length ? round(median(cycleDays)) : null,
  };

  // --- Estimates ---
  // estimatedTime is planned EFFORT (minutes). TaskFlow does not log active work
  // time, so true estimate-vs-actual accuracy is not computable. We only report
  // coverage and remaining planned effort, which are honest planning signals.
  const allWithEstimate = tasks.filter((t) => typeof t.estimatedTime === 'number' && t.estimatedTime > 0);
  const openEstimatedMin = open.reduce(
    (sum, t) => sum + (typeof t.estimatedTime === 'number' ? t.estimatedTime : 0),
    0
  );
  const estimates = {
    coveragePct: round((allWithEstimate.length / (tasks.length || 1)) * 100, 0),
    withEstimateCount: allWithEstimate.length,
    avgEstimateMin: allWithEstimate.length
      ? round(allWithEstimate.reduce((a, t) => a + t.estimatedTime, 0) / allWithEstimate.length, 0)
      : null,
    openEstimatedHrs: round(openEstimatedMin / 60, 1),
    note: 'Active work time is not logged, so estimate-vs-actual accuracy is not computed; cycle time below is the wall-clock delivery speed.',
  };

  // --- Overdue open tasks ---
  const overdue = open
    .filter((t) => t.dueDate && new Date(t.dueDate).getTime() < nowMs)
    .map((t) => ({
      title: t.title,
      priority: t.priority,
      dueDate: t.dueDate,
      daysOverdue: round((nowMs - new Date(t.dueDate).getTime()) / MS_PER_DAY, 0),
      assignees: (t.assignedTo || []).map(userLabel),
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  // --- Stale in-progress (no update in 5+ days) ---
  const STALE_DAYS = 5;
  const staleInProgress = open
    .filter(
      (t) =>
        t.status === 'in_progress' &&
        t.updatedAt &&
        nowMs - new Date(t.updatedAt).getTime() > STALE_DAYS * MS_PER_DAY
    )
    .map((t) => ({
      title: t.title,
      daysSinceUpdate: round((nowMs - new Date(t.updatedAt).getTime()) / MS_PER_DAY, 0),
      assignees: (t.assignedTo || []).map(userLabel),
    }))
    .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);

  // --- Per-assignee workload (open tasks only) ---
  const workloadMap = new Map();
  const bump = (key, patch) => {
    const cur = workloadMap.get(key) || { user: key, openCount: 0, overdueCount: 0, estimatedOpenMin: 0 };
    workloadMap.set(key, {
      ...cur,
      openCount: cur.openCount + (patch.openCount || 0),
      overdueCount: cur.overdueCount + (patch.overdueCount || 0),
      estimatedOpenMin: cur.estimatedOpenMin + (patch.estimatedOpenMin || 0),
    });
  };
  for (const t of open) {
    const assignees = (t.assignedTo || []).map(userLabel);
    const keys = assignees.length ? assignees : ['Unassigned'];
    const isOverdue = t.dueDate && new Date(t.dueDate).getTime() < nowMs;
    for (const k of keys) {
      bump(k, {
        openCount: 1,
        overdueCount: isOverdue ? 1 : 0,
        estimatedOpenMin: typeof t.estimatedTime === 'number' ? t.estimatedTime : 0,
      });
    }
  }
  const workload = [...workloadMap.values()].sort((a, b) => b.openCount - a.openCount);

  // --- Deadline projection ---
  const openCount = open.length;
  let deadlineProjection = {
    openCount,
    weeklyAvg,
    projectedWeeks: null,
    projectedDate: null,
    deadline: project?.deadline || null,
    willMiss: null,
    slackDays: null,
  };
  if (openCount > 0 && weeklyAvg > 0) {
    const projectedWeeks = round(openCount / weeklyAvg, 1);
    const projectedDate = new Date(nowMs + projectedWeeks * 7 * MS_PER_DAY);
    deadlineProjection.projectedWeeks = projectedWeeks;
    deadlineProjection.projectedDate = projectedDate;
    if (project?.deadline) {
      const deadlineMs = new Date(project.deadline).getTime();
      deadlineProjection.willMiss = projectedDate.getTime() > deadlineMs;
      deadlineProjection.slackDays = round((deadlineMs - projectedDate.getTime()) / MS_PER_DAY, 0);
    }
  } else if (openCount > 0 && weeklyAvg === 0) {
    // Open work but no recorded completions to project from.
    deadlineProjection.willMiss = project?.deadline ? true : null;
  }

  return {
    project: { name: project?.name || 'Project', deadline: project?.deadline || null },
    generatedAt: now.toISOString(),
    totals: {
      total: tasks.length,
      done: done.length,
      open: openCount,
      byStatus,
      byPriority,
    },
    throughput: { completedLast7d, completedLast14d, completedLast30d, weeklyAvg },
    cycleTime,
    estimates,
    overdue,
    staleInProgress,
    workload,
    deadlineProjection,
  };
};

module.exports = { computeVelocityStats };
