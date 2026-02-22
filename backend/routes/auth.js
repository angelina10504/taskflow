const express = require('express');
const {
  register,
  login,
  getMe,
  refreshToken,
  googleAuth,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/refresh-token', refreshToken);

// Private routes (require authentication)
router.get('/me', protect, getMe);

module.exports = router;