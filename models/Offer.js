const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      ref: 'User'
    },
    offerDetails: {
      position: {
        type: String,
        required: true
      },
      startDate: {
        type: Date,
        required: true
      },
      salary: {
        type: Number,
        required: true
      },
      paymentFrequency: {
        type: String,
        enum: ['weekly', 'bi-weekly', 'semi-monthly', 'monthly'],
        default: 'bi-weekly'
      },
      bonus: {
        type: Number
      },
      reportingManager: {
        type: String,
        required: true
      },
      reportingManagerTitle: {
        type: String
      },
      signatoryName: {
        type: String,
        required: true
      },
      signatoryTitle: {
        type: String,
        required: true
      },
      offerValidUntil: {
        type: Date,
        required: true
      },
      benefits: [{
        type: String
      }],
      contingencies: [{
        type: String
      }],
      recipientEmail: {
        type: String,
        required: true
      },
      emailSubject: {
        type: String
      },
      emailMessage: {
        type: String
      },
      sentDate: {
        type: Date,
        default: Date.now
      }
    },
    status: {
      type: String,
      enum: ['sent', 'accepted', 'declined', 'expired'],
      default: 'sent'
    },
    acceptanceDate: {
      type: Date
    },
    notes: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Offer', OfferSchema);