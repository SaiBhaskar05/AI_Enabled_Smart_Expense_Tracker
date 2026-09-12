const express = require('express');
const { getReport } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);
router.get('/', getReport);

module.exports = router;
