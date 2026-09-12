const mongoose = require('mongoose');
const crypto = require('crypto');

const groupMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member'
  },
  nickname: {
    type: String,
    trim: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const categoryBudgetSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group / Trip name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [300, 'Description cannot exceed 300 characters']
  },
  type: {
    type: String,
    enum: ['Trip', 'Travel', 'Roommates', 'Project', 'Family', 'Event', 'Other'],
    default: 'Trip'
  },
  currency: {
    type: String,
    default: 'INR'
  },
  totalBudget: {
    type: Number,
    default: 0,
    min: [0, 'Budget cannot be negative']
  },
  categoryBudgets: [categoryBudgetSchema],
  inviteCode: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [groupMemberSchema],
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  archived: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Auto-generate unique 7-character invite code before saving if not present
groupSchema.pre('validate', function (next) {
  if (!this.inviteCode) {
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
    this.inviteCode = `TRIP-${randomSuffix}`;
  }
  next();
});

groupSchema.index({ 'members.user': 1 });

module.exports = mongoose.model('Group', groupSchema);
