const express = require('express');
const TimeLog = require('../models/TimeLog');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// @desc    Create new login time
// @route   POST /api/timelogs/login
// @access  Private
router.post('/login', protect, async (req, res) => {
  try {
    // Check if there's an active session
    const activeSession = await TimeLog.findOne({
      employeeId: req.user.employeeId,
      status: 'active',
    });

    if (activeSession) {
      return res.status(400).json({ message: 'You already have an active session' });
    }

    const timeLog = await TimeLog.create({
      employeeId: req.user.employeeId,
      loginTime: new Date(),
    });

    res.status(201).json(timeLog);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Log out time
// @route   PUT /api/timelogs/logout
// @access  Private
router.put('/logout', protect, async (req, res) => {
  try {
    // Find active session
    const timeLog = await TimeLog.findOne({
      employeeId: req.user.employeeId,
      status: 'active',
    });

    if (!timeLog) {
      return res.status(400).json({ message: 'No active session found' });
    }

    // Update logout time
    timeLog.logoutTime = new Date();
    timeLog.status = 'completed';
    timeLog.calculateHours();
    
    const updatedTimeLog = await timeLog.save();
    res.json(updatedTimeLog);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get current user's time logs
// @route   GET /api/timelogs/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const timeLogs = await TimeLog.find({ employeeId: req.user.employeeId })
      .sort('-loginTime');
    res.json(timeLogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get all time logs
// @route   GET /api/timelogs
// @access  Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const timeLogs = await TimeLog.find({}).sort('-loginTime');
    res.json(timeLogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get time logs by employee ID
// @route   GET /api/timelogs/employee/:id
// @access  Admin
router.get('/employee/:id', protect, admin, async (req, res) => {
  try {
    const timeLogs = await TimeLog.find({ employeeId: req.params.id })
      .sort('-loginTime');
    res.json(timeLogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get time logs by date range
// @route   GET /api/timelogs/range
// @access  Admin
router.get('/range', protect, admin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Please provide start and end dates' });
    }
    
    const timeLogs = await TimeLog.find({
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    }).sort('-loginTime');
    
    res.json(timeLogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;