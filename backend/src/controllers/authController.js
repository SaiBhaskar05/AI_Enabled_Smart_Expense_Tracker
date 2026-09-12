const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Category = require('../models/Category');
const EmailPreference = require('../models/EmailPreference');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Default categories to create for new users (matching ML dataset labels)
const DEFAULT_CATEGORIES = [
  { name: 'Food', icon: '🍔', color: '#f97316', mlSupported: true, isDefault: true },
  { name: 'Travel', icon: '✈️', color: '#06b6d4', mlSupported: true, isDefault: true },
  { name: 'Shopping', icon: '🛍️', color: '#a855f7', mlSupported: true, isDefault: true },
  { name: 'Utilities', icon: '💡', color: '#eab308', mlSupported: true, isDefault: true },
  { name: 'Healthcare', icon: '🏥', color: '#ef4444', mlSupported: true, isDefault: true },
  { name: 'Education', icon: '📚', color: '#3b82f6', mlSupported: true, isDefault: true },
  { name: 'Entertainment', icon: '🎬', color: '#ec4899', mlSupported: true, isDefault: true },
  { name: 'EMI', icon: '🏦', color: '#64748b', mlSupported: true, isDefault: true },
  { name: 'Investment', icon: '📈', color: '#10b981', mlSupported: true, isDefault: true },
  { name: 'Others', icon: '📦', color: '#94a3b8', mlSupported: false, isDefault: true }
];

// @desc   Register user
// @route  POST /api/auth/register
// @access Public
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Create user
    const user = await User.create({ name, email, password });

    // Create default categories for user
    const categories = DEFAULT_CATEGORIES.map(cat => ({ ...cat, userId: user._id }));
    await Category.insertMany(categories);

    // Create default email preferences
    await EmailPreference.create({ userId: user._id });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        token,
        user: { _id: user._id, name: user.name, email: user.email, currency: user.currency }
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// @desc   Login user
// @route  POST /api/auth/login
// @access Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: { _id: user._id, name: user.name, email: user.email, currency: user.currency }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// @desc   Get current user
// @route  GET /api/auth/me
// @access Private
const getMe = async (req, res) => {
  res.json({
    success: true,
    data: { user: req.user }
  });
};

// @desc   Update profile
// @route  PUT /api/auth/profile
// @access Private
const updateProfile = async (req, res) => {
  try {
    const { name, currency } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, currency },
      { new: true, runValidators: true }
    );
    res.json({ success: true, message: 'Profile updated', data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { register, login, getMe, updateProfile };
