const express = require('express');
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  toggleArchiveProject,
  getMyProjects,
} = require('../controllers/projectController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

router.route('/').get(getProjects).post(createProject);
router.get('/mine', getMyProjects);

router.route('/:id').get(getProject).put(updateProject).delete(deleteProject);

router.patch('/:id/archive', toggleArchiveProject);

module.exports = router;