const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const Group = require('../models/Group');

let GoogleGenAI;
try {
  const genaiPkg = require('@google/genai');
  GoogleGenAI = genaiPkg.GoogleGenAI;
} catch (e) {
  // Graceful fallback if package is loading
}

/**
 * Normalizes user ID to Mongoose ObjectId and String filter
 */
const toUserFilter = (userId) => {
  if (mongoose.Types.ObjectId.isValid(userId)) {
    const objId = new mongoose.Types.ObjectId(userId);
    return { $or: [{ userId: objId }, { userId: String(userId) }] };
  }
  return { userId };
};

/**
 * Formats numbers into Indian Rupee currency format (₹xx,xxx.xx)
 */
const formatINR = (amt) => `₹${Number(amt || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/**
 * Builds a comprehensive financial context snapshot for the user
 */
const buildUserFinancialContext = async (userId) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const userFilter = toUserFilter(userId);
    const rawUserId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

    // Current month personal expenses
    const currentMonthExpenses = await Expense.find({
      ...userFilter,
      date: { $gte: startOfMonth, $lte: now }
    }).sort({ date: -1 });

    // Previous month expenses for comparison
    const prevMonthExpenses = await Expense.find({
      ...userFilter,
      date: { $gte: startOfPrevMonth, $lte: endOfPrevMonth }
    });

    // Recent 10 transactions
    const recentExpenses = await Expense.find(userFilter)
      .sort({ date: -1 })
      .limit(10);

    // Active budgets
    const budgets = await Budget.find(userFilter);

    // Group memberships
    const groups = await Group.find({ 'members.user': rawUserId });

    // Aggregations
    const currentTotal = currentMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const prevTotal = prevMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Category breakdown this month (case-insensitive aggregation)
    const categoryTotals = {};
    currentMonthExpenses.forEach((e) => {
      const cat = (e.category || 'Others').trim();
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (e.amount || 0);
    });

    // Top spending category
    const sortedCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => ({
        category: cat,
        amount: Math.round(amt * 100) / 100,
        percentage: currentTotal > 0 ? Math.round((amt / currentTotal) * 100) : 0
      }));

    // Budget status matching
    const budgetStatus = budgets.map((b) => {
      const escapedCategory = b.category.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const catRegex = new RegExp(`^${escapedCategory}$`, 'i');
      
      const spent = currentMonthExpenses
        .filter(e => catRegex.test(e.category || ''))
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
      return {
        category: b.category,
        budget: b.amount,
        spent: Math.round(spent * 100) / 100,
        percentageUsed: pct,
        remaining: Math.max(0, b.amount - spent),
        isExceeded: spent > b.amount,
        alertThreshold: b.alertThreshold || 80
      };
    });

    return {
      currentMonth: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
      currentTotal: Math.round(currentTotal * 100) / 100,
      prevTotal: Math.round(prevTotal * 100) / 100,
      monthOverMonthChangePct: prevTotal > 0 ? Math.round(((currentTotal - prevTotal) / prevTotal) * 100) : 0,
      transactionCountThisMonth: currentMonthExpenses.length,
      categoryBreakdown: sortedCategories,
      budgetStatus,
      activeGroupCount: groups.length,
      recentExpenses: recentExpenses.map(e => ({
        title: e.description || e.title,
        amount: e.amount,
        category: e.category,
        date: e.date ? new Date(e.date).toLocaleDateString('en-IN') : 'N/A',
        paymentMethod: e.paymentMethod || 'Cash'
      }))
    };
  } catch (err) {
    console.error('Error building financial context:', err);
    return null;
  }
};

/**
 * Directly queries MongoDB for factual, exact database questions
 * (Zero AI latency, 100% accurate, exact numbers)
 */
const tryDirectDatabaseQuery = async ({ userId, userName, userMessage }) => {
  const msg = userMessage.toLowerCase().trim();
  const userFilter = toUserFilter(userId);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // 1. Top Spending Category / Where did I spend the most
  if (
    msg.includes('top spending') ||
    msg.includes('top category') ||
    msg.includes('highest category') ||
    msg.includes('where did i spend the most') ||
    msg.includes('where i spend most') ||
    msg.includes('where did i spend most') ||
    msg.includes('biggest category') ||
    msg.includes('most spent category')
  ) {
    const isAllTime = msg.includes('all time') || msg.includes('lifetime') || msg.includes('ever');
    const dateQuery = isAllTime ? {} : { date: { $gte: startOfMonth, $lte: now } };
    const monthExpenses = await Expense.find({ ...userFilter, ...dateQuery }).sort({ date: -1 });

    if (monthExpenses.length === 0) {
      return `You have no recorded expenses ${isAllTime ? 'in your ledger' : 'for this month'} yet.`;
    }

    const catTotals = {};
    monthExpenses.forEach(e => {
      const cat = (e.category || 'Others').trim();
      catTotals[cat] = (catTotals[cat] || 0) + (e.amount || 0);
    });

    const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    const topCat = sorted[0];
    const total = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const list = sorted.slice(0, 5).map(([cat, amt], i) => 
      `• **#${i + 1} ${cat}**: ${formatINR(amt)} (${total > 0 ? Math.round((amt / total) * 100) : 0}%)`
    ).join('\n');

    const periodLabel = isAllTime ? 'All-Time' : now.toLocaleString('default', { month: 'long', year: 'numeric' });
    return `### Top Spending Categories (${periodLabel})\n\nYour #1 spending category is **${topCat[0]}** with **${formatINR(topCat[1])}** (${total > 0 ? Math.round((topCat[1] / total) * 100) : 0}% of your total ${formatINR(total)} spent).\n\n**Category Breakdown:**\n${list}`;
  }

  // 2. Highest / Largest / Most Expensive Transaction
  if (
    (msg.includes('highest') && (msg.includes('expense') || msg.includes('purchase') || msg.includes('transaction') || msg.includes('item') || msg.includes('record') || msg.includes('spend'))) ||
    (msg.includes('largest') && (msg.includes('expense') || msg.includes('purchase') || msg.includes('transaction') || msg.includes('spend'))) ||
    (msg.includes('biggest') && (msg.includes('expense') || msg.includes('purchase') || msg.includes('transaction') || msg.includes('spend'))) ||
    msg.includes('max expense') ||
    msg.includes('most expensive') ||
    msg.includes('top expense')
  ) {
    const isThisMonth = msg.includes('this month') || msg.includes('current month');
    const dateFilter = isThisMonth ? { date: { $gte: startOfMonth, $lte: now } } : {};
    
    const topExpenses = await Expense.find({ ...userFilter, ...dateFilter }).sort({ amount: -1 }).limit(3);
    if (!topExpenses || topExpenses.length === 0) {
      return `You have not recorded any expenses ${isThisMonth ? 'this month' : 'in your ledger'} yet.`;
    }
    const highest = topExpenses[0];
    const dateStr = highest.date ? new Date(highest.date).toLocaleDateString('en-IN') : 'N/A';
    let reply = `### Highest Recorded Expense ${isThisMonth ? '(This Month)' : '(All-Time)'}\n\nYour highest expense is **${highest.description || 'Expense'}** for **${formatINR(highest.amount)}** in **${highest.category}**.\n\n• **Date**: ${dateStr}\n• **Payment Method**: ${highest.paymentMethod || 'Cash'}`;
    
    if (topExpenses.length > 1) {
      reply += `\n\n**Top ${topExpenses.length} Highest Expenses:**\n` + topExpenses.map((e, idx) => 
        `• **#${idx + 1} ${e.description || 'Expense'}**: ${formatINR(e.amount)} (${e.category} - ${new Date(e.date).toLocaleDateString('en-IN')})`
      ).join('\n');
    }
    return reply;
  }

  // 3. Lowest / Smallest Expense
  if (
    (msg.includes('lowest') && (msg.includes('expense') || msg.includes('purchase') || msg.includes('transaction') || msg.includes('spend') || msg.includes('record'))) ||
    (msg.includes('smallest') && (msg.includes('expense') || msg.includes('purchase') || msg.includes('transaction') || msg.includes('spend'))) ||
    (msg.includes('cheapest') && (msg.includes('expense') || msg.includes('purchase') || msg.includes('transaction') || msg.includes('spend'))) ||
    msg.includes('minimum expense') ||
    msg.includes('least expensive')
  ) {
    const lowestExpenses = await Expense.find(userFilter).sort({ amount: 1 }).limit(3);
    if (!lowestExpenses || lowestExpenses.length === 0) {
      return `You have not recorded any expenses in your ledger yet.`;
    }
    const lowest = lowestExpenses[0];
    const dateStr = lowest.date ? new Date(lowest.date).toLocaleDateString('en-IN') : 'N/A';
    return `### Smallest Recorded Expense\n\nYour lowest expense is **${lowest.description || 'Expense'}** for **${formatINR(lowest.amount)}** in **${lowest.category}** on ${dateStr} paid via ${lowest.paymentMethod || 'Cash'}.`;
  }

  // 4. Recent / Latest Transactions (handles typos like trasactions, trasaction, txns)
  if (
    (msg.includes('recent') && (msg.includes('trans') || msg.includes('tras') || msg.includes('expens') || msg.includes('purchas') || msg.includes('spend') || msg.includes('activity') || msg.includes('item') || msg.includes('txn'))) ||
    (msg.includes('latest') && (msg.includes('trans') || msg.includes('tras') || msg.includes('expens') || msg.includes('purchas') || msg.includes('spend') || msg.includes('item') || msg.includes('txn'))) ||
    (msg.includes('last') && (msg.includes('trans') || msg.includes('tras') || msg.includes('expens') || msg.includes('purchas') || msg.includes('txn') || msg.includes('5') || msg.includes('10') || msg.includes('spend'))) ||
    msg.includes('show my expenses') ||
    msg.includes('show expenses') ||
    msg.includes('show my latest') ||
    msg.includes('list expenses') ||
    msg.includes('my transactions') ||
    msg.includes('my trasactions') ||
    msg.includes('transaction history') ||
    msg === 'recent' ||
    msg === 'latest' ||
    msg === 'transactions' ||
    msg === 'trasactions' ||
    msg === 'my expenses' ||
    msg === 'expenses'
  ) {
    let limit = 5;
    const numMatch = msg.match(/\b(1|2|3|4|5|6|7|8|9|10|15|20)\b/);
    if (numMatch) {
      limit = parseInt(numMatch[1], 10);
    } else if (msg.includes('10')) {
      limit = 10;
    }

    const recent = await Expense.find(userFilter).sort({ date: -1 }).limit(limit);
    if (!recent || recent.length === 0) {
      return `No recent transactions found in your ledger. Click the **Add Expense** button to record your first expense.`;
    }
    const list = recent.map((e) => 
      `• **${e.description || 'Expense'}**: ${formatINR(e.amount)} — *${e.category}* (${new Date(e.date).toLocaleDateString('en-IN')}, ${e.paymentMethod || 'Cash'})`
    ).join('\n');

    return `### Latest ${recent.length} Transactions\n\n${list}`;
  }

  // 5. Active Budgets & Overages Check
  if (
    msg.includes('my budgets') ||
    msg.includes('budget status') ||
    msg.includes('list budgets') ||
    msg.includes('am i over budget') ||
    msg.includes('overspending') ||
    msg.includes('check my budget') ||
    msg.includes('budget health') ||
    msg.includes('review my active budgets') ||
    msg.includes('exceeded budget')
  ) {
    const budgets = await Budget.find(userFilter);
    if (!budgets || budgets.length === 0) {
      return `You have no active budgets configured. Go to the **Budgets** tab to set monthly spending limits for your categories (e.g. Food, Shopping, Entertainment).`;
    }

    const monthExpenses = await Expense.find({
      ...userFilter,
      date: { $gte: startOfMonth, $lte: now }
    });

    const exceeded = [];
    const nearLimit = [];
    const healthy = [];

    budgets.forEach(b => {
      const escapedCategory = b.category.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const catRegex = new RegExp(`^${escapedCategory}$`, 'i');
      const spent = monthExpenses
        .filter(e => catRegex.test(e.category || ''))
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
      const remaining = Math.max(0, b.amount - spent);
      const threshold = b.alertThreshold || 80;

      if (spent > b.amount) {
        exceeded.push(`• **${b.category}**: Spent ${formatINR(spent)} of ${formatINR(b.amount)} (**EXCEEDED by ${formatINR(spent - b.amount)}** - ${pct}%)`);
      } else if (pct >= threshold) {
        nearLimit.push(`• **${b.category}**: Spent ${formatINR(spent)} of ${formatINR(b.amount)} (**Near limit: ${pct}% used**, ${formatINR(remaining)} left)`);
      } else {
        healthy.push(`• **${b.category}**: Spent ${formatINR(spent)} of ${formatINR(b.amount)} (${pct}% used, ${formatINR(remaining)} remaining)`);
      }
    });

    let report = `### Active Budget Status (${now.toLocaleString('default', { month: 'long', year: 'numeric' })})\n\n`;
    if (exceeded.length > 0) {
      report += `**Budget Exceeded Alert:**\n${exceeded.join('\n')}\n\n`;
    }
    if (nearLimit.length > 0) {
      report += `**Warning (Near Limit):**\n${nearLimit.join('\n')}\n\n`;
    }
    if (healthy.length > 0) {
      report += `**On Track:**\n${healthy.join('\n')}\n\n`;
    }

    return report.trim();
  }

  // 6. Month-over-Month Comparison
  if (
    msg.includes('compare') ||
    msg.includes('comparison') ||
    msg.includes('vs last month') ||
    msg.includes('more than last month') ||
    msg.includes('month comparison')
  ) {
    const currExpenses = await Expense.find({ ...userFilter, date: { $gte: startOfMonth, $lte: now } });
    const prevExpenses = await Expense.find({ ...userFilter, date: { $gte: startOfPrevMonth, $lte: endOfPrevMonth } });

    const currTotal = currExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const prevTotal = prevExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const diff = currTotal - prevTotal;
    const diffPct = prevTotal > 0 ? Math.round((diff / prevTotal) * 100) : 0;

    const currMonthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    const prevMonthName = startOfPrevMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

    let status = diff > 0 
      ? `You have spent **${formatINR(diff)} (+${diffPct}%) more** in ${currMonthName} compared to ${prevMonthName}.`
      : diff < 0
      ? `Great job! You have spent **${formatINR(Math.abs(diff))} (${Math.abs(diffPct)}%) less** in ${currMonthName} compared to ${prevMonthName}.`
      : `Your spending in ${currMonthName} is identical to ${prevMonthName}.`;

    return `### Month-over-Month Spending Comparison\n\n• **${currMonthName}**: **${formatINR(currTotal)}** across ${currExpenses.length} transaction(s)\n• **${prevMonthName}**: **${formatINR(prevTotal)}** across ${prevExpenses.length} transaction(s)\n\n${status}`;
  }

  // 7. Today's Spending
  if (
    (msg.includes('today') && (msg.includes('spend') || msg.includes('spent') || msg.includes('how much') || msg.includes('total') || msg.includes('cost') || msg.includes('expense'))) ||
    msg === 'today' || msg === 'today spend' || msg === 'todays expenses'
  ) {
    const todayExpenses = await Expense.find({
      ...userFilter,
      date: { $gte: startOfToday, $lte: endOfToday }
    });

    const totalToday = todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    if (todayExpenses.length === 0) {
      return `You have not logged any expenses for **today** (${now.toLocaleDateString('en-IN')}) yet.`;
    }
    const list = todayExpenses.map(e => `• **${e.description}**: ${formatINR(e.amount)} (${e.category} - ${e.paymentMethod || 'Cash'})`).join('\n');
    return `### Today's Spending Summary\n\n• **Total Spent Today**: **${formatINR(totalToday)}** across ${todayExpenses.length} transaction(s).\n\n**Transactions:**\n${list}`;
  }

  // 8. Yesterday's Spending
  if (
    (msg.includes('yesterday') && (msg.includes('spend') || msg.includes('spent') || msg.includes('how much') || msg.includes('total') || msg.includes('cost') || msg.includes('expense'))) ||
    msg === 'yesterday' || msg === 'yesterday spend' || msg === 'yesterday expenses'
  ) {
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);

    const yesterdayExpenses = await Expense.find({
      ...userFilter,
      date: { $gte: startOfYesterday, $lte: endOfYesterday }
    });

    const totalYesterday = yesterdayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    if (yesterdayExpenses.length === 0) {
      return `You did not log any expenses for **yesterday** (${startOfYesterday.toLocaleDateString('en-IN')}).`;
    }
    const list = yesterdayExpenses.map(e => `• **${e.description}**: ${formatINR(e.amount)} (${e.category} - ${e.paymentMethod || 'Cash'})`).join('\n');
    return `### Yesterday's Spending Summary\n\n• **Total Spent Yesterday**: **${formatINR(totalYesterday)}** across ${yesterdayExpenses.length} transaction(s).\n\n**Transactions:**\n${list}`;
  }

  // 9. This Week's Spending (Past 7 Days)
  if (
    msg.includes('this week') ||
    msg.includes('weekly spend') ||
    msg.includes('spending this week') ||
    msg.includes('past 7 days') ||
    msg.includes('last 7 days')
  ) {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weekExpenses = await Expense.find({
      ...userFilter,
      date: { $gte: sevenDaysAgo }
    }).sort({ date: -1 });

    const totalWeek = weekExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    if (weekExpenses.length === 0) {
      return `You have no recorded expenses in the past 7 days.`;
    }

    const catMap = {};
    weekExpenses.forEach(e => {
      catMap[e.category] = (catMap[e.category] || 0) + (e.amount || 0);
    });

    const topWeekCats = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, amt]) => `• **${cat}**: ${formatINR(amt)}`)
      .join('\n');

    return `### Past 7 Days Spending Summary\n\n• **Total Spent (7 Days)**: **${formatINR(totalWeek)}**\n• **Transactions**: ${weekExpenses.length}\n• **Daily Average**: ${formatINR(totalWeek / 7)}\n\n**Top Categories this week:**\n${topWeekCats}`;
  }

  // 10. This Month's Spending
  if (
    msg.includes('this month') ||
    msg.includes('current month') ||
    msg === 'monthly spend' ||
    msg === 'monthly expenses' ||
    msg.includes('how much have i spent this month') ||
    msg.includes('total spend this month') ||
    msg.includes('total spending this month')
  ) {
    const monthExpenses = await Expense.find({
      ...userFilter,
      date: { $gte: startOfMonth, $lte: now }
    }).sort({ date: -1 });

    const totalMonth = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    if (monthExpenses.length === 0) {
      return `You have not recorded any expenses for **${monthName}** yet.`;
    }

    const catTotals = {};
    monthExpenses.forEach(e => {
      catTotals[e.category] = (catTotals[e.category] || 0) + (e.amount || 0);
    });

    const sortedCats = Object.entries(catTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => `• **${cat}**: ${formatINR(amt)} (${Math.round((amt / totalMonth) * 100)}%)`)
      .join('\n');

    return `### Spending for ${monthName}\n\n• **Total Spent**: **${formatINR(totalMonth)}**\n• **Transaction Count**: ${monthExpenses.length}\n• **Daily Average**: ${formatINR(totalMonth / now.getDate())}\n\n**Category Breakdown:**\n${sortedCats}`;
  }

  // 11. Last Month's Spending
  if (
    msg.includes('last month') ||
    msg.includes('previous month') ||
    msg.includes('past month')
  ) {
    const prevMonthName = startOfPrevMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
    const prevExpenses = await Expense.find({
      ...userFilter,
      date: { $gte: startOfPrevMonth, $lte: endOfPrevMonth }
    });

    const totalPrev = prevExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    if (prevExpenses.length === 0) {
      return `You had no recorded expenses logged for **${prevMonthName}**.`;
    }

    return `### Spending for ${prevMonthName}\n\n• **Total Spent**: **${formatINR(totalPrev)}**\n• **Total Transactions**: ${prevExpenses.length}\n• **Daily Average**: ${formatINR(totalPrev / endOfPrevMonth.getDate())}`;
  }

  // 12. Category-Specific Spending Queries (e.g. "how much on food", "spent on travel")
  const commonCategories = [
    'food', 'groceries', 'dining', 'restaurant', 'shopping', 'travel',
    'transport', 'entertainment', 'utilities', 'healthcare', 'health', 'medical',
    'education', 'emi', 'bills', 'investment', 'rent', 'fuel', 'movie', 'clothing'
  ];

  for (const cat of commonCategories) {
    if (
      (msg.includes(cat) && (msg.includes('spend') || msg.includes('spent') || msg.includes('how much') || msg.includes('total') || msg.includes('cost') || msg.includes('expense'))) ||
      msg === `${cat} expense` || msg === `${cat} expenses` || msg === `${cat} spend` || msg === cat
    ) {
      const isThisMonth = msg.includes('this month') || msg.includes('current month');
      const isToday = msg.includes('today');
      const isLastMonth = msg.includes('last month') || msg.includes('previous month');

      let dateFilter = {};
      let periodLabel = 'All-Time';

      if (isThisMonth) {
        dateFilter = { date: { $gte: startOfMonth, $lte: now } };
        periodLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });
      } else if (isToday) {
        dateFilter = { date: { $gte: startOfToday, $lte: endOfToday } };
        periodLabel = 'Today';
      } else if (isLastMonth) {
        dateFilter = { date: { $gte: startOfPrevMonth, $lte: endOfPrevMonth } };
        periodLabel = startOfPrevMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
      }

      const regexPattern = (cat === 'groceries' || cat === 'dining' || cat === 'restaurant' || cat === 'food')
        ? 'food|groceries|dining|restaurant'
        : (cat === 'health' || cat === 'medical' || cat === 'healthcare')
        ? 'health|medical|healthcare'
        : (cat === 'travel' || cat === 'transport' || cat === 'fuel')
        ? 'travel|transport|fuel'
        : cat;

      const catExpenses = await Expense.find({
        ...userFilter,
        ...dateFilter,
        category: { $regex: new RegExp(regexPattern, 'i') }
      }).sort({ date: -1 });

      if (!catExpenses || catExpenses.length === 0) {
        return `You have no recorded expenses under **${cat.toUpperCase()}** ${periodLabel !== 'All-Time' ? `for ${periodLabel}` : 'in your ledger'} yet.`;
      }

      const totalCat = catExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const avgCat = formatINR(totalCat / catExpenses.length);
      const recentCat = catExpenses.slice(0, 3).map(e => 
        `• **${e.description || 'Expense'}**: ${formatINR(e.amount)} (${new Date(e.date).toLocaleDateString('en-IN')}, ${e.paymentMethod || 'Cash'})`
      ).join('\n');

      return `### Spending on ${cat.toUpperCase()} (${periodLabel})\n\n• **Total Spent**: **${formatINR(totalCat)}**\n• **Transaction Count**: ${catExpenses.length}\n• **Average per Transaction**: ${avgCat}\n\n**Recent Transactions:**\n${recentCat}`;
    }
  }

  // 13. Specific Merchant / Keyword Search (e.g. Amazon, Swiggy, Zomato, Uber, Netflix, DMart)
  const commonMerchants = ['amazon', 'swiggy', 'zomato', 'uber', 'ola', 'flipkart', 'netflix', 'spotify', 'dmart', 'blinkit', 'zepto', 'myntra', 'petrol', 'starbucks'];
  for (const merchant of commonMerchants) {
    if (msg.includes(merchant)) {
      const merchantExpenses = await Expense.find({
        ...userFilter,
        description: { $regex: new RegExp(merchant, 'i') }
      }).sort({ date: -1 });

      if (merchantExpenses.length > 0) {
        const totalMerchant = merchantExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const list = merchantExpenses.slice(0, 5).map(e => 
          `• **${e.description}**: ${formatINR(e.amount)} (${new Date(e.date).toLocaleDateString('en-IN')})`
        ).join('\n');

        return `### Spending on "${merchant.toUpperCase()}"\n\n• **Total Spent**: **${formatINR(totalMerchant)}** across ${merchantExpenses.length} transaction(s).\n\n**Transactions:**\n${list}`;
      }
    }
  }

  // 14. Payment Method Breakdown (Cash, UPI, Card)
  if (
    msg.includes('payment method') ||
    msg.includes('payment mode') ||
    msg.includes('cash vs card') ||
    msg.includes('how did i pay') ||
    msg.includes('upi vs cash') ||
    msg.includes('upi spend') ||
    msg.includes('card spend') ||
    msg.includes('cash spend')
  ) {
    const allExpenses = await Expense.find(userFilter);
    if (allExpenses.length === 0) {
      return `No expenses found to calculate payment methods.`;
    }
    const methodMap = {};
    allExpenses.forEach(e => {
      const method = e.paymentMethod || 'Cash';
      methodMap[method] = (methodMap[method] || 0) + (e.amount || 0);
    });
    const total = allExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const methodList = Object.entries(methodMap)
      .sort((a, b) => b[1] - a[1])
      .map(([m, amt]) => `• **${m}**: ${formatINR(amt)} (${total > 0 ? Math.round((amt / total) * 100) : 0}%)`)
      .join('\n');

    return `### Payment Methods Breakdown\n\n${methodList}`;
  }

  // 15. Total / All-Time Spend
  if (
    msg === 'total spend' ||
    msg === 'total expenses' ||
    msg === 'all time spend' ||
    msg.includes('all time spending') ||
    msg.includes('total spending all time') ||
    msg.includes('total amount spent so far') ||
    msg.includes('lifetime spend')
  ) {
    const allExpenses = await Expense.find(userFilter);
    const total = allExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    return `### All-Time Financial Ledger Summary\n\n• **Total Spent**: **${formatINR(total)}**\n• **Total Transactions Logged**: ${allExpenses.length}\n• **Average Transaction**: ${allExpenses.length > 0 ? formatINR(total / allExpenses.length) : '₹0'}`;
  }

  // 16. Total Transaction Count
  if (
    msg.includes('how many expenses') ||
    msg.includes('how many transactions') ||
    msg.includes('total count of expenses') ||
    msg.includes('number of expenses') ||
    msg.includes('how many purchases')
  ) {
    const count = await Expense.countDocuments(userFilter);
    return `You have logged a total of **${count}** transaction(s) in your personal ledger.`;
  }

  // Not a purely factual direct DB query
  return null;
};

