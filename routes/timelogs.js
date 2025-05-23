const express = require('express');
const TimeLog = require('../models/TimeLog');
const { protect, admin } = require('../middleware/authMiddleware');
const router = express.Router();
const moment = require('moment');

// Helper function for lunch break deduction
const applyLunchBreakDeduction = (loginTime, logoutTime) => {
  const login = new Date(loginTime);
  const logout = new Date(logoutTime);
  
  // Calculate total hours worked
  const totalMilliseconds = logout - login;
  const totalHours = totalMilliseconds / (1000 * 60 * 60);
  
  // Only deduct lunch if worked more than 5 hours
  if (totalHours >= 5) {
    // Deduct 1 hour for lunch break
    const adjustedHours = Math.max(0, totalHours - 1);
    return { 
      totalHours: parseFloat(totalHours.toFixed(2)), 
      adjustedHours: parseFloat(adjustedHours.toFixed(2)),
      lunchBreakDeducted: true 
    };
  }
  
  // If worked less than 5 hours, no lunch break deduction
  return { 
    totalHours: parseFloat(totalHours.toFixed(2)), 
    adjustedHours: parseFloat(totalHours.toFixed(2)),
    lunchBreakDeducted: false 
  };
};

// @desc    Log in (clock in) for the day
// @route   POST /api/timelogs/login
// @access  Private
router.post('/login', protect, async (req, res) => {
  try {
    // Check if there's already an active session
    const activeSession = await TimeLog.findOne({
      employeeId: req.user.employeeId,
      status: 'active',
    });

    if (activeSession) {
      return res
        .status(400)
        .json({ message: 'You already have an active session' });
    }

    // Create a new time log
    const timeLog = new TimeLog({
      employeeId: req.user.employeeId,
      loginTime: new Date(),
    });

    const savedTimeLog = await timeLog.save();
    res.status(201).json(savedTimeLog);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Log out (clock out) for the day
// @route   PUT /api/timelogs/logout
// @access  Private
router.put('/logout', protect, async (req, res) => {
  try {
    // Find the active session
    const activeSession = await TimeLog.findOne({
      employeeId: req.user.employeeId,
      status: 'active',
    });

    if (!activeSession) {
      return res.status(400).json({ message: 'No active session found' });
    }

    const logoutTime = new Date();
    
    // Calculate hours and apply lunch break deduction
    const { totalHours, adjustedHours, lunchBreakDeducted } = applyLunchBreakDeduction(
      activeSession.loginTime,
      logoutTime
    );

    // Update the time log
    activeSession.logoutTime = logoutTime;
    activeSession.status = 'completed';
    activeSession.totalHours = totalHours;
    activeSession.adjustedHours = adjustedHours;
    activeSession.lunchBreakDeducted = lunchBreakDeducted;

    const updatedTimeLog = await activeSession.save();
    res.json(updatedTimeLog);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get time logs for the current employee
// @route   GET /api/timelogs/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const timeLogs = await TimeLog.find({ employeeId: req.user.employeeId }).sort({
      loginTime: -1,
    });
    res.json(timeLogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get all time logs (admin only)
// @route   GET /api/timelogs
// @access  Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const timeLogs = await TimeLog.find().sort({ loginTime: -1 });
    res.json(timeLogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get time logs for a specific employee (admin only)
// @route   GET /api/timelogs/:employeeId
// @access  Admin
router.get('/:employeeId', protect, admin, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const timeLogs = await TimeLog.find({ employeeId }).sort({ loginTime: -1 });
    res.json(timeLogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Add a note to a time log
// @route   PUT /api/timelogs/:id/note
// @access  Private (only for own logs) or Admin
router.put('/:id/note', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const timeLog = await TimeLog.findById(id);

    if (!timeLog) {
      return res.status(404).json({ message: 'Time log not found' });
    }

    // Check if the user is the owner or an admin
    if (timeLog.employeeId !== req.user.employeeId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    timeLog.notes = note;
    const updatedTimeLog = await timeLog.save();

    res.json(updatedTimeLog);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;