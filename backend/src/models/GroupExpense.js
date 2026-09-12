const mongoose = require('mongoose');

const splitSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  percentage: {
    type: Number,
    min: 0,
    max: 100
  }
}, { _id: false });

const groupExpenseSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  description: {
    type: String,
    required: [true, 'Expense description is required'],
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    default: 'General',
    trim: true
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Paid By user is required']
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  splitType: {
    type: String,
    enum: ['equal', 'exact', 'percentage'],
    default: 'equal'
  },
  splits: [splitSchema],
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

groupExpenseSchema.index({ groupId: 1, date: -1 });
groupExpenseSchema.index({ groupId: 1, category: 1 });

module.exports = mongoose.model('GroupExpense', groupExpenseSchema);
