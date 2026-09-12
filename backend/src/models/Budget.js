const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Budget amount is required'],
    min: [1, 'Budget amount must be at least 1']
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'],
    default: 'monthly'
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  alertThreshold: {
    type: Number,
    default: 80, // Alert when 80% of budget is used
    min: 1,
    max: 100
  }
}, { timestamps: true });

budgetSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model('Budget', budgetSchema);
