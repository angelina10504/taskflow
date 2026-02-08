const Workspace = require('../models/Workspace');
const User = require('../models/User');

// @desc    Get all workspaces for logged-in user
// @route   GET /api/workspaces
// @access  Private
const getWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      'members.user': req.user.id,
    }).sort('-createdAt');

    // Manually populate to avoid join errors
    for (let workspace of workspaces) {
      await workspace.populate('owner', 'name email avatar');
      await workspace.populate('members.user', 'name email avatar');
    }

    res.status(200).json({
      success: true,
      count: workspaces.length,
      workspaces,
    });
  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get single workspace
// @route   GET /api/workspaces/:id
// @access  Private
const getWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    // Check if user is a member
    const isMember = workspace.members.some(
      (member) => member.user._id.toString() === req.user.id
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.status(200).json({
      success: true,
      workspace,
    });
  } catch (error) {
    console.error('Get workspace error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Create new workspace
// @route   POST /api/workspaces
// @access  Private
const createWorkspace = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Workspace name is required',
      });
    }

    const workspace = await Workspace.create({
      name,
      description,
      owner: req.user.id,
    });

    // Populate the workspace before sending
    await workspace.populate('owner', 'name email avatar');
    await workspace.populate('members.user', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Workspace created successfully',
      workspace,
    });
  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update workspace
// @route   PUT /api/workspaces/:id
// @access  Private
const updateWorkspace = async (req, res) => {
  try {
    const { name, description } = req.body;

    let workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    // Check if user is owner or admin
    const member = workspace.members.find(
      (m) => m.user.toString() === req.user.id
    );

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this workspace',
      });
    }

    workspace.name = name || workspace.name;
    workspace.description = description || workspace.description;

    await workspace.save();

    await workspace.populate('owner', 'name email avatar');
    await workspace.populate('members.user', 'name email avatar');

    res.status(200).json({
      success: true,
      message: 'Workspace updated successfully',
      workspace,
    });
  } catch (error) {
    console.error('Update workspace error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Delete workspace
// @route   DELETE /api/workspaces/:id
// @access  Private
const deleteWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    // Only owner can delete workspace
    if (workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only workspace owner can delete the workspace',
      });
    }

    await workspace.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Workspace deleted successfully',
    });
  } catch (error) {
    console.error('Delete workspace error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Leave workspace
// @route   POST /api/workspaces/:id/leave
// @access  Private
const leaveWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    // Check if user is owner
    if (workspace.owner.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Owner cannot leave workspace. Please transfer ownership or delete the workspace.',
      });
    }

    // Remove user from members
    workspace.members = workspace.members.filter(
      (member) => member.user.toString() !== req.user.id
    );

    await workspace.save();

    res.status(200).json({
      success: true,
      message: 'You have left the workspace',
    });
  } catch (error) {
    console.error('Leave workspace error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

module.exports = {
  getWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  leaveWorkspace,
};