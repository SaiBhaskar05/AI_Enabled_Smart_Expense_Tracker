const express = require('express');
const {
  getPreferences,
  updatePreferences,
  addRecipient,
  updateRecipient,
  deleteRecipient,
  sendDailySummary,
  sendWeeklySummary,
  sendMonthlySummary,
  sendToRecipient,
  testConnection
} = require('../controllers/emailController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);

// Diagnostic test
router.post('/test-connection', testConnection);

// Recipient management
router.post('/recipients', addRecipient);
router.put('/recipients/:recipientId', updateRecipient);
router.delete('/recipients/:recipientId', deleteRecipient);

// Email dispatch
router.post('/send-daily', sendDailySummary);
router.post('/send-weekly', sendWeeklySummary);
router.post('/send-monthly', sendMonthlySummary);
router.post('/send-to-recipient', sendToRecipient);

module.exports = router;

