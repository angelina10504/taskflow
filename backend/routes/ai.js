const express = require('express');
const {
  getVelocityInsights,
  commandBoard,
  getProjectHealth,
  scanProjectHealth,
  quickAddTask,
  extractTasksFromNotes,
  decomposeProject,
  bulkCreateTasks,
} = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/projects/:projectId/velocity', getVelocityInsights);
router.post('/projects/:projectId/command', commandBoard);
router.get('/projects/:projectId/health', getProjectHealth);
router.post('/projects/:projectId/health/scan', scanProjectHealth);
router.post('/projects/:projectId/quick-add', quickAddTask);
router.post('/projects/:projectId/extract-tasks', extractTasksFromNotes);
router.post('/projects/:projectId/decompose', decomposeProject);
router.post('/projects/:projectId/bulk-create', bulkCreateTasks);

module.exports = router;
