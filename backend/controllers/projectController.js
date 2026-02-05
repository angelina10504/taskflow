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

// @desc    Get all projects in a workspace
// @route   GET /api/projects?workspace=:workspaceId
// @access  Private
const getProjects = async (req, res) => {
  try {
    const { workspace: workspaceId } = req.query;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: 'Workspace ID is required',
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

    const projects = await Project.find({ workspace: workspaceId })
      .populate('createdBy', 'name email avatar')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name email avatar')
      .populate('workspace');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Check if user is a member of the workspace
    const { isMember } = await checkWorkspaceMembership(
      project.workspace._id,
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
      project,
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
const createProject = async (req, res) => {
  try {
    const { name, description, workspace: workspaceId, color, icon, deadline } = req.body;

    if (!name || !workspaceId) {
      return res.status(400).json({
        success: false,
        message: 'Project name and workspace are required',
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

    const project = await Project.create({
      name,
      description,
      workspace: workspaceId,
      color: color || '#6366f1',
      icon: icon || '📊',
      deadline,
      createdBy: req.user.id,
    });

    await project.populate('createdBy', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project,
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
const updateProject = async (req, res) => {
  try {
    let project = await Project.findById(req.params.id);

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

    const { name, description, color, icon, deadline, status } = req.body;

    project.name = name || project.name;
    project.description = description !== undefined ? description : project.description;
    project.color = color || project.color;
    project.icon = icon || project.icon;
    project.deadline = deadline !== undefined ? deadline : project.deadline;
    project.status = status || project.status;

    await project.save();
    await project.populate('createdBy', 'name email avatar');

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      project,
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Check if user is a member of the workspace
    const { isMember, workspace } = await checkWorkspaceMembership(
      project.workspace,
      req.user.id
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Check if user is owner or admin
    const member = workspace.members.find(
      (m) => m.user.toString() === req.user.id
    );

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Only workspace owner or admin can delete projects',
      });
    }

    await project.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Archive/Unarchive project
// @route   PATCH /api/projects/:id/archive
// @access  Private
const toggleArchiveProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

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

    project.status = project.status === 'active' ? 'archived' : 'active';
    await project.save();
    await project.populate('createdBy', 'name email avatar');

    res.status(200).json({
      success: true,
      message: `Project ${project.status === 'archived' ? 'archived' : 'unarchived'} successfully`,
      project,
    });
  } catch (error) {
    console.error('Toggle archive project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

module.exports = {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  toggleArchiveProject,
};