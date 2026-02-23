const express = require('express');
const {
  register,
  login,
  getMe,
  refreshToken,
  googleAuth,
  updateMe,
  uploadAvatar,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/refresh-token', refreshToken);

// Private routes (require authentication)
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.post('/me/avatar', protect, upload.single('avatar'), uploadAvatar);

module.exports = router;
