const express = require('express');
const { body } = require('express-validator');
const {
  createExpense, getExpenses, getExpense, updateExpense, deleteExpense, getStats
} = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.use(protect);

router.get('/stats', getStats);

router.route('/')
  .get(getExpenses)
  .post([
    body('description').notEmpty().withMessage('Description is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
    body('category').notEmpty().withMessage('Category is required')
  ], validate, createExpense);

router.route('/:id')
  .get(getExpense)
  .put(updateExpense)
  .delete(deleteExpense);

module.exports = router;
