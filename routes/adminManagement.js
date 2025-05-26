const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, superAdmin } = require('../middleware/authMiddleware');

// @desc    Get all admins
// @route   GET /api/admin-management
// @access  Super Admin
router.get('/', protect, superAdmin, async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('-password');
    res.json(admins);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Create a new admin
// @route   POST /api/admin-management
// @access  Super Admin
router.post('/', protect, superAdmin, async (req, res) => {
  try {
    const { employeeId, name, email, password } = req.body;

    // Check if admin already exists
    const adminExists = await User.findOne({ 
      $or: [{ employeeId }, { email }] 
    });

    if (adminExists) {
      return res.status(400).json({ 
        message: adminExists.employeeId === employeeId 
          ? 'Employee ID already exists' 
          : 'Email already in use' 
      });
    }

    // Create admin
    const admin = await User.create({
      employeeId,
      name,
      email,
      password,
      role: 'admin'
    });

    if (admin) {
      res.status(201).json({
        _id: admin._id,
        employeeId: admin.employeeId,
        name: admin.name,
        email: admin.email,
        role: admin.role
      });
    } else {
      res.status(400).json({ message: 'Invalid admin data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get admin by ID
// @route   GET /api/admin-management/:id
// @access  Super Admin
router.get('/:id', protect, superAdmin, async (req, res) => {
  try {
    const admin = await User.findOne({ 
      employeeId: req.params.id,
      role: 'admin'
    }).select('-password');

    if (admin) {
      res.json(admin);
    } else {
      res.status(404).json({ message: 'Admin not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update admin
// @route   PUT /api/admin-management/:id
// @access  Super Admin
router.put('/:id', protect, superAdmin, async (req, res) => {
  try {
    const admin = await User.findOne({ 
      employeeId: req.params.id,
      role: 'admin'
    });

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Update fields
    admin.name = req.body.name || admin.name;
    admin.email = req.body.email || admin.email;

    // If password is provided, update it
    if (req.body.password) {
      admin.password = req.body.password;
    }

    const updatedAdmin = await admin.save();

    res.json({
      _id: updatedAdmin._id,
      employeeId: updatedAdmin.employeeId,
      name: updatedAdmin.name,
      email: updatedAdmin.email,
      role: updatedAdmin.role
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Delete admin
// @route   DELETE /api/admin-management/:id
// @access  Super Admin
router.delete('/:id', protect, superAdmin, async (req, res) => {
  try {
    const admin = await User.findOne({ 
      employeeId: req.params.id,
      role: 'admin'
    });

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    await User.deleteOne({ _id: admin._id });
    res.json({ message: 'Admin removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;