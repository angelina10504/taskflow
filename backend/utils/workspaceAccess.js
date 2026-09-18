const Workspace = require('../models/Workspace');

// Canonical membership resolution.
//
// This logic is currently duplicated in taskController, projectController and
// aiController. CLAUDE.md flags that duplication as a latent vulnerability:
// change the semantics in one place and the others silently keep the old rule.
// The socket layer is the first consumer to take it from here instead of adding
// a fourth copy; the three controllers should be migrated onto this module too.
//
// Returns the workspace and the caller's role so the caller can apply RBAC
// after establishing membership — never instead of it.
const checkWorkspaceMembership = async (workspaceId, userId) => {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return { isMember: false, workspace: null, role: null };
  const member = workspace.members.find((m) => m.user.toString() === String(userId));
  return { isMember: !!member, workspace, role: member ? member.role : null };
};

module.exports = { checkWorkspaceMembership };
