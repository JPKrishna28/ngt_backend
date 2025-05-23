const express = require('express');
const User = require('../models/User');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// @desc    Get all employees
// @route   GET /api/employees
// @access  Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const employees = await User.find({}).select('-password');
    res.json(employees);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get employee by ID
// @route   GET /api/employees/:id
// @access  Admin
router.get('/:id', protect, admin, async (req, res) => {
  try {
    const employee = await User.findOne({ employeeId: req.params.id }).select('-password');
    
    if (employee) {
      res.json(employee);
    } else {
      res.status(404).json({ message: 'Employee not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const employee = await User.findOne({ employeeId: req.params.id });
    
    if (employee) {
      employee.name = req.body.name || employee.name;
      employee.role = req.body.role || employee.role;
      
      if (req.body.password) {
        employee.password = req.body.password;
      }
      
      const updatedEmployee = await employee.save();
      
      res.json({
        _id: updatedEmployee._id,
        employeeId: updatedEmployee.employeeId,
        name: updatedEmployee.name,
        role: updatedEmployee.role,
      });
    } else {
      res.status(404).json({ message: 'Employee not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Delete employee
// @route   DELETE /api/employees/:id
// @access  Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const employee = await User.findOne({ employeeId: req.params.id });
    
    if (employee) {
      await employee.remove();
      res.json({ message: 'Employee removed' });
    } else {
      res.status(404).json({ message: 'Employee not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;