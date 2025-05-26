const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// Generate JWT
const generateToken = (employeeId) => {
  return jwt.sign({ employeeId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new employee (Admin only)
// @route   POST /api/auth/register
// @access  Admin
router.post('/register', protect, admin, async (req, res) => {
  try {
    const { employeeId, name, password, role } = req.body;

    // Check if employee already exists
    const employeeExists = await User.findOne({ employeeId });
    if (employeeExists) {
      return res.status(400).json({ message: 'Employee already exists' });
    }

    // Create new employee
    const employee = await User.create({
      employeeId,
      name,
      password,
      role,
    });

    if (employee) {
      res.status(201).json({
        _id: employee._id,
        employeeId: employee.employeeId,
        name: employee.name,
        role: employee.role,
      });
    } else {
      res.status(400).json({ message: 'Invalid employee data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Register a superadmin user (TEMPORARY - remove in production)
// @route   POST /api/auth/register-super-admin
// @access  Public (temporarily)
router.post('/register-super-admin', async (req, res) => {
  try {
    const { employeeId, name, password } = req.body;
    
    console.log('Superadmin registration attempt:', {
      employeeId,
      name,
      timestamp: new Date().toISOString()
    });
    
    // Check if employee already exists
    const employeeExists = await User.findOne({ employeeId });
    if (employeeExists) {
      return res.status(400).json({ message: 'Employee already exists' });
    }

    // Validate password strength for superadmin
    if (password.length < 8) {
      return res.status(400).json({ 
        message: 'Superadmin password must be at least 8 characters long' 
      });
    }
    
    // Create superadmin user
    const superadmin = await User.create({
      employeeId,
      name,
      password,
      role: 'superadmin' // Always set to superadmin
    });

    if (superadmin) {
      console.log('SUPERADMIN CREATED SUCCESSFULLY:', {
        employeeId: superadmin.employeeId,
        name: superadmin.name,
        timestamp: new Date().toISOString()
      });
      
      res.status(201).json({
        _id: superadmin._id,
        employeeId: superadmin.employeeId,
        name: superadmin.name,
        role: superadmin.role,
        message: 'Superadmin created successfully'
      });
    } else {
      res.status(400).json({ message: 'Invalid superadmin data' });
    }
  } catch (error) {
    console.error('Superadmin creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Login employee
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { employeeId, password } = req.body;

    // Check for employee
    const employee = await User.findOne({ employeeId });
    
    console.log('Login attempt:', { 
      employeeId, 
      userFound: !!employee,
      userRole: employee?.role 
    });

    if (employee && (await employee.matchPassword(password))) {
      // Log successful login with role
      console.log('Login successful:', {
        employeeId: employee.employeeId,
        name: employee.name,
        role: employee.role,
        timestamp: new Date().toISOString()
      });
      
      res.json({
        _id: employee._id,
        employeeId: employee.employeeId,
        name: employee.name,
        role: employee.role,
        token: generateToken(employee.employeeId),
      });
    } else {
      console.log('Login failed:', { employeeId });
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findOne({ employeeId: req.user.employeeId }).select('-password');
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Temporarily enable public registration (REMOVE IN PRODUCTION)
// @route   POST /api/auth/public-register
// @access  Public
router.post('/public-register', async (req, res) => {
  try {
    const { employeeId, name, password, role } = req.body;
    
    // Check if employee already exists
    const employeeExists = await User.findOne({ employeeId });
    if (employeeExists) {
      return res.status(400).json({ message: 'Employee already exists' });
    }
    
    // Create new employee
    const employee = await User.create({
      employeeId,
      name,
      password,
      role: role || 'employee', // Default to employee if no role specified
    });
    
    if (employee) {
      console.log('User registered via public registration:', {
        employeeId: employee.employeeId,
        name: employee.name,
        role: employee.role
      });
      
      res.status(201).json({
        _id: employee._id,
        employeeId: employee.employeeId,
        name: employee.name,
        role: employee.role,
      });
    } else {
      res.status(400).json({ message: 'Invalid employee data' });
    }
  } catch (error) {
    console.error('Public registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;