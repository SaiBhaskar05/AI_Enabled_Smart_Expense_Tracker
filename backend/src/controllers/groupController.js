const Group = require('../models/Group');
const GroupExpense = require('../models/GroupExpense');
const GroupSettlement = require('../models/GroupSettlement');
const Bill = require('../models/Bill');
const Expense = require('../models/Expense');
const User = require('../models/User');
const {
  sendEmail,
  generateGroupSummaryEmail,
  generateSettlementReminderEmail
} = require('../services/emailService');

// @desc    Create a new group / trip
// @route   POST /api/groups
// Helper to calculate enriched group stats (spending, budgets, category breakdown)
const enrichGroupData = async (group) => {
  const expensesAgg = await GroupExpense.aggregate([
    { $match: { groupId: group._id } },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }
  ]);

  let totalSpent = 0;
  const categorySpend = {};
  expensesAgg.forEach(c => {
    const catName = (c._id || 'General').trim();
    totalSpent += c.total;
    categorySpend[catName] = (categorySpend[catName] || 0) + c.total;
  });

  const definedCategoryBudgets = group.categoryBudgets || [];
  const seenCategories = new Set();
  let totalCategoryBudgets = 0;

  const enrichedCategoryBudgets = definedCategoryBudgets.map(cb => {
    const cat = (cb.category || '').trim();
    seenCategories.add(cat.toLowerCase());
    const budgetAmount = Number(cb.amount) || 0;
    totalCategoryBudgets += budgetAmount;
    const spent = categorySpend[cat] !== undefined ? categorySpend[cat] : (categorySpend[cb.category] || 0);
    const percentage = budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0;
    const remaining = Math.max(0, budgetAmount - spent);
    const overspent = Math.max(0, spent - budgetAmount);

    return {
      category: cat,
      budget: budgetAmount,
      spent,
      remaining,
      overspent,
      percentage,
      isOverBudget: budgetAmount > 0 && spent > budgetAmount,
      isUnbudgeted: false
    };
  });

  // Also include any categories with expenses that don't have a defined budget
  Object.keys(categorySpend).forEach(catName => {
    if (!seenCategories.has(catName.toLowerCase()) && categorySpend[catName] > 0) {
      enrichedCategoryBudgets.push({
        category: catName,
        budget: 0,
        spent: categorySpend[catName],
        remaining: 0,
        overspent: categorySpend[catName],
        percentage: 0,
        isOverBudget: false,
        isUnbudgeted: true
      });
    }
  });

  const gObj = group.toObject ? group.toObject() : { ...group };
  gObj.totalSpent = totalSpent;
  gObj.remainingBudget = Math.max(0, (group.totalBudget || 0) - totalSpent);
  gObj.totalCategoryBudgets = totalCategoryBudgets;
  gObj.categorySpendBreakdown = enrichedCategoryBudgets;

  return gObj;
};

