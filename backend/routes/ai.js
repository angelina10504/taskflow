const express = require('express');
const {
  getVelocityInsights,
  commandBoard,
  getProjectHealth,
  scanProjectHealth,
} = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/projects/:projectId/velocity', getVelocityInsights);
router.post('/projects/:projectId/command', commandBoard);
router.get('/projects/:projectId/health', getProjectHealth);
router.post('/projects/:projectId/health/scan', scanProjectHealth);

module.exports = router;
