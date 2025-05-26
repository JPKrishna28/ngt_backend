const express = require('express');
const router = express.Router();
const { 
  login, 
  register, 
  registerSuperAdmin 
} = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public routes
router.post('/login', login);

// TEMPORARY: Public registration routes (remove in production)
router.post('/public-register', register);
router.post('/register-super-admin', registerSuperAdmin);

// Protected routes
router.post('/register', protect, admin, register); // Admin only registration

module.exports = router;