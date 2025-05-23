const mongoose = require('mongoose');

const TimeLogSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    ref: 'User',
  },
  loginTime: {
    type: Date,
    required: true,
  },
  logoutTime: {
    type: Date,
    default: null,
  },
  totalHours: {
    type: Number,
    default: 0,
  },
  date: {
    type: Date,
    default: function() {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    },
  },
  status: {
    type: String,
    enum: ['active', 'completed'],
    default: 'active',
  },
});

// Calculate total hours when logging out
TimeLogSchema.methods.calculateHours = function() {
  if (this.logoutTime && this.loginTime) {
    const diff = this.logoutTime - this.loginTime;
    this.totalHours = diff / (1000 * 60 * 60); // Convert ms to hours
    return this.totalHours;
  }
  return 0;
};

module.exports = mongoose.model('TimeLog', TimeLogSchema);