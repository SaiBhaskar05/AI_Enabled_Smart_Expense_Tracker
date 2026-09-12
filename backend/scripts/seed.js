require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const Expense = require('../src/models/Expense');
const Category = require('../src/models/Category');
const Budget = require('../src/models/Budget');
const EmailPreference = require('../src/models/EmailPreference');

const SEED_EMAIL = 'demo@expensetracker.com';
const SEED_PASSWORD = 'demo1234';

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

const EXPENSE_TEMPLATES = [
  { description: 'Zomato order - Butter Chicken', category: 'Food', min: 200, max: 600 },
  { description: 'Swiggy dinner', category: 'Food', min: 150, max: 500 },
  { description: 'Cafe Coffee Day', category: 'Food', min: 100, max: 300 },
  { description: 'Grocery shopping at DMart', category: 'Food', min: 800, max: 3000 },
  { description: 'Pizza Hut lunch', category: 'Food', min: 400, max: 900 },
  { description: 'Uber ride to office', category: 'Travel', min: 80, max: 400 },
  { description: 'Ola cab airport drop', category: 'Travel', min: 300, max: 800 },
  { description: 'Metro card recharge', category: 'Travel', min: 200, max: 500 },
  { description: 'Petrol refill', category: 'Travel', min: 500, max: 2000 },
  { description: 'Bus pass renewal', category: 'Travel', min: 500, max: 1500 },
  { description: 'Amazon order - earphones', category: 'Shopping', min: 500, max: 3000 },
  { description: 'Flipkart - clothing', category: 'Shopping', min: 400, max: 2500 },
  { description: 'Myntra shirt purchase', category: 'Shopping', min: 300, max: 1500 },
  { description: 'Lifestyle store shoes', category: 'Shopping', min: 1000, max: 5000 },
  { description: 'Electricity bill', category: 'Utilities', min: 800, max: 3000 },
  { description: 'Internet bill - Jio Fiber', category: 'Utilities', min: 500, max: 1500 },
  { description: 'Mobile recharge', category: 'Utilities', min: 200, max: 600 },
  { description: 'Water & maintenance', category: 'Utilities', min: 300, max: 1000 },
  { description: 'Doctor consultation fee', category: 'Healthcare', min: 300, max: 1500 },
  { description: 'Pharmacy - medicines', category: 'Healthcare', min: 200, max: 800 },
  { description: 'Gym membership', category: 'Healthcare', min: 1000, max: 3000 },
  { description: 'Udemy course - React', category: 'Education', min: 300, max: 1500 },
  { description: 'Book purchase - programming', category: 'Education', min: 200, max: 600 },
  { description: 'Movie tickets - PVR', category: 'Entertainment', min: 300, max: 1000 },
  { description: 'Netflix subscription', category: 'Entertainment', min: 149, max: 649 },
  { description: 'Spotify premium', category: 'Entertainment', min: 119, max: 119 },
  { description: 'Home loan EMI', category: 'EMI', min: 8000, max: 25000 },
  { description: 'Credit card bill payment', category: 'EMI', min: 5000, max: 20000 },
  { description: 'Mutual fund SIP', category: 'Investment', min: 1000, max: 10000 },
];

const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking', 'Wallet'];

const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

const generateExpenses = (userId, daysBack = 90) => {
  const expenses = [];
  const now = new Date();

  for (let d = 0; d < daysBack; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);

    // Random 1-5 expenses per day
    const count = randomBetween(1, 5);
    for (let i = 0; i < count; i++) {
      const template = randomElement(EXPENSE_TEMPLATES);
      expenses.push({
        userId,
        description: template.description,
        amount: randomBetween(template.min, template.max),
        category: template.category,
        date,
        paymentMethod: randomElement(PAYMENT_METHODS),
        notes: Math.random() > 0.7 ? 'Seed data entry' : ''
      });
    }
  }
  return expenses;
};

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/expense-tracker');
    console.log('✅ Connected to MongoDB');

    // Remove existing demo user data
    const existingUser = await User.findOne({ email: SEED_EMAIL });
    if (existingUser) {
      console.log('🧹 Removing existing seed data...');
      await Promise.all([
        Expense.deleteMany({ userId: existingUser._id }),
        Category.deleteMany({ userId: existingUser._id }),
        Budget.deleteMany({ userId: existingUser._id }),
        EmailPreference.deleteMany({ userId: existingUser._id }),
        User.deleteOne({ _id: existingUser._id })
      ]);
    }

    // Create demo user
    const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 12);
    const user = await User.create({ name: 'Demo User', email: SEED_EMAIL, password: SEED_PASSWORD });
    console.log(`✅ Created demo user: ${SEED_EMAIL} / ${SEED_PASSWORD}`);

    // Create categories
    const categories = DEFAULT_CATEGORIES.map(cat => ({ ...cat, userId: user._id }));
    await Category.insertMany(categories);
    console.log('✅ Created default categories');

    // Create expenses for last 90 days
    const expenses = generateExpenses(user._id, 90);
    await Expense.insertMany(expenses);
    console.log(`✅ Created ${expenses.length} sample expenses`);

    // Create sample budgets
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const budgets = [
      { userId: user._id, category: 'Food', amount: 8000, period: 'monthly', startDate: startOfMonth, endDate: endOfMonth },
      { userId: user._id, category: 'Travel', amount: 4000, period: 'monthly', startDate: startOfMonth, endDate: endOfMonth },
      { userId: user._id, category: 'Shopping', amount: 6000, period: 'monthly', startDate: startOfMonth, endDate: endOfMonth },
      { userId: user._id, category: 'Entertainment', amount: 2000, period: 'monthly', startDate: startOfMonth, endDate: endOfMonth },
      { userId: user._id, category: 'Healthcare', amount: 3000, period: 'monthly', startDate: startOfMonth, endDate: endOfMonth },
    ];
    await Budget.insertMany(budgets);
    console.log('✅ Created sample budgets');

    // Create email preferences
    await EmailPreference.create({ userId: user._id });
    console.log('✅ Created email preferences');

    console.log('\n🎉 Seed complete!');
    console.log('   Login: demo@expensetracker.com');
    console.log('   Password: demo1234');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seed();
