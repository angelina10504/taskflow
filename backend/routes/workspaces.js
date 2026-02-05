const express = require('express');
const {
  getWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  leaveWorkspace,
} = require('../controllers/workspaceController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

router.route('/').get(getWorkspaces).post(createWorkspace);

router.route('/:id').get(getWorkspace).put(updateWorkspace).delete(deleteWorkspace);

router.post('/:id/leave', leaveWorkspace);

module.exports = router;