const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createGroup,
  getUserGroups,
  getGroupDetails,
  updateGroup,
  deleteGroup,
  joinGroupByCode,
  addMemberByEmail,
  removeMember,
  addGroupExpense,
  getGroupExpenses,
  deleteGroupExpense,
  recordSettlement,
  getGroupSettlements,
  getGroupBalances,
  sendGroupSummaryEmail,
  sendSettlementReminderEmail,
  getGroupSyncStatus,
  importGroupExpensesToPersonal
} = require('../controllers/groupController');

// All group routes are protected
router.use(protect);

// Group Management
router.route('/')
  .post(createGroup)
  .get(getUserGroups);

router.post('/join', joinGroupByCode);

router.route('/:id')
  .get(getGroupDetails)
  .put(updateGroup)
  .delete(deleteGroup);

// Member Management
router.post('/:id/members', addMemberByEmail);
router.delete('/:id/members/:userId', removeMember);

// Group Expenses
router.route('/:id/expenses')
  .get(getGroupExpenses)
  .post(addGroupExpense);

router.delete('/:id/expenses/:expenseId', deleteGroupExpense);

// Debt & Settlements
router.get('/:id/balances', getGroupBalances);
router.route('/:id/settle')
  .post(recordSettlement)
  .get(getGroupSettlements);

// Email Reports & Notifications
router.post('/:id/email-summary', sendGroupSummaryEmail);
router.post('/:id/email-reminder', sendSettlementReminderEmail);

// Personal Dashboard Sync
router.get('/:id/sync-status', getGroupSyncStatus);
router.post('/:id/import-to-personal', importGroupExpensesToPersonal);

module.exports = router;
