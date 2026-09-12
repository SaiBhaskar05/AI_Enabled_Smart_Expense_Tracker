const mongoose = require('mongoose');

const groupSettlementSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Payer (From User) is required']
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient (To User) is required']
  },
  amount: {
    type: Number,
    required: [true, 'Settlement amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  date: {
    type: Date,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'UPI', 'Bank Transfer', 'Other'],
    default: 'UPI'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [300, 'Notes cannot exceed 300 characters']
  },
  settledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

groupSettlementSchema.index({ groupId: 1, date: -1 });

module.exports = mongoose.model('GroupSettlement', groupSettlementSchema);