/**
 * Pre-defined instant responses for core financial guidance questions
 * (Instant stored responses with 0ms latency and 0 AI API usage)
 */
const tryPredefinedInstantKnowledgeBase = ({ userMessage, userName, financialContext }) => {
  const msg = userMessage.toLowerCase().trim();

  // 1. 50/30/20 Budgeting Framework
  if (
    msg.includes('50/30/20') ||
    msg.includes('50 30 20') ||
    msg.includes('50-30-20') ||
    msg.includes('fifty thirty twenty') ||
    msg.includes('budgeting rule')
  ) {
    return `### The 50/30/20 Budgeting Rule\n\nThe **50/30/20 framework** is a simple, highly effective guideline for balancing income and living expenses:\n\n• **50% Needs (Essentials)**: Rent/home loans, groceries, utility bills, transportation, and healthcare.\n• **30% Wants (Lifestyle)**: Dining out, subscriptions, shopping, entertainment, and vacations.\n• **20% Savings & Debt Repayment**: Emergency fund contributions, mutual funds/SIPs, and high-interest debt payoffs.\n\n**Quick Example:**\nIf your monthly net income is **₹50,000**:\n• Needs: ₹25,000\n• Wants: ₹15,000\n• Savings: ₹10,000\n\n*Tip: Check the **Budgets** tab to configure category caps matching this breakdown.*`;
  }

  // 2. Actionable Savings Strategies
  if (
    msg.includes('how to save money') ||
    msg.includes('savings tips') ||
    msg.includes('how can i save') ||
    msg.includes('ways to save') ||
    msg.includes('how to start saving') ||
    msg.includes('best way to save') ||
    msg.includes('cut my spending') ||
    msg.includes('boost my savings') ||
    msg.includes('ways to cut')
  ) {
    const topCat = financialContext?.categoryBreakdown?.[0]?.category || 'discretionary purchases';
    return `### Top 5 Proven Strategies to Boost Your Savings\n\n1. **Pay Yourself First**: Transfer 15–20% of your salary into a separate savings or investment account the day you get paid, before spending on flexible expenses.\n2. **Target Your Highest Outflow**: Trimming just 10% from your leading category (**${topCat}**) creates immediate surplus.\n3. **The 48-Hour Rule**: Wait 48 hours before purchasing non-essential items above ₹500 to curb impulse buys.\n4. **Audit Recurring Subscriptions**: Cancel unused streaming services, gym memberships, or app trials.\n5. **Cook at Home 2 Extra Days/Week**: Dining and takeout are typically 3x to 4x more expensive than home-cooked meals.`;
  }

  // 3. Emergency Fund Guidance
  if (
    msg.includes('emergency fund') ||
    msg.includes('emergency savings') ||
    msg.includes('rainy day fund') ||
    msg.includes('emergency buffer')
  ) {
    return `### Building an Emergency Fund\n\nAn **Emergency Fund** is a cash buffer designed to protect you from unexpected events like job transitions, medical emergencies, or urgent repairs without going into debt.\n\n• **Target Size**: 3 to 6 months of mandatory living expenses (rent, food, utilities, EMIs).\n• **Where to Keep It**: In high-liquidity accounts such as a high-yield savings account, liquid mutual funds, or short-term fixed deposits. Never lock it in volatile assets like stocks or real estate.\n• **Starter Milestone**: If starting from scratch, aim for a **₹25,000 starter buffer** first, then scale up month by month.`;
  }

  // 4. Debt Payoff Strategies (Snowball vs Avalanche)
  if (
    msg.includes('snowball') ||
    msg.includes('avalanche') ||
    msg.includes('pay off debt') ||
    msg.includes('pay debt') ||
    msg.includes('debt strategy') ||
    msg.includes('debt repayment') ||
    msg.includes('clear loans')
  ) {
    return `### Debt Repayment: Avalanche vs. Snowball\n\nBoth are proven strategies to eliminate debt methodically:\n\n• **Debt Avalanche (Mathematically Optimal)**:\n  Pay minimums on all debts, and put all surplus funds toward the debt with the **highest interest rate** (e.g. credit cards at 36-42%). Saves the most money in interest overall.\n\n• **Debt Snowball (Psychological Momentum)**:\n  Pay minimums on all debts, and throw all extra cash at the **smallest balance** regardless of interest rate. Once cleared, roll that payment into the next smallest. Creates fast motivational wins.\n\n*Recommendation: Use Avalanche for high-interest credit card debt, and Snowball if you need quick psychological wins.*`;
  }

  // 5. Beginner Investment Fundamentals & SIPs
  if (
    msg.includes('how to invest') ||
    msg.includes('investing basics') ||
    msg.includes('where to invest') ||
    msg.includes('start investing') ||
    msg.includes('sip basics') ||
    msg.includes('investment advice') ||
    msg.includes('mutual fund basics')
  ) {
    return `### Beginner Investing Fundamentals\n\nKey rules for building long-term wealth:\n\n1. **Clear High-Interest Debt First**: Pay off credit cards or personal loans (15%+ interest) before investing in markets.\n2. **Emergency Buffer**: Ensure you have 3 months of emergency expenses saved.\n3. **Index Funds & Mutual Funds (SIP)**: Start an automated monthly SIP in broad-market index funds (Nifty 50 / S&P 500) for disciplined compounding.\n4. **Diversification**: Spread allocations across equities, debt/PPF, and gold based on your risk appetite.\n5. **Time in the Market > Timing the Market**: Staying consistently invested over 5-10+ years yields far better returns than trying to predict short-term market tops and bottoms.`;
  }

  // 6. Credit Score & Credit Card Discipline
  if (
    msg.includes('credit score') ||
    msg.includes('cibil score') ||
    msg.includes('credit card tips') ||
    msg.includes('improve credit score') ||
    msg.includes('credit card discipline')
  ) {
    return `### How to Maintain an Excellent Credit Score (750+)\n\n• **Pay Full Statement Balances On Time**: Always pay the total amount due before the due date—never just the minimum due.\n• **Keep Credit Utilization Under 30%**: If your total card limit is ₹1,00,000, keep monthly outstanding balance below ₹30,000.\n• **Maintain Oldest Credit Accounts**: Longer credit history improves your score.\n• **Limit Hard Inquiries**: Avoid applying for multiple credit cards or personal loans within a short window.`;
  }

  // 7. Needs vs Wants Clarification
  if (
    msg.includes('needs vs wants') ||
    msg.includes('needs and wants') ||
    msg.includes('essential vs non essential') ||
    msg.includes('discretionary spending')
  ) {
    return `### Understanding Needs vs. Wants\n\n• **Needs (Non-Negotiable Essentials)**:\n  Expenses required for basic survival, safety, and employment. Examples: Rent/home EMI, groceries, basic utilities (electricity, water), health insurance, essential medicine, and daily work commute.\n\n• **Wants (Lifestyle & Upgrades)**:\n  Purchases that improve comfort or entertainment but are not strictly required. Examples: Restaurant dining, premium coffee, streaming subscriptions, new gadgets, designer clothes, and luxury vacations.\n\n*Rule of Thumb: If removing an expense causes immediate harm to your health, shelter, or job, it is a Need. Otherwise, it is a Want.*`;
  }

  // 8. Tax Saving Strategies (Section 80C, Health Insurance, NPS)
  if (
    msg.includes('tax saving') ||
    msg.includes('save tax') ||
    msg.includes('80c') ||
    msg.includes('reduce taxes') ||
    msg.includes('tax tips')
  ) {
    return `### Key Tax Saving Avenues (India)\n\n• **Section 80C (Up to ₹1.5 Lakh)**: EPF, PPF (Public Provident Fund), ELSS (Tax-saving mutual funds), and NPS.\n• **Section 80D (Health Insurance)**: Deductions up to ₹25,000 for self/family health insurance premiums, plus up to ₹50,000 for senior citizen parents.\n• **Section 80CCD(1B) (NPS Extra)**: Additional exclusive deduction of up to ₹50,000 for National Pension System investments.\n• **Home Loan Interest (Section 24b)**: Up to ₹2,00,000 on home loan interest payments for self-occupied properties.`;
  }

  // 9. Rule of 72 & The Power of Compounding
  if (
    msg.includes('rule of 72') ||
    msg.includes('power of compounding') ||
    msg.includes('double my money') ||
    msg.includes('compounding')
  ) {
    return `### The Rule of 72 & Compounding\n\nThe **Rule of 72** estimates how many years it will take to double your invested money at a fixed annual rate of return:\n\n$$\\text{Years to Double} = \\frac{72}{\\text{Annual Return (\\%)}}$$\n\n**Examples:**\n• At **6%** (Fixed Deposit / PPF): $72 / 6 = $ **12 years** to double.\n• At **12%** (Equity Mutual Funds / Index Funds): $72 / 12 = $ **6 years** to double.\n• At **15%** (High-Growth Equities): $72 / 15 = $ **4.8 years** to double.\n\n*Key Takeaway: Starting 5 years earlier can double your final retirement corpus!*`;
  }

  // 10. Inflation & Purchasing Power
  if (
    msg.includes('inflation') ||
    msg.includes('cost of living') ||
    msg.includes('beat inflation')
  ) {
    return `### Inflation & Protecting Your Purchasing Power\n\n**Inflation** is the gradual decrease in purchasing power over time. If inflation is 6%, an item costing **₹1,00,000** today will cost **₹1,06,000** next year.\n\n• **Savings Accounts (~3-4%)**: Lose purchasing power after inflation.\n• **Fixed Deposits (~6.5-7%)**: Barely match post-tax inflation.\n• **Equities / Index Funds (~12-14%)**: Generate positive real returns (beating inflation by 6-8% annually).\n\n*Strategy: Keep only emergency cash in bank deposits; invest long-term funds in inflation-beating assets.*`;
  }

  // 11. App Features & Help Guide
  if (
    msg.includes('how to use this app') ||
    msg.includes('how to add expense') ||
    msg.includes('app features') ||
    msg.includes('what can you do') ||
    msg.includes('help me with the app') ||
    msg === 'help' ||
    msg.includes('features of this app')
  ) {
    return `### Smart Expense Tracker Features Guide\n\n• **Personal Dashboard**: Real-time spending charts, category distributions, and daily averages.\n• **Expenses Ledger**: Log transactions with payment methods (Cash, UPI, Card), dates, and notes.\n• **Budgets & Alerts**: Set monthly category spending caps with automatic overage warnings.\n• **Shared Groups & Splits**: Create trip or roommate groups, split bills (equal or custom), track who owes who, and settle debts.\n• **Bills & Receipts Vault**: Upload and store PDF/image invoices for easy reference.\n• **Analytics & Reports**: Monthly trend lines, payment method breakdowns, and CSV export/download.\n• **AI Financial Copilot**: Live personal finance assistant answering queries directly from your ledger.`;
  }

  // Not a pre-defined instant knowledge question
  return null;
};


