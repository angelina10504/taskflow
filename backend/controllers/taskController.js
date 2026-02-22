const Task = require('../models/Task');
const Project = require('../models/Project');
const Workspace = require('../models/Workspace');

// Helper function to check workspace membership
const checkWorkspaceMembership = async (workspaceId, userId) => {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return { isMember: false, workspace: null };
  }

  const isMember = workspace.members.some(
    (member) => member.user.toString() === userId
  );

  return { isMember, workspace };
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
    const { isMember } = await checkWorkspaceMembership(workspaceId, req.user.id);

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
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
    const { isMember } = await checkWorkspaceMembership(
      task.workspace,
      req.user.id
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const {
      title,
      description,
      status,
      priority,
      assignedTo,
      dueDate,
      estimatedTime,
      labels,
    } = req.body;

    task.title = title || task.title;
    task.description = description !== undefined ? description : task.description;
    task.status = status || task.status;
    task.priority = priority || task.priority;
    task.assignedTo = assignedTo !== undefined ? assignedTo : task.assignedTo;
    task.dueDate = dueDate !== undefined ? dueDate : task.dueDate;
    task.estimatedTime = estimatedTime !== undefined ? estimatedTime : task.estimatedTime;
    task.labels = labels !== undefined ? labels : task.labels;

    await task.save();
    await task.populate('createdBy', 'name email avatar');
    await task.populate('assignedTo', 'name email avatar');

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
    const { isMember } = await checkWorkspaceMembership(
      task.workspace,
      req.user.id
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
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

    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({
        success: false,
        message: 'Tasks array is required',
      });
    }

    // Update all tasks
    const updatePromises = tasks.map(({ id, position, status }) =>
      Task.findByIdAndUpdate(
        id,
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
    const { isMember } = await checkWorkspaceMembership(
      task.workspace,
      req.user.id
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
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