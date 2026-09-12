const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  title: {
    type: String,
    required: [true, 'Bill title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Utilities & Bills',
      'Food & Dining',
      'Travel & Tickets',
      'Hotel & Accommodation',
      'Shopping & Electronics',
      'Healthcare & Medical',
      'Vehicle & Fuel',
      'Entertainment & Passes',
      'General & Others'
    ],
    default: 'General & Others'
  },
  amount: {
    type: Number,
    min: [0, 'Amount cannot be negative'],
    default: null
  },
  date: {
    type: Date,
    default: Date.now
  },
  fileData: {
    type: String,
    required: [true, 'File data is required']
  },
  fileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    default: ''
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

billSchema.index({ userId: 1, createdAt: -1 });
billSchema.index({ groupId: 1, createdAt: -1 });

module.exports = mongoose.model('Bill', billSchema);
