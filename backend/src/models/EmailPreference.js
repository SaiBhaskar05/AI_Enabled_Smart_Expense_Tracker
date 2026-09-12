const mongoose = require('mongoose');

const recipientSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    default: ''
  },
  email: {
    type: String,
    required: [true, 'Recipient email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  relationship: {
    type: String,
    enum: ['Family', 'Friend', 'Spouse', 'Parent', 'Sibling', 'Child', 'Accountant', 'Other'],
    default: 'Family'
  },
  daily: {
    type: Boolean,
    default: false
  },
  weekly: {
    type: Boolean,
    default: true
  },
  monthly: {
    type: Boolean,
    default: true
  },
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const emailPreferenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  dailySummary: {
    type: Boolean,
    default: true
  },
  weeklySummary: {
    type: Boolean,
    default: true
  },
  monthlySummary: {
    type: Boolean,
    default: true
  },
  budgetAlerts: {
    type: Boolean,
    default: true
  },
  recipients: [recipientSchema],
  dailyTime: {
    type: String,
    default: '20:00' // 8 PM
  },
  weeklyDay: {
    type: Number,
    default: 0, // Sunday
    min: 0,
    max: 6
  },
  monthlyDay: {
    type: Number,
    default: 1, // 1st of month
    min: 1,
    max: 28
  }
}, { timestamps: true });

module.exports = mongoose.model('EmailPreference', emailPreferenceSchema);

