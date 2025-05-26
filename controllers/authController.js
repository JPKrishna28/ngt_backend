const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Generate JWT
const generateToken = (employeeId) => {
  return jwt.sign({ employeeId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { employeeId, password } = req.body;
    
    console.log('Login attempt for:', employeeId);
    
    // Find user by employeeId
    const user = await User.findOne({ employeeId });
    
    if (!user) {
      console.log('User not found with employeeId:', employeeId);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    console.log('User found with role:', user.role);
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    
    console.log('Password match result:', isMatch);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate token
    const token = generateToken(user.employeeId);
    
    // Send response with user data including role
    res.json({
      token,
      employeeId: user.employeeId,
      name: user.name,
      role: user.role
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Private/Admin
const register = async (req, res) => {
  try {
    const { employeeId, name, password, role } = req.body;
    
    // Check if user exists
    const userExists = await User.findOne({ employeeId });
    
    if (userExists) {
      return res.status(400).json({ message: 'Employee ID already exists' });
    }
    
    // Create user
    const user = await User.create({
      employeeId,
      name,
      password, // Will be hashed by pre-save hook
      role: role || 'employee'
    });
    
    if (user) {
      console.log(`User created: ${user.employeeId} (${user.name}) with role ${user.role}`);
      res.status(201).json({
        employeeId: user.employeeId,
        name: user.name,
        role: user.role
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Register a superadmin user
// @route   POST /api/auth/register-super-admin
// @access  Public (temporarily)
const registerSuperAdmin = async (req, res) => {
  try {
    const { employeeId, name, password } = req.body;
    
    console.log('Superadmin registration attempt for:', employeeId);
    
    // Check if user exists
    const userExists = await User.findOne({ employeeId });
    
    if (userExists) {
      return res.status(400).json({ message: 'Employee ID already exists' });
    }
    
    // Validate password strength for superadmin
    if (password.length < 8) {
      return res.status(400).json({ 
        message: 'Superadmin password must be at least 8 characters long' 
      });
    }
    
    // Create superadmin user with fixed role
    const user = await User.create({
      employeeId,
      name,
      password, // Will be hashed by pre-save hook
      role: 'superadmin' // Always superadmin
    });
    
    if (user) {
      console.log(`SUPERADMIN CREATED: ${user.employeeId} (${user.name}) at ${new Date().toISOString()}`);
      
      res.status(201).json({
        message: 'Superadmin created successfully',
        employeeId: user.employeeId,
        name: user.name,
        role: user.role
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Error registering superadmin:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Make sure all functions are exported
module.exports = { 
  login, 
  register, 
  registerSuperAdmin 
};