// @desc    Create a new group / trip
// @route   POST /api/groups
// @access  Private
exports.createGroup = async (req, res, next) => {
  try {
    const {
      name,
      description,
      type,
      currency,
      totalBudget,
      categoryBudgets,
      startDate,
      endDate
    } = req.body;

    let cleanedCategoryBudgets = [];
    if (Array.isArray(categoryBudgets)) {
      cleanedCategoryBudgets = categoryBudgets
        .filter(cb => cb && cb.category && cb.category.trim() && Number(cb.amount) >= 0)
        .map(cb => ({
          category: cb.category.trim(),
          amount: Number(cb.amount) || 0
        }));
    }

    const group = new Group({
      name,
      description,
      type: type || 'Trip',
      currency: currency || 'INR',
      totalBudget: Number(totalBudget) || 0,
      categoryBudgets: cleanedCategoryBudgets,
      startDate: startDate || null,
      endDate: endDate || null,
      createdBy: req.user._id,
      members: [
        {
          user: req.user._id,
          role: 'admin',
          joinedAt: new Date()
        }
      ]
    });

    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate('members.user', 'name email avatar')
      .populate('createdBy', 'name email');

    const enriched = await enrichGroupData(populatedGroup);

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: { group: enriched }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all groups the logged-in user is a member of
// @route   GET /api/groups
// @access  Private
exports.getUserGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({
      'members.user': req.user._id,
      archived: { $ne: true }
    })
      .populate('members.user', 'name email avatar')
      .populate('createdBy', 'name email')
      .sort({ updatedAt: -1 });

    // Aggregate spend per group
    const groupIds = groups.map(g => g._id);
    const expensesAgg = await GroupExpense.aggregate([
      { $match: { groupId: { $in: groupIds } } },
      { $group: { _id: '$groupId', totalSpent: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    const expenseMap = {};
    expensesAgg.forEach(item => {
      expenseMap[item._id.toString()] = {
        totalSpent: item.totalSpent,
        count: item.count
      };
    });

    const enrichedGroups = groups.map(g => {
      const gObj = g.toObject();
      const stats = expenseMap[g._id.toString()] || { totalSpent: 0, count: 0 };
      gObj.totalSpent = stats.totalSpent;
      gObj.expenseCount = stats.count;
      gObj.remainingBudget = Math.max(0, (g.totalBudget || 0) - stats.totalSpent);
      return gObj;
    });

    res.status(200).json({
      success: true,
      data: { groups: enrichedGroups }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get group details by ID
// @route   GET /api/groups/:id
// @access  Private
exports.getGroupDetails = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members.user', 'name email avatar')
      .populate('createdBy', 'name email');

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isMember = group.members.some(m => m.user?._id?.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this group' });
    }

    const enriched = await enrichGroupData(group);

    res.status(200).json({
      success: true,
      data: { group: enriched }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update group details / budgets
// @route   PUT /api/groups/:id
// @access  Private (Admin only)
exports.updateGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const member = group.members.find(m => m.user.toString() === req.user._id.toString());
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only group admins can update settings' });
    }

    const {
      name,
      description,
      type,
      currency,
      totalBudget,
      categoryBudgets,
      startDate,
      endDate
    } = req.body;

    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (type) group.type = type;
    if (currency) group.currency = currency;
    if (totalBudget !== undefined) group.totalBudget = Math.max(0, Number(totalBudget) || 0);
    
    if (Array.isArray(categoryBudgets)) {
      group.categoryBudgets = categoryBudgets
        .filter(cb => cb && cb.category && cb.category.trim() && Number(cb.amount) >= 0)
        .map(cb => ({
          category: cb.category.trim(),
          amount: Number(cb.amount) || 0
        }));
    }

    if (startDate !== undefined) group.startDate = startDate;
    if (endDate !== undefined) group.endDate = endDate;

    await group.save();

    const updated = await Group.findById(group._id)
      .populate('members.user', 'name email avatar')
      .populate('createdBy', 'name email');

    const enriched = await enrichGroupData(updated);

    res.status(200).json({
      success: true,
      message: 'Group updated successfully',
      data: { group: enriched }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete group
// @route   DELETE /api/groups/:id
// @access  Private (Admin only)
exports.deleteGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isCreator = group.createdBy?.toString() === req.user._id.toString();
    const member = group.members.find(m => m.user?.toString() === req.user._id.toString());
    const isAdmin = isCreator || (member && member.role === 'admin');

    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Only group organizers / admins can delete this group' });
    }

    await Promise.all([
      Group.findByIdAndDelete(group._id),
      GroupExpense.deleteMany({ groupId: group._id }),
      GroupSettlement.deleteMany({ groupId: group._id }),
      Bill.deleteMany({ groupId: group._id })
    ]);

    res.status(200).json({
      success: true,
      message: `Group "${group.name}" and all associated expenses, settlements, and bills have been permanently deleted.`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Join group by invite code
// @route   POST /api/groups/join
// @access  Private
exports.joinGroupByCode = async (req, res, next) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) {
      return res.status(400).json({ success: false, message: 'Invite code is required' });
    }

    const cleanCode = inviteCode.trim().toUpperCase();
    const group = await Group.findOne({ inviteCode: cleanCode });

    if (!group) {
      return res.status(404).json({ success: false, message: 'Invalid invite code. No group found.' });
    }

    const alreadyMember = group.members.some(m => m.user.toString() === req.user._id.toString());
    if (alreadyMember) {
      return res.status(200).json({
        success: true,
        message: 'You are already a member of this group',
        data: { group }
      });
    }

    group.members.push({
      user: req.user._id,
      role: 'member',
      joinedAt: new Date()
    });

    await group.save();

    const updated = await Group.findById(group._id)
      .populate('members.user', 'name email avatar')
      .populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      message: `Joined "${group.name}" successfully!`,
      data: { group: updated }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add member by email
// @route   POST /api/groups/:id/members
// @access  Private (Member / Admin)
exports.addMemberByEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isMember = group.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const targetUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User with this email not found in Smart Tracker' });
    }

    const alreadyMember = group.members.some(m => m.user.toString() === targetUser._id.toString());
    if (alreadyMember) {
      return res.status(400).json({ success: false, message: 'User is already a member of this group' });
    }

    group.members.push({
      user: targetUser._id,
      role: 'member',
      joinedAt: new Date()
    });

    await group.save();

    const updated = await Group.findById(group._id)
      .populate('members.user', 'name email avatar')
      .populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      message: `${targetUser.name} added to the group!`,
      data: { group: updated }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove member from group / Leave group
// @route   DELETE /api/groups/:id/members/:userId
// @access  Private
exports.removeMember = async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isSelf = userId === req.user._id.toString();
    const callerMember = group.members.find(m => m.user.toString() === req.user._id.toString());

    if (!callerMember) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!isSelf && callerMember.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can remove other members' });
    }

    // If admin is leaving and is the only admin, assign next member as admin
    group.members = group.members.filter(m => m.user.toString() !== userId);
    const hasAdmin = group.members.some(m => m.role === 'admin');
    if (!hasAdmin && group.members.length > 0) {
      group.members[0].role = 'admin';
    }

    await group.save();

    res.status(200).json({
      success: true,
      message: isSelf ? 'You have left the group' : 'Member removed'
    });
  } catch (error) {
    next(error);
  }
};

// ─── Group Expenses ───────────────────────────────────────────────

// @desc    Add an expense to a group
// @route   POST /api/groups/:id/expenses
// @access  Private
exports.addGroupExpense = async (req, res, next) => {
  try {
    const {
      description,
      amount,
      category,
      paidBy,
      date,
      splitType,
      splits,
      notes
    } = req.body;

    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isMember = group.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    const payerId = paidBy || req.user._id;

    // Calculate splits
    let finalSplits = [];
    const memberIds = group.members.map(m => m.user.toString());

    if (splitType === 'exact' && Array.isArray(splits) && splits.length > 0) {
      finalSplits = splits.map(s => ({
        user: s.user,
        amount: Number(s.amount) || 0,
        percentage: Number(s.amount) && numAmount ? (Number(s.amount) / numAmount) * 100 : 0
      }));
    } else if (Array.isArray(splits) && splits.length > 0) {
      // Split equally among selected members
      const selectedUsers = splits.map(s => (s.user ? s.user.toString() : s.toString()));
      const perPerson = Math.round((numAmount / selectedUsers.length) * 100) / 100;
      finalSplits = selectedUsers.map((uId, idx) => ({
        user: uId,
        amount: idx === selectedUsers.length - 1 ? numAmount - (perPerson * (selectedUsers.length - 1)) : perPerson,
        percentage: 100 / selectedUsers.length
      }));
    } else {
      // Default: Split equally among all group members
      const perPerson = Math.round((numAmount / memberIds.length) * 100) / 100;
      finalSplits = memberIds.map((uId, idx) => ({
        user: uId,
        amount: idx === memberIds.length - 1 ? numAmount - (perPerson * (memberIds.length - 1)) : perPerson,
        percentage: 100 / memberIds.length
      }));
    }

    const groupExpense = new GroupExpense({
      groupId: group._id,
      description,
      amount: numAmount,
      category: category || 'General',
      paidBy: payerId,
      date: date || new Date(),
      splitType: splitType || 'equal',
      splits: finalSplits,
      notes: notes || '',
      createdBy: req.user._id
    });

    await groupExpense.save();

    const populated = await GroupExpense.findById(groupExpense._id)
      .populate('paidBy', 'name email avatar')
      .populate('splits.user', 'name email avatar')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Group expense added successfully',
      data: { expense: populated }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get group expenses
// @route   GET /api/groups/:id/expenses
// @access  Private
exports.getGroupExpenses = async (req, res, next) => {
  try {
    const { category, paidBy, limit = 100 } = req.query;

    const query = { groupId: req.params.id };
    if (category && category !== 'all') query.category = category;
    if (paidBy && paidBy !== 'all') query.paidBy = paidBy;

    const expenses = await GroupExpense.find(query)
      .populate('paidBy', 'name email avatar')
      .populate('splits.user', 'name email avatar')
      .sort({ date: -1, createdAt: -1 })
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      data: { expenses }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete group expense
// @route   DELETE /api/groups/:id/expenses/:expenseId
// @access  Private
exports.deleteGroupExpense = async (req, res, next) => {
  try {
    const expense = await GroupExpense.findOne({
      _id: req.params.expenseId,
      groupId: req.params.id
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    await GroupExpense.findByIdAndDelete(expense._id);

    res.status(200).json({
      success: true,
      message: 'Expense removed from group'
    });
  } catch (error) {
    next(error);
  }
};

// ─── Settlements & Debt Matrix ─────────────────────────────────────

// @desc    Record a settlement payment between 2 members
// @route   POST /api/groups/:id/settle
// @access  Private
exports.recordSettlement = async (req, res, next) => {
  try {
    const { toUser, fromUser, amount, paymentMethod, notes } = req.body;
    const numAmount = Number(amount);

    if (!toUser || !numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Recipient and valid amount required' });
    }

    const payer = fromUser || req.user._id;

    const settlement = new GroupSettlement({
      groupId: req.params.id,
      fromUser: payer,
      toUser,
      amount: numAmount,
      paymentMethod: paymentMethod || 'UPI',
      notes: notes || '',
      settledBy: req.user._id
    });

    await settlement.save();

    const populated = await GroupSettlement.findById(settlement._id)
      .populate('fromUser', 'name email avatar')
      .populate('toUser', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Payment recorded and settled successfully!',
      data: { settlement: populated }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get settlements history
// @route   GET /api/groups/:id/settlements
// @access  Private
exports.getGroupSettlements = async (req, res, next) => {
  try {
    const settlements = await GroupSettlement.find({ groupId: req.params.id })
      .populate('fromUser', 'name email avatar')
      .populate('toUser', 'name email avatar')
      .sort({ date: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { settlements }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Calculate Net Balances & "Who Owes Who" Simplified Debt Matrix
// @route   GET /api/groups/:id/balances
// @access  Private
exports.getGroupBalances = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members.user', 'name email avatar');

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const [expenses, settlements] = await Promise.all([
      GroupExpense.find({ groupId: group._id }),
      GroupSettlement.find({ groupId: group._id })
    ]);

    // Track total paid, total share consumed, settlements given/received for every member
    const memberStats = {};
    group.members.forEach(m => {
      if (m.user) {
        memberStats[m.user._id.toString()] = {
          user: m.user,
          totalPaid: 0,
          totalShare: 0,
          settledPaid: 0,
          settledReceived: 0,
          netBalance: 0 // positive = is owed money, negative = owes money
        };
      }
    });

    // 1. Process Expenses
    expenses.forEach(exp => {
      const payerId = exp.paidBy.toString();
      if (memberStats[payerId]) {
        memberStats[payerId].totalPaid += exp.amount;
      }

      (exp.splits || []).forEach(split => {
        const splitUserId = split.user.toString();
        if (memberStats[splitUserId]) {
          memberStats[splitUserId].totalShare += split.amount;
        }
      });
    });

    // 2. Process Settlements
    settlements.forEach(st => {
      const fromId = st.fromUser.toString();
      const toId = st.toUser.toString();
      if (memberStats[fromId]) {
        memberStats[fromId].settledPaid += st.amount;
      }
      if (memberStats[toId]) {
        memberStats[toId].settledReceived += st.amount;
      }
    });

    // 3. Compute Net Balance for each member
    // Net = (totalPaid - totalShare) + settledPaid - settledReceived
    const balancesList = Object.values(memberStats).map(st => {
      const net = (st.totalPaid - st.totalShare) + st.settledPaid - st.settledReceived;
      st.netBalance = Math.round(net * 100) / 100;
      return st;
    });

    // 4. Compute Simplified Pairwise Debts ("Who owes who how much")
    // Greedy balance clearing algorithm
    const debtors = []; // owes money (negative net)
    const creditors = []; // owed money (positive net)

    balancesList.forEach(m => {
      if (m.netBalance < -0.01) {
        debtors.push({ user: m.user, amount: Math.abs(m.netBalance) });
      } else if (m.netBalance > 0.01) {
        creditors.push({ user: m.user, amount: m.netBalance });
      }
    });

    // Sort descending
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const simplifiedDebts = [];
    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];
      const settleAmount = Math.min(debtor.amount, creditor.amount);

      if (settleAmount > 0.01) {
        simplifiedDebts.push({
          fromUser: debtor.user,
          toUser: creditor.user,
          amount: Math.round(settleAmount * 100) / 100
        });
      }

      debtor.amount -= settleAmount;
      creditor.amount -= settleAmount;

      if (debtor.amount <= 0.01) dIdx++;
      if (creditor.amount <= 0.01) cIdx++;
    }

    // User's personal net status in this group
    const myStats = memberStats[req.user._id.toString()] || null;

    res.status(200).json({
      success: true,
      data: {
        memberBalances: balancesList,
        simplifiedDebts,
        myStats
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send Group Summary Email to all members or specified email
// @route   POST /api/groups/:id/email-summary
// @access  Private
exports.sendGroupSummaryEmail = async (req, res, next) => {
  try {
    const { targetEmail, sendToAll = false } = req.body;
    const group = await Group.findById(req.params.id)
      .populate('members.user', 'name email avatar');

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isMember = group.members.some(m => m.user?._id?.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not authorized to send reports for this group' });
    }

    const [expenses, settlements] = await Promise.all([
      GroupExpense.find({ groupId: group._id })
        .populate('paidBy', 'name email avatar')
        .sort({ date: -1, createdAt: -1 }),
      GroupSettlement.find({ groupId: group._id })
    ]);

    // Compute balances & simplified debts
    const memberStats = {};
    group.members.forEach(m => {
      if (m.user) {
        memberStats[m.user._id.toString()] = {
          user: m.user,
          totalPaid: 0,
          totalShare: 0,
          settledPaid: 0,
          settledReceived: 0,
          netBalance: 0
        };
      }
    });

    expenses.forEach(exp => {
      const payerId = exp.paidBy?._id ? exp.paidBy._id.toString() : exp.paidBy?.toString();
      if (payerId && memberStats[payerId]) {
        memberStats[payerId].totalPaid += exp.amount;
      }
      (exp.splits || []).forEach(split => {
        const splitUserId = split.user?.toString();
        if (splitUserId && memberStats[splitUserId]) {
          memberStats[splitUserId].totalShare += split.amount;
        }
      });
    });

    settlements.forEach(st => {
      const fromId = st.fromUser?.toString();
      const toId = st.toUser?.toString();
      if (fromId && memberStats[fromId]) memberStats[fromId].settledPaid += st.amount;
      if (toId && memberStats[toId]) memberStats[toId].settledReceived += st.amount;
    });

    const balancesList = Object.values(memberStats).map(st => {
      const net = (st.totalPaid - st.totalShare) + st.settledPaid - st.settledReceived;
      st.netBalance = Math.round(net * 100) / 100;
      return st;
    });

    const debtors = [];
    const creditors = [];
    balancesList.forEach(m => {
      if (m.netBalance < -0.01) debtors.push({ user: m.user, amount: Math.abs(m.netBalance) });
      else if (m.netBalance > 0.01) creditors.push({ user: m.user, amount: m.netBalance });
    });
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const simplifiedDebts = [];
    let dIdx = 0, cIdx = 0;
    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];
      const settleAmount = Math.min(debtor.amount, creditor.amount);
      if (settleAmount > 0.01) {
        simplifiedDebts.push({
          fromUser: debtor.user,
          toUser: creditor.user,
          amount: Math.round(settleAmount * 100) / 100
        });
      }
      debtor.amount -= settleAmount;
      creditor.amount -= settleAmount;
      if (debtor.amount <= 0.01) dIdx++;
      if (creditor.amount <= 0.01) cIdx++;
    }

    const emailContent = await generateGroupSummaryEmail(
      group,
      expenses,
      balancesList,
      simplifiedDebts,
      req.user.name
    );

    let recipients = [];
    if (sendToAll) {
      recipients = group.members.map(m => m.user?.email).filter(Boolean);
    } else if (targetEmail) {
      recipients = [targetEmail.trim().toLowerCase()];
    } else {
      recipients = [req.user.email];
    }

    if (recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid recipient email found.' });
    }

    // Send emails in parallel
    await Promise.all(recipients.map(toEmail => sendEmail(toEmail, emailContent.subject, emailContent.html)));

    res.status(200).json({
      success: true,
      message: `Group summary email sent successfully to ${recipients.length} recipient(s)!`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send Settlement Reminder Email to a debtor member
// @route   POST /api/groups/:id/email-reminder
// @access  Private
exports.sendSettlementReminderEmail = async (req, res, next) => {
  try {
    const { debtorId, amount, notes } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const debtorUser = await User.findById(debtorId);
    if (!debtorUser) {
      return res.status(404).json({ success: false, message: 'Recipient member not found' });
    }

    const emailContent = await generateSettlementReminderEmail({
      groupName: group.name,
      debtorName: debtorUser.name,
      creditorName: req.user.name,
      amount: Number(amount),
      currency: group.currency,
      notes: notes || ''
    });

    await sendEmail(debtorUser.email, emailContent.subject, emailContent.html);

    res.status(200).json({
      success: true,
      message: `Settlement reminder email sent to ${debtorUser.name} (${debtorUser.email})!`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get sync status of group expenses and settlements with personal dashboard
// @route   GET /api/groups/:id/sync-status
// @access  Private
exports.getGroupSyncStatus = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const currentUserIdStr = req.user._id.toString();

    const [groupExpenses, groupSettlements, existingPersonalExpenses] = await Promise.all([
      GroupExpense.find({ groupId: group._id })
        .populate('paidBy', 'name email')
        .populate('splits.user', 'name email')
        .sort({ date: -1, createdAt: -1 }),
      GroupSettlement.find({ groupId: group._id })
        .populate('fromUser', 'name email')
        .populate('toUser', 'name email')
        .sort({ date: -1, createdAt: -1 }),
      Expense.find({ userId: req.user._id, groupId: group._id })
    ]);

    const importedExpenseIds = new Set(
      existingPersonalExpenses
        .map(e => (e.groupExpenseId ? e.groupExpenseId.toString() : null))
        .filter(Boolean)
    );

    const importedSettlementIds = new Set(
      existingPersonalExpenses
        .map(e => (e.groupSettlementId ? e.groupSettlementId.toString() : null))
        .filter(Boolean)
    );

    // Compute user's expenses
    const expenses = groupExpenses.map(exp => {
      const expObj = exp.toObject();
      const userSplit = (exp.splits || []).find(s => {
        const uId = s.user?._id ? s.user._id.toString() : s.user?.toString();
        return uId === currentUserIdStr;
      });
      const payerId = exp.paidBy?._id ? exp.paidBy._id.toString() : exp.paidBy?.toString();
      const isPayer = payerId === currentUserIdStr;

      expObj.myShareAmount = userSplit ? userSplit.amount : 0;
      expObj.paidAmount = isPayer ? exp.amount : 0;
      expObj.isPayer = isPayer;
      expObj.isAlreadySynced = importedExpenseIds.has(exp._id.toString());
      expObj.itemType = 'expense';
      return expObj;
    });

    // Compute user's settlements (where user was the payer or recipient)
    const settlements = groupSettlements.map(st => {
      const stObj = st.toObject();
      const fromId = st.fromUser?._id ? st.fromUser._id.toString() : st.fromUser?.toString();
      const toId = st.toUser?._id ? st.toUser._id.toString() : st.toUser?.toString();
      const isPayer = fromId === currentUserIdStr;
      const isRecipient = toId === currentUserIdStr;

      stObj.isPayer = isPayer;
      stObj.isRecipient = isRecipient;
      stObj.paidAmount = isPayer ? st.amount : 0;
      stObj.myShareAmount = isPayer ? st.amount : 0;
      stObj.isAlreadySynced = importedSettlementIds.has(st._id.toString());
      stObj.itemType = 'settlement';
      stObj.category = 'Settlement';
      stObj.description = isPayer
        ? `Settlement to ${st.toUser?.name || 'Member'}`
        : `Settlement received from ${st.fromUser?.name || 'Member'}`;
      return stObj;
    });

    // Combine all items
    const allItems = [...expenses, ...settlements].sort(
      (a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
    );

    res.status(200).json({
      success: true,
      data: {
        items: allItems,
        expenses,
        settlements,
        totalSyncedCount: existingPersonalExpenses.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Import / sync group expenses and settlements to personal expenses
// @route   POST /api/groups/:id/import-to-personal
// @access  Private
exports.importGroupExpensesToPersonal = async (req, res, next) => {
  try {
    const importMode = req.body.importMode || req.body.importType || 'my_share';
    const { expenseIds = [], settlementIds = [], itemIds = [] } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const currentUserIdStr = req.user._id.toString();
    const isMember = group.members.some(m => {
      const uId = m.user?._id ? m.user._id.toString() : m.user?.toString();
      return uId === currentUserIdStr;
    });
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Not authorized for this group' });
    }

    // Existing imported records for deduplication
    const existingPersonalExpenses = await Expense.find({
      userId: req.user._id,
      groupId: group._id
    });

    const alreadyImportedExpenseIds = new Set(
      existingPersonalExpenses.map(e => (e.groupExpenseId ? e.groupExpenseId.toString() : null)).filter(Boolean)
    );
    const alreadyImportedSettlementIds = new Set(
      existingPersonalExpenses.map(e => (e.groupSettlementId ? e.groupSettlementId.toString() : null)).filter(Boolean)
    );

    let importedCount = 0;
    let skippedCount = 0;
    let totalImportedAmount = 0;
    const toInsert = [];

    // 1. Process Group Expenses (if mode is my_share or paid_by_me)
    if (importMode === 'my_share' || importMode === 'paid_by_me' || importMode === 'all_my_payments') {
      const expQuery = { groupId: group._id };
      const combinedExpIds = [
        ...(Array.isArray(expenseIds) ? expenseIds : []),
        ...(Array.isArray(itemIds) ? itemIds : [])
      ];
      if (combinedExpIds.length > 0) {
        expQuery._id = { $in: combinedExpIds };
      }

      const groupExpenses = await GroupExpense.find(expQuery);

      for (const exp of groupExpenses) {
        if (alreadyImportedExpenseIds.has(exp._id.toString())) {
          skippedCount++;
          continue;
        }

        let amountToRecord = 0;
        const payerId = exp.paidBy?.toString();
        const isPayer = payerId === currentUserIdStr;

        if (importMode === 'paid_by_me') {
          if (isPayer) {
            amountToRecord = exp.amount;
          }
        } else {
          // 'my_share': Find the user's split amount
          const userSplit = (exp.splits || []).find(s => {
            const uId = s.user?._id ? s.user._id.toString() : s.user?.toString();
            return uId === currentUserIdStr;
          });
          if (userSplit && userSplit.amount > 0) {
            amountToRecord = userSplit.amount;
          }
        }

        if (amountToRecord > 0) {
          let catName = exp.category || 'Travel';
          if (catName.includes('Food') || catName.includes('Dining')) catName = 'Food';
          else if (catName.includes('Accommodation') || catName.includes('Stay')) catName = 'Travel';
          else if (catName.includes('Transport') || catName.includes('Fuel')) catName = 'Travel';
          else if (catName.includes('Shopping')) catName = 'Shopping';
          else if (catName.includes('Entertainment') || catName.includes('Sightseeing')) catName = 'Entertainment';
          else if (catName.includes('Utilities') || catName.includes('Bills')) catName = 'Utilities';

          toInsert.push({
            userId: req.user._id,
            description: `${exp.description} (${group.name})`,
            amount: Math.round(amountToRecord * 100) / 100,
            category: catName,
            date: exp.date || new Date(),
            paymentMethod: 'UPI',
            notes: `Imported from ${group.name} (${importMode === 'paid_by_me' ? 'Paid out-of-pocket' : 'My consumed share'})`,
            groupId: group._id,
            groupExpenseId: exp._id,
            groupName: group.name
          });

          totalImportedAmount += amountToRecord;
          importedCount++;
          alreadyImportedExpenseIds.add(exp._id.toString());
        }
      }
    }

    // 2. Process Settlements (if mode is settled_by_me or paid_by_me or all_my_payments or if settlementIds specified)
    if (
      importMode === 'settled_by_me' ||
      importMode === 'paid_by_me' ||
      importMode === 'all_my_payments' ||
      (Array.isArray(settlementIds) && settlementIds.length > 0)
    ) {
      const stQuery = { groupId: group._id };
      const combinedStIds = [
        ...(Array.isArray(settlementIds) ? settlementIds : []),
        ...(Array.isArray(itemIds) ? itemIds : [])
      ];
      if (combinedStIds.length > 0) {
        stQuery._id = { $in: combinedStIds };
      }

      const groupSettlements = await GroupSettlement.find(stQuery)
        .populate('fromUser', 'name email')
        .populate('toUser', 'name email');

      for (const st of groupSettlements) {
        if (alreadyImportedSettlementIds.has(st._id.toString())) {
          skippedCount++;
          continue;
        }

        const fromId = st.fromUser?._id ? st.fromUser._id.toString() : st.fromUser?.toString();
        const isPayer = fromId === currentUserIdStr;

        // Only import settlements paid by current user (outgoing money)
        if (isPayer && st.amount > 0) {
          toInsert.push({
            userId: req.user._id,
            description: `Settlement to ${st.toUser?.name || 'Member'} (${group.name})`,
            amount: Math.round(st.amount * 100) / 100,
            category: 'Other',
            date: st.date || new Date(),
            paymentMethod: st.paymentMethod || 'UPI',
            notes: `Settlement payment in ${group.name} to ${st.toUser?.name || 'Member'}${st.notes ? ` - ${st.notes}` : ''}`,
            groupId: group._id,
            groupSettlementId: st._id,
            groupName: group.name
          });

          totalImportedAmount += st.amount;
          importedCount++;
          alreadyImportedSettlementIds.add(st._id.toString());
        }
      }
    }

    if (toInsert.length > 0) {
      await Expense.insertMany(toInsert);
    }

    res.status(200).json({
      success: true,
      message: `Successfully synced ${importedCount} transaction(s) (₹${Math.round(totalImportedAmount).toLocaleString()}) to your Personal Dashboard!`,
      data: {
        importedCount,
        skippedCount,
        totalImportedAmount
      }
    });
  } catch (error) {
    next(error);
  }
};


