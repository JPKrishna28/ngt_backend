const express = require('express');
const User = require('../models/User');
const { protect, admin } = require('../middleware/authMiddleware');
const multer = require('multer');
const csv = require('csvtojson');
const fs = require('fs');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

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

// @desc    Upload CSV to create employees in bulk
// @route   POST /api/employees/upload-csv
// @access  Admin
router.post('/upload-csv', protect, admin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const employees = await csv().fromFile(req.file.path);
    let created = 0, skipped = 0, errors = [];

    for (const emp of employees) {
      // Adjust the keys to match your CSV headers
      const { employeeId, name, password, role } = emp;
      if (!employeeId || !name || !password || !role) {
        errors.push({ employeeId, reason: 'Missing required fields' });
        skipped++;
        continue;
      }
      const exists = await User.findOne({ employeeId });
      if (exists) {
        skipped++;
        continue;
      }
      try {
        await User.create({ employeeId, name, password, role });
        created++;
      } catch (e) {
        errors.push({ employeeId, reason: e.message });
        skipped++;
      }
    }

    // Clean up uploaded file
    fs.unlink(req.file.path, () => {});
    res.json({ created, skipped, errors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error uploading CSV' });
  }
});

module.exports = router;