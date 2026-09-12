const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  copilotChat,
  getFinancialInsights,
  getFinancialContext
} = require('../controllers/aiController');

// All AI routes require authentication
router.use(protect);

router.post('/copilot/chat', copilotChat);
router.get('/copilot/insights', getFinancialInsights);
router.get('/copilot/context', getFinancialContext);

module.exports = router;
