const express = require('express');
const {
  getWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  leaveWorkspace,
  inviteMember,
  removeMember,
  getInvitation,
  acceptInvitation,
} = require('../controllers/workspaceController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Invitation preview is PUBLIC and must be declared before router.use(protect):
// the recipient has not signed in yet, and the page needs to show what they are
// being invited to before asking them to register. The 32-byte token is the
// credential, and the response is deliberately minimal (see the controller).
router.get('/invitations/:token', getInvitation);

// Everything below requires a session.
router.use(protect);

// Redeeming requires an authenticated account whose email matches the
// invitation — the token alone is not sufficient, or a forwarded link would let
// anyone join. Declared before '/:id' so "invitations" is never captured as an
// :id parameter.
router.post('/invitations/:token/accept', acceptInvitation);

router.route('/').get(getWorkspaces).post(createWorkspace);

router.route('/:id').get(getWorkspace).put(updateWorkspace).delete(deleteWorkspace);

router.post('/:id/leave', leaveWorkspace);
router.post('/:id/invite', inviteMember);                    // ADD THIS
router.delete('/:id/members/:userId', removeMember);   

module.exports = router;