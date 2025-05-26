const mongoose = require('mongoose');

// Break schema (sub-document)
const BreakSchema = new mongoose.Schema({
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'completed'],
    default: 'active'
  },
  duration: {
    type: Number,
    default: 0 // Duration in hours
  }
}, { _id: false });

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
    breaks: [BreakSchema],
    totalBreakHours: {
      type: Number,
      default: 0, // Total break time in hours
    },
    netWorkHours: {
      type: Number,
      default: 0, // Working hours excluding breaks
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