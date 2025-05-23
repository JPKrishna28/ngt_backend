const mongoose = require('mongoose');

const TimeLogSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
    },
    loginTime: {
      type: Date,
      required: true,
    },
    logoutTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
    },
    totalHours: {
      type: Number,
      default: 0,
    },
    adjustedHours: {
      type: Number,
      default: 0, // This will store the hours after lunch break deduction
    },
    lunchBreakDeducted: {
      type: Boolean,
      default: false, // Flag to track if lunch break was already deducted
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('TimeLog', TimeLogSchema);