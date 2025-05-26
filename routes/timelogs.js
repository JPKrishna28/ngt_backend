const express = require('express');
const TimeLog = require('../models/TimeLog');
const { protect, admin } = require('../middleware/authMiddleware');
const router = express.Router();

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

    // Make sure all breaks are completed
    const activeBreak = activeSession.breaks.find(b => b.status === 'active');
    if (activeBreak) {
      return res.status(400).json({ message: 'Please end your break before logging out' });
    }

    const logoutTime = new Date();
    
    // Calculate total work hours
    const totalMilliseconds = logoutTime - activeSession.loginTime;
    let totalHours = totalMilliseconds / (1000 * 60 * 60);
    
    // Calculate net work hours (total - breaks)
    const netWorkHours = totalHours - activeSession.totalBreakHours;

    // Update the time log
    activeSession.logoutTime = logoutTime;
    activeSession.status = 'completed';
    activeSession.totalHours = parseFloat(totalHours.toFixed(2));
    activeSession.netWorkHours = parseFloat(netWorkHours.toFixed(2));

    const updatedTimeLog = await activeSession.save();
    res.json(updatedTimeLog);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Start a break
// @route   POST /api/timelogs/break/start
// @access  Private
router.post('/break/start', protect, async (req, res) => {
  try {
    // Find the active session
    const activeSession = await TimeLog.findOne({
      employeeId: req.user.employeeId,
      status: 'active',
    });

    if (!activeSession) {
      return res.status(400).json({ message: 'No active work session found' });
    }

    // Check if there's already an active break
    const hasActiveBreak = activeSession.breaks.some(
      (breakEntry) => breakEntry.status === 'active'
    );

    if (hasActiveBreak) {
      return res.status(400).json({ message: 'You already have an active break' });
    }

    // Add a new break
    activeSession.breaks.push({
      startTime: new Date(),
      status: 'active',
    });

    const updatedSession = await activeSession.save();
    res.json(updatedSession);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    End a break
// @route   PUT /api/timelogs/break/end
// @access  Private
router.put('/break/end', protect, async (req, res) => {
  try {
    // Find the active session
    const activeSession = await TimeLog.findOne({
      employeeId: req.user.employeeId,
      status: 'active',
    });

    if (!activeSession) {
      return res.status(400).json({ message: 'No active work session found' });
    }

    // Find the active break
    const activeBreakIndex = activeSession.breaks.findIndex(
      (breakEntry) => breakEntry.status === 'active'
    );

    if (activeBreakIndex === -1) {
      return res.status(400).json({ message: 'No active break found' });
    }

    // Calculate break duration
    const breakEntry = activeSession.breaks[activeBreakIndex];
    const endTime = new Date();
    const durationMs = endTime - breakEntry.startTime;
    const durationHours = durationMs / (1000 * 60 * 60);

    // Update the break entry
    breakEntry.endTime = endTime;
    breakEntry.status = 'completed';
    breakEntry.duration = parseFloat(durationHours.toFixed(2));

    // Update total break hours
    activeSession.totalBreakHours = parseFloat(
      (activeSession.totalBreakHours + durationHours).toFixed(2)
    );

    const updatedSession = await activeSession.save();
    res.json(updatedSession);
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