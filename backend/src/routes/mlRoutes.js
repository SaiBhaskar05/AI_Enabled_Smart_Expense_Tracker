const express = require('express');
const { predict, mlHealth } = require('../controllers/mlController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.get('/health', mlHealth);
router.post('/predict', protect, predict);

module.exports = router;
