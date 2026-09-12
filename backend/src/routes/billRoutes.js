const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  uploadBill,
  getPersonalBills,
  getGroupBills,
  deleteBill
} = require('../controllers/billController');

// All bill routes require authentication
router.use(protect);

router.route('/')
  .post(uploadBill)
  .get(getPersonalBills);

router.get('/group/:groupId', getGroupBills);
router.delete('/:id', deleteBill);

module.exports = router;