/**
 * Generates an interactive conversational response via Instant DB, Instant Stored Knowledge, or Gemini AI
 */
const generateCopilotChatResponse = async ({ userId, userName, userMessage, conversationHistory = [] }) => {
  // Step 1: Check if this factual question can be directly answered from the Database (0ms latency, exact DB query)
  const directDbReply = await tryDirectDatabaseQuery({ userId, userName, userMessage });
  if (directDbReply) {
    return directDbReply;
  }

  // Step 2: Check if this is a pre-defined financial knowledge/guidance question (Instant curated response)
  const instantStoredReply = tryPredefinedInstantKnowledgeBase({ userMessage, userName });
  if (instantStoredReply) {
    return instantStoredReply;
  }

  // Step 3: For complex, open-ended, analytical, or unique questions, route to Gemini AI
  const financialContext = await buildUserFinancialContext(userId);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    // Return intelligent contextual fallback if API key is not configured yet
    return generateFallbackResponse(userMessage, financialContext, userName);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `You are "Financial Copilot", an elite, empathetic, and highly analytical AI personal financial advisor embedded directly into the Smart Expense Tracker application.
Your goal is to help the user, ${userName || 'the user'}, understand their spending habits, optimize their budgets, find realistic ways to save money, analyze their financial trends, and make informed financial decisions.

USER'S LIVE REAL-TIME FINANCIAL CONTEXT:
${JSON.stringify(financialContext, null, 2)}

GUIDELINES:
1. Always base your advice and figures directly on the user's live financial data above when relevant.
2. Be encouraging, clear, and proactive with concrete next steps.
3. Use clean markdown formatting: format all currency amounts in Indian Rupees (₹, e.g. ₹500, ₹1,200), use bullet points, and highlight warnings if budgets are exceeded.
4. Do not use emojis anywhere in your response under any circumstances.
5. If the user asks a generic finance question (like investing basics or 50/30/20 rule), provide a concise expert explanation tailored to their monthly spend level.
6. Keep answers concise, readable, and engaging. Never give dangerous or guaranteed speculative stock advice.`;

    // Format chat messages
    const formattedHistory = conversationHistory.slice(-8).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const chat = ai.chats.create({
      model: 'gemini-3.6-flash',
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        maxOutputTokens: 1000
      },
      history: formattedHistory
    });

    const result = await chat.sendMessage({ message: userMessage });
    return result.text;
  } catch (err) {
    console.error('Gemini API Error:', err);
    // Graceful fallback on API error
    return generateFallbackResponse(userMessage, financialContext, userName);
  }
};

