const Expense = require('../models/Expense');

// @desc   Create expense
// @route  POST /api/expenses
// @access Private
const createExpense = async (req, res) => {
  try {
    const { description, amount, category, date, paymentMethod, notes } = req.body;
    const expense = await Expense.create({
      userId: req.user._id,
      description, amount, category,
      date: date || new Date(),
      paymentMethod: paymentMethod || 'Cash',
      notes
    });
    res.status(201).json({ success: true, message: 'Expense created successfully', data: { expense } });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ success: false, message: 'Failed to create expense' });
  }
};

// @desc   Get all expenses with filtering, search, sort, pagination
// @route  GET /api/expenses
// @access Private
const getExpenses = async (req, res) => {
  try {
    const {
      page = 1, limit = 10, search, category, paymentMethod,
      startDate, endDate, minAmount, maxAmount, sortBy = 'date', sortOrder = 'desc'
    } = req.query;

    const query = { userId: req.user._id };

    // Search by description
    if (search) {
      query.description = { $regex: search, $options: 'i' };
    }
    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }
    // Payment method filter
    if (paymentMethod && paymentMethod !== 'all') {
      query.paymentMethod = paymentMethod;
    }
    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }
    // Amount range filter
    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) query.amount.$gte = parseFloat(minAmount);
      if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [expenses, total] = await Promise.all([
      Expense.find(query).sort(sort).skip(skip).limit(parseInt(limit)),
      Expense.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        expenses,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch expenses' });
  }
};

// @desc   Get single expense
// @route  GET /api/expenses/:id
// @access Private
const getExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, userId: req.user._id });
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    res.json({ success: true, data: { expense } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch expense' });
  }
};

// @desc   Update expense
// @route  PUT /api/expenses/:id
// @access Private
const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    res.json({ success: true, message: 'Expense updated successfully', data: { expense } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update expense' });
  }
};

// @desc   Delete expense
// @route  DELETE /api/expenses/:id
// @access Private
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete expense' });
  }
};

// @desc   Get expense statistics for dashboard
// @route  GET /api/expenses/stats
// @access Private
const getStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Parallel aggregations
    const [
      totalStats, monthStats, lastMonthStats, todayStats,
      categoryBreakdown, monthlyTrend, paymentMethodBreakdown, dailyTrend
    ] = await Promise.all([
      // All time total
      Expense.aggregate([
        { $match: { userId } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      // This month
      Expense.aggregate([
        { $match: { userId, date: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      // Last month
      Expense.aggregate([
        { $match: { userId, date: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      // Today
      Expense.aggregate([
        { $match: { userId, date: { $gte: startOfDay } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      // Category breakdown (all time or this month)
      Expense.aggregate([
        { $match: { userId } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]),
      // Monthly trend (last 6 months)
      Expense.aggregate([
        { $match: { userId, date: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } } },
        {
          $group: {
            _id: { year: { $year: '$date' }, month: { $month: '$date' } },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      // Payment method breakdown
      Expense.aggregate([
        { $match: { userId } },
        { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]),
      // Daily spending (last 30 days)
      Expense.aggregate([
        { $match: { userId, date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const daysInMonth = now.getDate();
    const monthTotal = monthStats[0]?.total || 0;
    const lastMonthTotal = lastMonthStats[0]?.total || 0;
    const avgDaily = daysInMonth > 0 ? Math.round((monthTotal / daysInMonth) * 100) / 100 : 0;
    const momChangePercent = lastMonthTotal > 0
      ? Math.round(((monthTotal - lastMonthTotal) / lastMonthTotal) * 100)
      : (monthTotal > 0 ? 100 : 0);

    res.json({
      success: true,
      data: {
        total: totalStats[0]?.total || 0,
        totalCount: totalStats[0]?.count || 0,
        monthTotal,
        monthCount: monthStats[0]?.count || 0,
        lastMonthTotal,
        momChangePercent,
        todayTotal: todayStats[0]?.total || 0,
        todayCount: todayStats[0]?.count || 0,
        avgDaily,
        avgDailySpending: avgDaily,
        categoryBreakdown,
        monthlyTrend,
        paymentMethodBreakdown,
        dailyTrend
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
};

module.exports = { createExpense, getExpenses, getExpense, updateExpense, deleteExpense, getStats };
