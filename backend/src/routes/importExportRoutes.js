const express = require('express');
const { previewImport, confirmImport, exportExpenses } = require('../controllers/importExportController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.post('/preview', previewImport);
router.post('/import', confirmImport);
router.get('/export', exportExpenses);

module.exports = router;
