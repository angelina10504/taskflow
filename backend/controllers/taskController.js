const Task = require('../models/Task');
const Project = require('../models/Project');
const Workspace = require('../models/Workspace');
const { notifyAssignment } = require('../utils/taskNotify');

// Helper function to check workspace membership (and the member's role)
const checkWorkspaceMembership = async (workspaceId, userId) => {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return { isMember: false, workspace: null, role: null };
  }

  const member = workspace.members.find((m) => m.user.toString() === userId);

  return { isMember: !!member, workspace, role: member ? member.role : null };
};

// Owners and admins ("editors") may assign tasks to anyone; members may only
// assign/unassign themselves; viewers are read-only.
const canAssignOthers = (role) => role === 'owner' || role === 'admin';

// Validate a proposed assignee list against the workspace member list.
// Returns { error } or { added } (ids newly assigned vs. the previous list).
const checkAssignees = ({ workspace, role, userId, nextIds, prevIds = [] }) => {
  const next = (Array.isArray(nextIds) ? nextIds : []).map(String);
  const prev = prevIds.map(String);
  const memberIds = new Set(workspace.members.map((m) => m.user.toString()));

  if (next.some((id) => !memberIds.has(id))) {
    return { error: 'Assignees must be members of this workspace' };
  }

  const added = next.filter((id) => !prev.includes(id));
  const removed = prev.filter((id) => !next.includes(id));
  if (!canAssignOthers(role) && [...added, ...removed].some((id) => id !== userId)) {
    return { error: 'Only the workspace owner or admins can assign tasks to other members' };
  }

  return { added, next };
};

// Fire-and-forget email to newly assigned members — never blocks the response.
const notifyAdded = (task, projectId, reqUser, addedIds) => {
  if (!addedIds || !addedIds.length) return;
  Project.findById(projectId)
    .select('name')
    .then((project) =>
      notifyAssignment({
        task,
        project: project || { _id: projectId },
        assignerId: reqUser.id,
        assignerName: reqUser.name || 'A teammate',
        addedIds,
      })
    )
    .catch((err) => console.error('notifyAdded error:', err.message));
};

