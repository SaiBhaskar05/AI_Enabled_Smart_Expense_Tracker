const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const Expense = require('../models/Expense');

const VALID_PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking', 'Wallet', 'Other'];

// @desc   Preview CSV import (validate without inserting)
// @route  POST /api/import-export/preview
const previewImport = async (req, res) => {
  try {
    if (!req.body.csvData) {
      return res.status(400).json({ success: false, message: 'No CSV data provided' });
    }

    const records = parse(req.body.csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const validRows = [];
    const invalidRows = [];

    records.forEach((row, index) => {
      const errors = [];
      const rowNum = index + 2; // +2 for header row and 1-indexed

      // Validate required fields
      if (!row.description && !row.Description) errors.push('Missing description');
      if (!row.amount && !row.Amount) errors.push('Missing amount');
      if (!row.category && !row.Category) errors.push('Missing category');

      // Normalize field names (case-insensitive)
      const description = (row.description || row.Description || '').trim();
      const amountStr = (row.amount || row.Amount || '').toString().replace(/[₹,]/g, '');
      const category = (row.category || row.Category || '').trim();
      const dateStr = row.date || row.Date || new Date().toISOString();
      const paymentMethod = row.paymentMethod || row.payment_method || row.PaymentMethod || 'Cash';
      const notes = row.notes || row.Notes || '';

      // Validate amount
      const amount = parseFloat(amountStr);
      if (isNaN(amount) || amount <= 0) errors.push('Invalid amount');

      // Validate date
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) errors.push('Invalid date');

      const processedRow = {
        rowNum,
        description,
        amount,
        category,
        date: isNaN(date.getTime()) ? new Date() : date,
        paymentMethod: VALID_PAYMENT_METHODS.includes(paymentMethod) ? paymentMethod : 'Other',
        notes
      };

      if (errors.length > 0) {
        invalidRows.push({ ...processedRow, errors });
      } else {
        validRows.push(processedRow);
      }
    });

    res.json({
      success: true,
      data: {
        total: records.length,
        valid: validRows.length,
        invalid: invalidRows.length,
        validRows,
        invalidRows
      }
    });
  } catch (error) {
    console.error('Preview import error:', error);
    res.status(400).json({ success: false, message: 'Failed to parse CSV. Ensure the file has correct format.' });
  }
};

// @desc   Confirm and save imported expenses
// @route  POST /api/import-export/import
const confirmImport = async (req, res) => {
  try {
    const { rows } = req.body;
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid rows to import' });
    }

    const expenses = rows.map(row => ({
      userId: req.user._id,
      description: row.description,
      amount: row.amount,
      category: row.category,
      date: new Date(row.date),
      paymentMethod: row.paymentMethod || 'Other',
      notes: row.notes || ''
    }));

    const inserted = await Expense.insertMany(expenses);
    res.json({ success: true, message: `${inserted.length} expenses imported successfully`, data: { count: inserted.length } });
  } catch (error) {
    console.error('Confirm import error:', error);
    res.status(500).json({ success: false, message: 'Failed to import expenses' });
  }
};

// @desc   Export expenses as CSV
// @route  GET /api/import-export/export
const exportExpenses = async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    const query = { userId: req.user._id };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); query.date.$lte = e; }
    }
    if (category && category !== 'all') query.category = category;

    const expenses = await Expense.find(query).sort({ date: -1 });

    const csvData = expenses.map(e => ({
      date: new Date(e.date).toISOString().split('T')[0],
      description: e.description,
      amount: e.amount,
      category: e.category,
      paymentMethod: e.paymentMethod,
      notes: e.notes || ''
    }));

    const csv = stringify(csvData, {
      header: true,
      columns: ['date', 'description', 'amount', 'category', 'paymentMethod', 'notes']
    });

    const filename = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, message: 'Failed to export expenses' });
  }
};

module.exports = { previewImport, confirmImport, exportExpenses };
