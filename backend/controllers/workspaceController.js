const Workspace = require('../models/Workspace');
const User = require('../models/User');
const { isValidEmail, normalizeEmail } = require('../utils/validateEmail');
const { sendMail, isMailConfigured } = require('../utils/mailer');

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

const inviteMember = async (req, res) => {
  try {
    const { role } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    // Check if requester is owner or admin
    const member = workspace.members.find(
      (m) => m.user.toString() === req.user.id
    );

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Only workspace owner or admin can invite members',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      // Check if already a member
      const isMember = workspace.members.some(
        (m) => m.user.toString() === existingUser._id.toString()
      );

      if (isMember) {
        return res.status(400).json({
          success: false,
          message: 'User is already a member of this workspace',
        });
      }

      // Add user directly to workspace
      workspace.members.push({
        user: existingUser._id,
        role: role || 'member',
        joinedAt: new Date(),
      });

      await workspace.save();
      await workspace.populate('members.user', 'name email avatar');

      return res.status(200).json({
        success: true,
        message: `${existingUser.name} has been added to the workspace`,
        workspace,
      });
    } else {
      // User doesn't exist - create invitation
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');

      workspace.invitations.push({
        email,
        role: role || 'member',
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        invitedBy: req.user.id,
      });

      await workspace.save();

      const invitationLink = `${process.env.CLIENT_URL}/invite/${token}`;
      const inviterName = req.user.name || 'A teammate';

      // Fire-and-forget invitation email (no-op when SMTP isn't configured —
      // the link is still returned so it can be shared manually).
      sendMail({
        to: email,
        subject: `${inviterName} invited you to "${workspace.name}" on TaskFlow`,
        text: `${inviterName} invited you to join the workspace "${workspace.name}" on TaskFlow.\n\nAccept the invitation (link expires in 7 days):\n${invitationLink}`,
        html: `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto">
  <div style="background:linear-gradient(90deg,#6366f1,#a855f7);border-radius:10px 10px 0 0;padding:14px 20px;color:#ffffff;font-weight:bold;font-size:16px">TaskFlow</div>
  <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;padding:20px;color:#1f2937">
    <p style="margin:0 0 16px"><strong>${inviterName.replace(/</g, '&lt;')}</strong> invited you to join the workspace <strong>${workspace.name.replace(/</g, '&lt;')}</strong>.</p>
    <a href="${invitationLink}" style="display:inline-block;background:linear-gradient(90deg,#6366f1,#a855f7);color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">Accept Invitation</a>
    <p style="font-size:12px;color:#9ca3af;margin:16px 0 0">This link expires in 7 days. If you weren't expecting this, you can ignore it.</p>
  </div>
</div>`,
      });

      res.status(200).json({
        success: true,
        message: isMailConfigured()
          ? `Invitation emailed to ${email}`
          : `Invitation created for ${email} — share the link below (email isn't configured)`,
        invitationLink,
      });
    }
  } catch (error) {
    console.error('Invite member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

const removeMember = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    // Check if requester is owner or admin
    const requester = workspace.members.find(
      (m) => m.user.toString() === req.user.id
    );

    if (!requester || (requester.role !== 'owner' && requester.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Only workspace owner or admin can remove members',
      });
    }

    // Can't remove the owner
    const targetMember = workspace.members.find(
      (m) => m.user.toString() === req.params.userId
    );

    if (targetMember && targetMember.role === 'owner') {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove workspace owner',
      });
    }

    // Remove member
    workspace.members = workspace.members.filter(
      (m) => m.user.toString() !== req.params.userId
    );

    await workspace.save();

    res.status(200).json({
      success: true,
      message: 'Member removed from workspace',
    });
  } catch (error) {
    console.error('Remove member error:', error);
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
  inviteMember,     
  removeMember,  
};