// @desc    Get all tasks in a project
// @route   GET /api/tasks?project=:projectId
// @access  Private
const getTasks = async (req, res) => {
  try {
    const { project: projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required',
      });
    }

    // Get project to check workspace
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Check if user is a member of the workspace
    const { isMember } = await checkWorkspaceMembership(
      project.workspace,
      req.user.id
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const tasks = await Task.find({ project: projectId })
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar')
      .sort('position');

    res.status(200).json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
const getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar')
      .populate('project')
      .populate('workspace');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if user is a member of the workspace
    const { isMember } = await checkWorkspaceMembership(
      task.workspace._id,
      req.user.id
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.status(200).json({
      success: true,
      task,
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      link,
      project: projectId,
      workspace: workspaceId,
      status,
      priority,
      assignedTo,
      dueDate,
      estimatedTime,
      labels,
    } = req.body;

    if (!title || !projectId || !workspaceId) {
      return res.status(400).json({
        success: false,
        message: 'Title, project, and workspace are required',
      });
    }

    // Check if user is a member of the workspace
    const { isMember, workspace, role } = await checkWorkspaceMembership(workspaceId, req.user.id);

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    if (role === 'viewer') {
      return res.status(403).json({
        success: false,
        message: 'Viewers cannot create tasks',
      });
    }

    const assigneeCheck = checkAssignees({
      workspace,
      role,
      userId: req.user.id,
      nextIds: assignedTo || [],
    });
    if (assigneeCheck.error) {
      return res.status(assigneeCheck.error.startsWith('Assignees') ? 400 : 403).json({
        success: false,
        message: assigneeCheck.error,
      });
    }

    // Get the highest position for the status
    const highestPositionTask = await Task.findOne({
      project: projectId,
      status: status || 'todo',
    }).sort('-position');

    const position = highestPositionTask ? highestPositionTask.position + 1 : 0;

    const task = await Task.create({
      title,
      description,
      link,
      project: projectId,
      workspace: workspaceId,
      status: status || 'todo',
      priority: priority || 'medium',
      assignedTo: assignedTo || [],
      dueDate,
      estimatedTime,
      labels: labels || [],
      position,
      createdBy: req.user.id,
    });

    await task.populate('createdBy', 'name email avatar');
    await task.populate('assignedTo', 'name email avatar');

    notifyAdded(task, projectId, req.user, assigneeCheck.added);

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task,
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if user is a member of the workspace
    const { isMember, workspace, role } = await checkWorkspaceMembership(
      task.workspace,
      req.user.id
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    if (role === 'viewer') {
      return res.status(403).json({
        success: false,
        message: 'Viewers cannot update tasks',
      });
    }

    const {
      title,
      description,
      link,
      status,
      priority,
      assignedTo,
      dueDate,
      estimatedTime,
      labels,
    } = req.body;

    let addedAssignees = [];
    if (assignedTo !== undefined) {
      const assigneeCheck = checkAssignees({
        workspace,
        role,
        userId: req.user.id,
        nextIds: assignedTo,
        prevIds: task.assignedTo.map((id) => id.toString()),
      });
      if (assigneeCheck.error) {
        return res.status(assigneeCheck.error.startsWith('Assignees') ? 400 : 403).json({
          success: false,
          message: assigneeCheck.error,
        });
      }
      task.assignedTo = assigneeCheck.next;
      addedAssignees = assigneeCheck.added;
    }

    task.title = title || task.title;
    task.description = description !== undefined ? description : task.description;
    task.link = link !== undefined ? link : task.link;
    task.status = status || task.status;
    task.priority = priority || task.priority;
    task.dueDate = dueDate !== undefined ? dueDate : task.dueDate;
    task.estimatedTime = estimatedTime !== undefined ? estimatedTime : task.estimatedTime;
    task.labels = labels !== undefined ? labels : task.labels;

    await task.save();
    await task.populate('createdBy', 'name email avatar');
    await task.populate('assignedTo', 'name email avatar');

    notifyAdded(task, task.project, req.user, addedAssignees);

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      task,
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update task status (for drag and drop)
// @route   PATCH /api/tasks/:id/status
// @access  Private
const updateTaskStatus = async (req, res) => {
  try {
    const { status, position } = req.body;

    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if user is a member of the workspace
    const { isMember, role } = await checkWorkspaceMembership(
      task.workspace,
      req.user.id
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    if (role === 'viewer') {
      return res.status(403).json({
        success: false,
        message: 'Viewers cannot move tasks',
      });
    }

    const oldStatus = task.status;
    task.status = status;
    task.position = position;

    await task.save();
    await task.populate('createdBy', 'name email avatar');
    await task.populate('assignedTo', 'name email avatar');

    res.status(200).json({
      success: true,
      message: 'Task status updated successfully',
      task,
    });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Reorder tasks
// @route   PATCH /api/tasks/:id/reorder
// @access  Private
const reorderTasks = async (req, res) => {
  try {
    const { tasks } = req.body; // Array of { id, position, status }

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tasks array is required',
      });
    }

    // Authorize against the first task's workspace, then constrain every
    // update to that same project so unrelated boards can't be touched.
    const anchor = await Task.findById(tasks[0].id);
    if (!anchor) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const { isMember, role } = await checkWorkspaceMembership(anchor.workspace, req.user.id);
    if (!isMember || role === 'viewer') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Update all tasks (scoped to the anchor task's project)
    const updatePromises = tasks.map(({ id, position, status }) =>
      Task.findOneAndUpdate(
        { _id: id, project: anchor.project },
        { position, status },
        { new: true }
      )
    );

    await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: 'Tasks reordered successfully',
    });
  } catch (error) {
    console.error('Reorder tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if user is a member of the workspace
    const { isMember, role } = await checkWorkspaceMembership(
      task.workspace,
      req.user.id
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    if (role === 'viewer') {
      return res.status(403).json({
        success: false,
        message: 'Viewers cannot delete tasks',
      });
    }

    await task.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get all tasks assigned to or created by the current user (cross-workspace)
// @route   GET /api/tasks/mine
// @access  Private
const getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({
      status: { $ne: 'done' },
      $or: [{ assignedTo: req.user.id }, { createdBy: req.user.id }],
    })
      .populate('project', 'name color icon')
      .populate('workspace', 'name')
      .sort({ dueDate: 1, priority: 1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error('Get my tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

module.exports = {
  getTasks,
  getTask,
  createTask,
  updateTask,
  updateTaskStatus,
  reorderTasks,
  deleteTask,
  getMyTasks,
};