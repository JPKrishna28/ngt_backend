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

// @desc    Public registration for employees
// @route   POST /api/auth/public-register
// @access  Public
router.post('/public-register', async (req, res) => {
  try {
    const { employeeId, name, password } = req.body;

    // Check if employee already exists
    const employeeExists = await User.findOne({ employeeId });
    if (employeeExists) {
      return res.status(400).json({ message: 'Employee ID already exists' });
    }

    // Create new employee (always as regular employee)
    const employee = await User.create({
      employeeId,
      name,
      password,
      role: 'employee', // Force role to be employee for public registrations
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

// @desc    Login employee
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { employeeId, password } = req.body;

    // Check for employee
    const employee = await User.findOne({ employeeId });

    if (employee && (await employee.matchPassword(password))) {
      res.json({
        _id: employee._id,
        employeeId: employee.employeeId,
        name: employee.name,
        role: employee.role,
        token: generateToken(employee.employeeId),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error(error);
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

module.exports = router;