/**
 * Generates automated smart financial health score and insights
 */
const generateFinancialInsights = async (userId, userName) => {
  const financialContext = await buildUserFinancialContext(userId);
  if (!financialContext) {
    return {
      healthScore: 75,
      summary: 'Start adding expenses to unlock personalized AI financial insights.',
      recommendations: ['Log your daily expenses regularly', 'Set up category budgets'],
      keyHighlights: []
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'your_gemini_api_key_here' && GoogleGenAI) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Based on this user financial snapshot, calculate a Financial Health Score (0-100) and provide 3 concise, highly actionable recommendations with potential savings in INR (₹xx, e.g. ₹500/mo) and 2 key highlights. Do not use emojis anywhere.
Context:
${JSON.stringify(financialContext, null, 2)}

Return strictly valid JSON in this exact structure:
{
  "healthScore": 82,
  "healthStatus": "Good" | "Needs Attention" | "Excellent" | "Fair",
  "summary": "One sentence summary of this month's financial posture.",
  "keyHighlights": ["Highlight 1", "Highlight 2"],
  "recommendations": [
    { "title": "...", "description": "...", "potentialSavings": "₹xx" }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.4
        }
      });

      return JSON.parse(response.text);
    } catch (e) {
      console.error('Gemini Insights generation failed, using calculated metrics:', e);
    }
  }

  // Algorithmic fallback insight calculation
  return calculateDeterministicInsights(financialContext, userName);
};

