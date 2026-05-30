const express = require('express');
const { getVelocityInsights, commandBoard } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/projects/:projectId/velocity', getVelocityInsights);
router.post('/projects/:projectId/command', commandBoard);

module.exports = router;
