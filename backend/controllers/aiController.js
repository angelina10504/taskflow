const Task = require('../models/Task');
const Project = require('../models/Project');
const Workspace = require('../models/Workspace');
const HealthReport = require('../models/HealthReport');
const { computeVelocityStats } = require('../utils/velocityStats');
const { getClient, MODEL } = require('../utils/aiClient');
const { scanProject } = require('../utils/riskRadar');

const checkWorkspaceMembership = async (workspaceId, userId) => {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return { isMember: false, workspace: null };
  const isMember = workspace.members.some((m) => m.user.toString() === userId);
  return { isMember, workspace };
};

const SYSTEM_PROMPT = `You are the velocity analyst for TaskFlow, a project management app.
You are given pre-computed, deterministic metrics for a single project's task board.
Your job is to interpret those numbers for a busy project lead — NOT to recompute them.

Rules:
- Trust the numbers provided. Never invent metrics that are not in the input.
- Be specific and quantitative: cite the actual figures (days, counts, percentages, names).
- Do NOT claim estimate accuracy or estimate-vs-actual: active work time is not logged. Use the "estimates" block only for coverage (how many tasks are estimated) and remaining planned effort. Use "cycleTime" for delivery speed.
- If a sample size is small (e.g. < 4) or a value is null, acknowledge low confidence instead of overclaiming.
- Recommendations must be concrete and actionable for this board (reassign, split, set estimates, chase a stale task), not generic advice.

Respond with ONLY a JSON object (no markdown, no prose outside the JSON) of this exact shape:
{
  "riskLevel": "on_track" | "at_risk" | "off_track",
  "headline": "one short sentence verdict",
  "summary": "2-3 sentence narrative of where the project stands",
  "insights": ["3-5 specific data-grounded observations"],
  "recommendations": ["2-4 concrete next actions"]
}`;

const buildFallback = (stats) => {
  const dp = stats.deadlineProjection;
  let riskLevel = 'on_track';
  if (stats.overdue.length > 0 || stats.staleInProgress.length > 0) riskLevel = 'at_risk';
  if (dp.willMiss) riskLevel = 'off_track';

  const insights = [];
  insights.push(
    `${stats.totals.done}/${stats.totals.total} tasks done; ${stats.throughput.weeklyAvg} completed per week on average.`
  );
  if (stats.cycleTime.avgDays != null)
    insights.push(`Average cycle time is ${stats.cycleTime.avgDays} days (n=${stats.cycleTime.sampleSize}).`);
  if (stats.overdue.length)
    insights.push(`${stats.overdue.length} open task(s) overdue, worst by ${stats.overdue[0].daysOverdue} days.`);
  if (stats.staleInProgress.length)
    insights.push(`${stats.staleInProgress.length} in-progress task(s) untouched for 5+ days.`);
  if (dp.projectedDate)
    insights.push(
      `At current pace the backlog clears in ~${dp.projectedWeeks} weeks (around ${new Date(dp.projectedDate).toLocaleDateString()}).`
    );

  const recommendations = [];
  if (stats.overdue.length) recommendations.push('Triage overdue tasks — reschedule or reassign the oldest first.');
  if (stats.staleInProgress.length) recommendations.push('Follow up on stale in-progress tasks or move them back to todo.');
  if (stats.estimates.coveragePct < 50)
    recommendations.push('Add time estimates to more tasks to improve forecasting.');
  if (!recommendations.length) recommendations.push('Keep current pace; no immediate risks detected.');

  return {
    riskLevel,
    headline: dp.willMiss
      ? 'Projected to miss the deadline at the current pace.'
      : 'Project is progressing; review the highlighted items.',
    summary: `This is a computed summary (AI narrative unavailable). ${stats.totals.open} task(s) remain open with a weekly throughput of ${stats.throughput.weeklyAvg}.`,
    insights,
    recommendations,
  };
};

