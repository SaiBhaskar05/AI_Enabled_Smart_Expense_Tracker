const Expense = require('../models/Expense');
const Budget = require('../models/Budget');

// @desc   Get report data for a date range
// @route  GET /api/reports
const getReport = async (req, res) => {
  try {
    const { startDate, endDate, period } = req.query;
    const userId = req.user._id;
    const now = new Date();

    let start, end;
    if (period === 'today') {
      start = new Date(now); start.setHours(0, 0, 0, 0);
      end = new Date(now); end.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
      const day = now.getDay();
      start = new Date(now); start.setDate(now.getDate() - day); start.setHours(0, 0, 0, 0);
      end = new Date(now); end.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now); end.setHours(23, 59, 59, 999);
    } else {
      start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
      end = endDate ? new Date(endDate) : new Date(now);
      end.setHours(23, 59, 59, 999);
    }

    const matchQuery = { userId, date: { $gte: start, $lte: end } };

    const [summaryResult, categoryBreakdown, expenses, budgets] = await Promise.all([
      Expense.aggregate([
        { $match: matchQuery },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 }, avg: { $avg: '$amount' }, max: { $max: '$amount' } } }
      ]),
      Expense.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]),
      Expense.find(matchQuery).sort({ amount: -1 }).limit(5),
      Budget.find({ userId })
    ]);

    // Budget utilization
    const budgetUtilization = await Promise.all(budgets.map(async (b) => {
      const spending = await Expense.aggregate([
        { $match: { userId, category: b.category, date: { $gte: b.startDate, $lte: b.endDate } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const spent = spending[0]?.total || 0;
      return { category: b.category, budget: b.amount, spent, percentage: Math.round((spent / b.amount) * 100) };
    }));

    const summary = summaryResult[0] || { total: 0, count: 0, avg: 0, max: 0 };
    res.json({
      success: true,
      data: { summary, categoryBreakdown, topExpenses: expenses, budgetUtilization, period: { start, end } }
    });
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate report' });
  }
};

module.exports = { getReport };
