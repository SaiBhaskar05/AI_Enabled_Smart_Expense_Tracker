const express = require('express');
const { getBudgets, createBudget, updateBudget, deleteBudget } = require('../controllers/budgetController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.route('/').get(getBudgets).post(createBudget);
router.route('/:id').put(updateBudget).delete(deleteBudget);

module.exports = router;