/**
 * Intelligent deterministic rule-based analysis (fallback & offline mode)
 */
const calculateDeterministicInsights = (ctx, userName) => {
  let score = 85;
  const highlights = [];
  const recommendations = [];

  const exceededBudgets = ctx.budgetStatus.filter(b => b.isExceeded);
  if (exceededBudgets.length > 0) {
    score -= exceededBudgets.length * 12;
    highlights.push(`Alert: ${exceededBudgets.length} budget limit${exceededBudgets.length > 1 ? 's' : ''} exceeded this month (${exceededBudgets.map(b => b.category).join(', ')}).`);
  } else if (ctx.budgetStatus.length > 0) {
    highlights.push(`All ${ctx.budgetStatus.length} category budgets are within limits!`);
    score += 5;
  }

  if (ctx.monthOverMonthChangePct > 20) {
    score -= 8;
    highlights.push(`Spending is +${ctx.monthOverMonthChangePct}% higher than last month's total at this stage.`);
  } else if (ctx.monthOverMonthChangePct < -10) {
    score += 8;
    highlights.push(`Great control! Spending is ${Math.abs(ctx.monthOverMonthChangePct)}% lower compared to last month.`);
  }

  if (ctx.categoryBreakdown.length > 0) {
    const topCat = ctx.categoryBreakdown[0];
    if (topCat.percentage > 40) {
      recommendations.push({
        title: `Diversify & Trim ${topCat.category}`,
        description: `${topCat.category} represents ${topCat.percentage}% of all your spending this month (${formatINR(topCat.amount)}). Reducing this by 15% would save ${formatINR(Math.round(topCat.amount * 0.15))}.`,
        potentialSavings: `${formatINR(Math.round(topCat.amount * 0.15))}/mo`
      });
    }
  }

  if (ctx.budgetStatus.length === 0) {
    recommendations.push({
      title: 'Set Monthly Category Budgets',
      description: 'You currently have no active budget caps. Setting budgets for Food, Shopping, and Entertainment prevents unexpected overspending.',
      potentialSavings: 'Variable'
    });
  }

  recommendations.push({
    title: 'Review Recurring & Discretionary Outflows',
    description: 'Track small recurring transactions and consider cooking at home twice more per week to build emergency savings.',
    potentialSavings: '₹800 - ₹1,500/mo'
  });

  score = Math.max(30, Math.min(98, score));
  let healthStatus = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 50 ? 'Fair' : 'Needs Attention';

  return {
    healthScore: score,
    healthStatus,
    summary: `Your total spending this month is ${formatINR(ctx.currentTotal)} across ${ctx.transactionCountThisMonth} transactions.`,
    keyHighlights: highlights.length > 0 ? highlights : ['Regular expense tracking active.'],
    recommendations
  };
};

