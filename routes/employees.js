const express = require('express');
const User = require('../models/User');
const { protect, admin } = require('../middleware/authMiddleware');
const multer = require('multer');
const csv = require('csvtojson');
const fs = require('fs');
const TimeLog = require('../models/TimeLog');
const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Helper function to check if user is admin or superadmin
const isAdminOrSuperadmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin or Superadmin role required.' });
  }
};

// @desc    Get all users (including admins and superadmins) - SUPERADMIN ONLY
// @route   GET /api/employees/all
// @access  Superadmin
router.get('/all', protect, async (req, res) => {
  try {
    // Only allow superadmins to access this route
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied. Superadmin role required.' });
    }
    
    console.log('Fetching all users for superadmin:', req.user.employeeId);
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    console.log(`Found ${users.length} users`);
    res.json(users);
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Upload CSV to create employees in bulk
// @route   POST /api/employees/upload-csv
// @access  Admin or Superadmin
router.post('/upload-csv', protect, isAdminOrSuperadmin, upload.single('file'), async (req, res) => {
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

// @desc    Get all employees
// @route   GET /api/employees
// @access  Admin or Superadmin
router.get('/', protect, isAdminOrSuperadmin, async (req, res) => {
  try {
    const employees = await User.find({}).select('-password');
    res.json(employees);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get employee details with stats
// @route   GET /api/employees/:id/details
// @access  Admin or Superadmin
router.get('/:id/details', protect, isAdminOrSuperadmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the employee
    const employee = await User.findOne({ employeeId: id }).select('-password');
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Get the employee's time logs
    const timeLogs = await TimeLog.find({ employeeId: id }).sort({ loginTime: -1 });
    
    // Calculate statistics
    const stats = calculateEmployeeStats(timeLogs);
    
    res.json({
      employee,
      timeLogs,
      stats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get employee by ID
// @route   GET /api/employees/:id
// @access  Admin or Superadmin
router.get('/:id', protect, isAdminOrSuperadmin, async (req, res) => {
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
// @access  Admin or Superadmin
router.put('/:id', protect, isAdminOrSuperadmin, async (req, res) => {
  try {
    const employee = await User.findOne({ employeeId: req.params.id });
    if (employee) {
      employee.name = req.body.name || employee.name;
      
      // Only allow role changes if the user is a superadmin or if not modifying a superadmin
      if (req.user.role === 'superadmin' || (employee.role !== 'superadmin' && req.body.role)) {
        employee.role = req.body.role || employee.role;
      } else if (req.body.role && req.body.role !== employee.role) {
        return res.status(403).json({ 
          message: 'Only superadmins can modify the role of a superadmin user' 
        });
      }
      
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
// @access  Admin or Superadmin
router.delete('/:id', protect, isAdminOrSuperadmin, async (req, res) => {
  try {
    const employee = await User.findOne({ employeeId: req.params.id });
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    // Prevent self-deletion
    if (employee.employeeId === req.user.employeeId) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    
    // Only superadmins can delete other superadmins
    if (employee.role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only superadmins can delete superadmin accounts' });
    }
    
    // Instead of employee.remove(), use deleteOne()
    await User.deleteOne({ _id: employee._id });
    
    // Optional: Delete associated time logs
    await TimeLog.deleteMany({ employeeId: req.params.id });
    
    res.json({ message: 'Employee removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to calculate employee statistics
const calculateEmployeeStats = (timeLogs) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneMonthAgo = new Date(today);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  
  // Init stats
  const stats = {
    today: { total: 0, breaks: 0, net: 0 },
    week: { total: 0, breaks: 0, net: 0 },
    month: { total: 0, breaks: 0, net: 0 },
    allTime: { total: 0, breaks: 0, net: 0 },
    avgDailyHours: 0,
    avgBreakTime: 0,
    totalDaysWorked: 0,
    breakDistribution: {
      morning: 0, // Before noon
      afternoon: 0, // Noon to 5pm
      evening: 0 // After 5pm
    }
  };
  
  // Collect unique days worked
  const daysWorked = new Set();
  
  // Process time logs
  timeLogs.forEach(log => {
    if (log.status === 'completed') {
      const logDate = new Date(log.loginTime);
      const dateString = logDate.toISOString().split('T')[0];
      daysWorked.add(dateString);
      
      // Add to all time stats
      stats.allTime.total += log.totalHours || 0;
      stats.allTime.breaks += log.totalBreakHours || 0;
      stats.allTime.net += log.netWorkHours || 0;
      
      // Check if log is from today
      if (logDate >= today) {
        stats.today.total += log.totalHours || 0;
        stats.today.breaks += log.totalBreakHours || 0;
        stats.today.net += log.netWorkHours || 0;
      }
      
      // Check if log is from this week
      if (logDate >= oneWeekAgo) {
        stats.week.total += log.totalHours || 0;
        stats.week.breaks += log.totalBreakHours || 0;
        stats.week.net += log.netWorkHours || 0;
      }
      
      // Check if log is from this month
      if (logDate >= oneMonthAgo) {
        stats.month.total += log.totalHours || 0;
        stats.month.breaks += log.totalBreakHours || 0;
        stats.month.net += log.netWorkHours || 0;
      }
      
      // Process breaks for distribution
      if (log.breaks && log.breaks.length > 0) {
        log.breaks.forEach(breakItem => {
          if (breakItem.status === 'completed') {
            const breakHour = new Date(breakItem.startTime).getHours();
            
            if (breakHour < 12) {
              stats.breakDistribution.morning += breakItem.duration || 0;
            } else if (breakHour < 17) {
              stats.breakDistribution.afternoon += breakItem.duration || 0;
            } else {
              stats.breakDistribution.evening += breakItem.duration || 0;
            }
          }
        });
      }
    }
  });
  
  stats.totalDaysWorked = daysWorked.size;
  
  // Calculate averages
  if (stats.totalDaysWorked > 0) {
    stats.avgDailyHours = stats.allTime.net / stats.totalDaysWorked;
  }
  
  if (timeLogs.filter(log => log.totalBreakHours > 0).length > 0) {
    const logsWithBreaks = timeLogs.filter(log => log.totalBreakHours > 0);
    stats.avgBreakTime = stats.allTime.breaks / logsWithBreaks.length;
  }
  
  // Format numbers
  const formatDecimal = (num) => parseFloat(num.toFixed(2));
  
  stats.today = {
    total: formatDecimal(stats.today.total),
    breaks: formatDecimal(stats.today.breaks),
    net: formatDecimal(stats.today.net)
  };
  
  stats.week = {
    total: formatDecimal(stats.week.total),
    breaks: formatDecimal(stats.week.breaks),
    net: formatDecimal(stats.week.net)
  };
  
  stats.month = {
    total: formatDecimal(stats.month.total),
    breaks: formatDecimal(stats.month.breaks),
    net: formatDecimal(stats.month.net)
  };
  
  stats.allTime = {
    total: formatDecimal(stats.allTime.total),
    breaks: formatDecimal(stats.allTime.breaks),
    net: formatDecimal(stats.allTime.net)
  };
  
  stats.avgDailyHours = formatDecimal(stats.avgDailyHours);
  stats.avgBreakTime = formatDecimal(stats.avgBreakTime);
  stats.breakDistribution = {
    morning: formatDecimal(stats.breakDistribution.morning),
    afternoon: formatDecimal(stats.breakDistribution.afternoon),
    evening: formatDecimal(stats.breakDistribution.evening)
  };
  
  return stats;
};

module.exports = router;