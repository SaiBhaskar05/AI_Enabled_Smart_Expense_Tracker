const Budget = require('../models/Budget');
const Expense = require('../models/Expense');

const calculateBudgetPeriodDates = (period = 'monthly', customStart, customEnd) => {
  const now = new Date();
  let start, end;

  if (customStart) {
    start = new Date(customStart);
    start.setHours(0, 0, 0, 0);
  } else if (period === 'weekly') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    start = new Date(now.setDate(diff));
    start.setHours(0, 0, 0, 0);
  } else if (period === 'yearly') {
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  } else {
    // Default to monthly: 1st day of current month 00:00:00.000
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }

  if (customEnd) {
    end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);
  } else if (period === 'weekly') {
    end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (period === 'yearly') {
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  } else {
    // Default to monthly: last day of current month 23:59:59.999
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  return { start, end };
};

// @desc   Get all budgets with spending data
// @route  GET /api/budgets
const getBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.user._id }).sort({ createdAt: -1 });

    // Calculate spending for each budget
    const budgetsWithSpending = await Promise.all(budgets.map(async (budget) => {
      const { start, end } = calculateBudgetPeriodDates(
        budget.period,
        budget.startDate,
        budget.endDate
      );

      const escapedCategory = budget.category.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

      const spending = await Expense.aggregate([
        {
          $match: {
            userId: req.user._id,
            category: { $regex: new RegExp(`^${escapedCategory}$`, 'i') },
            date: { $gte: start, $lte: end }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const spent = spending[0]?.total || 0;
      const percentage = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;
      
      return {
        ...budget.toObject(),
        startDate: start,
        endDate: end,
        spent,
        percentage,
        remaining: Math.max(0, budget.amount - spent),
        isOverBudget: spent > budget.amount,
        isNearLimit: percentage >= (budget.alertThreshold || 80) && spent <= budget.amount
      };
    }));

    res.json({ success: true, data: { budgets: budgetsWithSpending } });
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch budgets' });
  }
};

// @desc   Create or update budget
// @route  POST /api/budgets
const createBudget = async (req, res) => {
  try {
    const { category, amount, period = 'monthly', startDate, endDate, alertThreshold } = req.body;
    
    if (!category || !amount) {
      return res.status(400).json({ success: false, message: 'Category and amount are required' });
    }

    const { start, end } = calculateBudgetPeriodDates(period, startDate, endDate);
    const trimmedCategory = category.trim();
    const escapedCategory = trimmedCategory.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

    const existingBudget = await Budget.findOne({
      userId: req.user._id,
      category: { $regex: new RegExp(`^${escapedCategory}$`, 'i') }
    });

    let budget;
    if (existingBudget) {
      existingBudget.amount = parseFloat(amount);
      existingBudget.period = period;
      existingBudget.startDate = start;
      existingBudget.endDate = end;
      existingBudget.alertThreshold = parseFloat(alertThreshold) || 80;
      budget = await existingBudget.save();
    } else {
      budget = await Budget.create({
        userId: req.user._id,
        category: trimmedCategory,
        amount: parseFloat(amount),
        period,
        startDate: start,
        endDate: end,
        alertThreshold: parseFloat(alertThreshold) || 80
      });
    }

    res.status(201).json({ success: true, message: 'Budget saved successfully', data: { budget } });
  } catch (error) {
    console.error('Create budget error:', error);
    res.status(500).json({ success: false, message: 'Failed to save budget' });
  }
};

// @desc   Update budget
// @route  PUT /api/budgets/:id
const updateBudget = async (req, res) => {
  try {
    const { category, amount, period, startDate, endDate, alertThreshold } = req.body;
    const { start, end } = calculateBudgetPeriodDates(period, startDate, endDate);

    const updateData = { ...req.body };
    if (period || startDate || endDate) {
      updateData.startDate = start;
      updateData.endDate = end;
    }
    if (amount) updateData.amount = parseFloat(amount);
    if (alertThreshold) updateData.alertThreshold = parseFloat(alertThreshold);

    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updateData,
      { new: true }
    );

    if (!budget) return res.status(404).json({ success: false, message: 'Budget not found' });
    res.json({ success: true, message: 'Budget updated successfully', data: { budget } });
  } catch (error) {
    console.error('Update budget error:', error);
    res.status(500).json({ success: false, message: 'Failed to update budget' });
  }
};

// @desc   Delete budget
// @route  DELETE /api/budgets/:id
const deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!budget) return res.status(404).json({ success: false, message: 'Budget not found' });
    res.json({ success: true, message: 'Budget deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete budget' });
  }
};

module.exports = { getBudgets, createBudget, updateBudget, deleteBudget };