/**
 * Intelligent deterministic conversational responses when live API key is pending
 */
const generateFallbackResponse = (userMessage, ctx, userName) => {
  const msg = userMessage.toLowerCase();

  if (msg.includes('overspend') || msg.includes('highest') || msg.includes('category') || msg.includes('where did i spend')) {
    if (!ctx || ctx.categoryBreakdown.length === 0) {
      return `Hi ${userName || 'there'}! You do not have any logged expenses this month yet. Once you start recording expenses, I will analyze your top spending categories right here!`;
    }
    const topCat = ctx.categoryBreakdown[0];
    const topCatsList = ctx.categoryBreakdown.slice(0, 3).map(c => `• **${c.category}**: ${formatINR(c.amount)} (${c.percentage}% of total)`).join('\n');
    return `### Monthly Spending Breakdown\n\nYour highest spending category this month is **${topCat.category}** at **${formatINR(topCat.amount)}** (${topCat.percentage}% of your total ${formatINR(ctx.currentTotal)} spent).\n\n**Top Categories:**\n${topCatsList}\n\n*Tip: Consider setting a monthly limit on ${topCat.category} in the Budgets tab to keep it controlled.*`;
  }

  if (msg.includes('save') || msg.includes('cut') || msg.includes('tips') || msg.includes('advice')) {
    const topCat = ctx?.categoryBreakdown?.[0]?.category || 'discretionary purchases';
    return `### Smart Savings Recommendations\n\nHere are 3 tailored strategies based on your current spending of **${formatINR(ctx?.currentTotal || 0)}**:\n\n1. **Target ${topCat}**: Trimming just 10-15% from your leading category can easily yield **₹500 - ₹1,200** in monthly savings.\n2. **The 48-Hour Rule**: For non-essential purchases over ₹500, wait 48 hours before buying.\n3. **Automate Micro-Savings**: Transfer a set percentage right after payday before allocating to flexible spending.`;
  }

  if (msg.includes('budget') || msg.includes('limit') || msg.includes('status')) {
    if (!ctx || ctx.budgetStatus.length === 0) {
      return `You have not configured any category budgets for **${ctx?.currentMonth || 'this month'}** yet! Head over to the **Budgets** tab to set monthly limits for Food, Entertainment, and Shopping.`;
    }
    const exceeded = ctx.budgetStatus.filter(b => b.isExceeded);
    if (exceeded.length > 0) {
      return `**Budget Alert**: You have exceeded ${exceeded.length} budget limit(s):\n\n` +
        exceeded.map(b => `• **${b.category}**: Spent ${formatINR(b.spent)} of ${formatINR(b.budget)} (${b.percentageUsed}%)`).join('\n') +
        `\n\nI suggest dialing back discretionary spend in these categories for the rest of the month!`;
    }
    return `**All Budgets Healthy**: All your active budgets are currently on track! Keep up the disciplined spending.`;
  }

  return `### Financial Overview for ${ctx?.currentMonth || 'This Month'}\n\n• **Total Spent**: ${formatINR(ctx?.currentTotal || 0)}\n• **Transactions**: ${ctx?.transactionCountThisMonth || 0}\n• **Month-over-Month Change**: ${ctx?.monthOverMonthChangePct >= 0 ? '+' : ''}${ctx?.monthOverMonthChangePct || 0}%\n• **Top Category**: ${ctx?.categoryBreakdown?.[0]?.category || 'None'} (${formatINR(ctx?.categoryBreakdown?.[0]?.amount || 0)})\n\nHow else can I assist with your financial goals today? You can ask me about **savings opportunities**, **budget reviews**, or **category breakdowns**!`;
};

module.exports = {
  buildUserFinancialContext,
  generateCopilotChatResponse,
  generateFinancialInsights,
  tryDirectDatabaseQuery,
  tryPredefinedInstantKnowledgeBase
};