// @desc    Velocity & estimate intelligence for a project
// @route   GET /api/ai/projects/:projectId/velocity
// @access  Private
const getVelocityInsights = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const { isMember } = await checkWorkspaceMembership(project.workspace, req.user.id);
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const tasks = await Task.find({ project: projectId }).populate('assignedTo', 'name email');

    const stats = computeVelocityStats(tasks, project);

    if (tasks.length === 0) {
      return res.status(200).json({
        success: true,
        aiAvailable: false,
        stats,
        insights: {
          riskLevel: 'on_track',
          headline: 'No tasks yet — nothing to analyze.',
          summary: 'Add tasks to this project to unlock velocity insights.',
          insights: [],
          recommendations: ['Create tasks with estimates and due dates to enable forecasting.'],
        },
      });
    }

    const ai = getClient();
    if (!ai) {
      return res.status(200).json({
        success: true,
        aiAvailable: false,
        stats,
        insights: buildFallback(stats),
      });
    }

    const completion = await ai.chat.completions.create({
      model: MODEL,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Here are the computed metrics for project "${stats.project.name}". Interpret them per your instructions and return the JSON object.\n\n${JSON.stringify(
            stats,
            null,
            2
          )}`,
        },
      ],
    });

    const text = completion.choices?.[0]?.message?.content || '';
    let insights;
    try {
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      insights = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    } catch (parseErr) {
      console.error('AI insights parse error:', parseErr, 'raw:', text);
      insights = buildFallback(stats);
    }

    res.status(200).json({ success: true, aiAvailable: true, stats, insights });
  } catch (error) {
    console.error('Velocity insights error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ---------------------------------------------------------------------------
// Agentic "Command the Board"
// ---------------------------------------------------------------------------

const STATUS_ENUM = ['todo', 'in_progress', 'in_review', 'done'];
const PRIORITY_ENUM = ['low', 'medium', 'high', 'urgent'];
const MAX_ITERATIONS = 8;

const serializeTask = (t) => ({
  id: t._id.toString(),
  title: t.title,
  status: t.status,
  priority: t.priority,
  assignees: (t.assignedTo || []).map((u) =>
    typeof u === 'object' && u !== null ? { id: u._id.toString(), name: u.name } : { id: String(u) }
  ),
  dueDate: t.dueDate || null,
});

const COMMAND_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'update_task',
      description:
        'Update fields on an existing task. Only include the fields you want to change; omit the rest.',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'The id of the task to update' },
          status: { type: 'string', enum: STATUS_ENUM },
          priority: { type: 'string', enum: PRIORITY_ENUM },
          assignee_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Replaces the assignee list with these user ids. Pass [] to unassign everyone.',
          },
          due_date: { type: 'string', description: 'ISO date string, or "" to clear the due date.' },
          title: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['task_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Create a new task in this project.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          status: { type: 'string', enum: STATUS_ENUM },
          priority: { type: 'string', enum: PRIORITY_ENUM },
          assignee_ids: { type: 'array', items: { type: 'string' } },
          due_date: { type: 'string', description: 'ISO date string' },
          description: { type: 'string' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_task',
      description:
        'Permanently delete a task. Only use this when the user explicitly asks to delete or remove a task.',
      parameters: {
        type: 'object',
        properties: { task_id: { type: 'string' } },
        required: ['task_id'],
      },
    },
  },
];

// Execute a single tool call against the DB, scoped to this project.
const executeCommandTool = async (name, input, ctx) => {
  const { projectId, workspaceId, userId, memberIds, actions } = ctx;

  const validateAssignees = (ids) => {
    if (!Array.isArray(ids)) return [];
    return ids.filter((id) => memberIds.has(String(id)));
  };

  if (name === 'create_task') {
    if (!input.title) return { error: 'title is required' };
    const highest = await Task.findOne({ project: projectId, status: input.status || 'todo' }).sort('-position');
    const task = await Task.create({
      title: input.title,
      description: input.description,
      project: projectId,
      workspace: workspaceId,
      status: STATUS_ENUM.includes(input.status) ? input.status : 'todo',
      priority: PRIORITY_ENUM.includes(input.priority) ? input.priority : 'medium',
      assignedTo: validateAssignees(input.assignee_ids),
      dueDate: input.due_date ? new Date(input.due_date) : undefined,
      position: highest ? highest.position + 1 : 0,
      createdBy: userId,
    });
    actions.push(`Created task "${task.title}" in ${task.status}`);
    return { ok: true, task: serializeTask(task) };
  }

  const task = await Task.findById(input.task_id);
  if (!task || task.project.toString() !== projectId.toString()) {
    return { error: 'Task not found in this project' };
  }

  if (name === 'delete_task') {
    const title = task.title;
    await task.deleteOne();
    actions.push(`Deleted task "${title}"`);
    return { ok: true, deleted_id: input.task_id };
  }

  if (name === 'update_task') {
    const changes = [];
    if (input.status && STATUS_ENUM.includes(input.status) && input.status !== task.status) {
      task.status = input.status;
      task.position = 0;
      changes.push(`status→${input.status}`);
    }
    if (input.priority && PRIORITY_ENUM.includes(input.priority) && input.priority !== task.priority) {
      task.priority = input.priority;
      changes.push(`priority→${input.priority}`);
    }
    if (Array.isArray(input.assignee_ids)) {
      task.assignedTo = validateAssignees(input.assignee_ids);
      changes.push('reassigned');
    }
    if (input.due_date !== undefined) {
      task.dueDate = input.due_date ? new Date(input.due_date) : undefined;
      changes.push(input.due_date ? 'due date set' : 'due date cleared');
    }
    if (typeof input.title === 'string' && input.title.trim()) {
      task.title = input.title.trim();
      changes.push('renamed');
    }
    if (typeof input.description === 'string') task.description = input.description;

    await task.save();
    if (changes.length) actions.push(`Updated "${task.title}" (${changes.join(', ')})`);
    return { ok: true, task: serializeTask(task) };
  }

  return { error: `Unknown tool: ${name}` };
};

const COMMAND_SYSTEM = `You are the board operator for TaskFlow, a Kanban project management app.
You translate a project lead's natural-language request into concrete board changes using the provided tools.

Guidelines:
- Use the current board snapshot and member list supplied in the user message to resolve references like "me", a person's name, "urgent tasks", or "everything in review".
- Only act on tasks that exist in the snapshot. Reference tasks by their id.
- Make all the changes the request implies, calling tools as many times as needed (one tool call per task).
- If the request is ambiguous, make the most reasonable interpretation and state the assumption in your final reply rather than refusing.
- Only delete tasks when the user explicitly asks to delete or remove them.
- After acting, reply in 1-3 short sentences summarizing exactly what you changed, in plain language. If nothing needed changing, say so.`;

// @desc    Execute a natural-language command against a project's board
// @route   POST /api/ai/projects/:projectId/command
// @access  Private
const commandBoard = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'A command message is required' });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const { isMember, workspace } = await checkWorkspaceMembership(project.workspace, req.user.id);
    if (!isMember) return res.status(403).json({ success: false, message: 'Access denied' });

    const refreshTasks = () =>
      Task.find({ project: projectId }).populate('assignedTo', 'name email').sort('position');

    const tasks = await refreshTasks();

    const ai = getClient();
    if (!ai) {
      return res.status(200).json({
        success: true,
        aiAvailable: false,
        reply: 'Command mode needs an AI API key. Set AI_API_KEY (Gemini) in the backend .env to enable it.',
        actions: [],
        tasks,
      });
    }

    // Resolve members for assignment + give the model a name→id map.
    const members = await Workspace.findById(workspace._id)
      .populate('members.user', 'name email')
      .then((ws) => (ws?.members || []).map((m) => m.user).filter(Boolean));
    const memberIds = new Set(members.map((u) => u._id.toString()));
    memberIds.add(req.user.id.toString());

    const context = {
      current_user: { id: req.user.id.toString(), name: req.user.name },
      members: members.map((u) => ({ id: u._id.toString(), name: u.name, email: u.email })),
      tasks: tasks.map(serializeTask),
    };

    const actions = [];
    const ctx = { projectId, workspaceId: workspace._id, userId: req.user.id, memberIds, actions };

    const messages = [
      { role: 'system', content: COMMAND_SYSTEM },
      {
        role: 'user',
        content: `Command: ${message}\n\nBoard context (JSON):\n${JSON.stringify(context, null, 2)}`,
      },
    ];

    let reply = '';
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const completion = await ai.chat.completions.create({
        model: MODEL,
        max_tokens: 1024,
        tools: COMMAND_TOOLS,
        messages,
      });

      const msg = completion.choices?.[0]?.message;
      if (!msg) break;
      messages.push(msg);

      const toolCalls = msg.tool_calls || [];
      if (toolCalls.length === 0) {
        reply = (msg.content || '').trim();
        break;
      }

      for (const call of toolCalls) {
        let args = {};
        try {
          args = JSON.parse(call.function?.arguments || '{}');
        } catch (e) {
          args = {};
        }
        let result;
        try {
          result = await executeCommandTool(call.function?.name, args, ctx);
        } catch (err) {
          result = { error: err.message };
        }
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    const updatedTasks = await refreshTasks();

    res.status(200).json({
      success: true,
      aiAvailable: true,
      reply: reply || 'Done.',
      actions,
      tasks: updatedTasks,
    });
  } catch (error) {
    console.error('Command board error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ---------------------------------------------------------------------------
// Risk Radar (proactive project health)
// ---------------------------------------------------------------------------

// @desc    Latest health report for a project (null if never scanned)
// @route   GET /api/ai/projects/:projectId/health
// @access  Private
const getProjectHealth = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const { isMember } = await checkWorkspaceMembership(project.workspace, req.user.id);
    if (!isMember) return res.status(403).json({ success: false, message: 'Access denied' });

    const report = await HealthReport.findOne({ project: projectId }).sort('-createdAt');

    res.status(200).json({ success: true, report });
  } catch (error) {
    console.error('Get project health error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Run a health scan now (also broadcasts to the project's socket room)
// @route   POST /api/ai/projects/:projectId/health/scan
// @access  Private
const scanProjectHealth = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const { isMember } = await checkWorkspaceMembership(project.workspace, req.user.id);
    if (!isMember) return res.status(403).json({ success: false, message: 'Access denied' });

    const report = await scanProject(projectId, req.app.get('io'), 'manual');

    res.status(200).json({ success: true, report });
  } catch (error) {
    console.error('Scan project health error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = { getVelocityInsights, commandBoard, getProjectHealth, scanProjectHealth };
