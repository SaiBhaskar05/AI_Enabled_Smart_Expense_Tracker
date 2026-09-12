const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [50, 'Category name cannot exceed 50 characters']
  },
  icon: {
    type: String,
    default: '📦'
  },
  color: {
    type: String,
    default: '#6366f1'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  mlSupported: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Unique category name per user
categorySchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
