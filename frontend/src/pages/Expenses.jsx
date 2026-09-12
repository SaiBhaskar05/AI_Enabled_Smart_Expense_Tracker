import React, { useState, useEffect } from 'react';
import { expensesAPI, categoriesAPI, mlAPI } from '../services/api';
import { Layout } from '../components/Layout';
import { Plus, Edit2, Trash2, Sparkles, Receipt, X } from 'lucide-react';
import '../styles/expenses.css';

export const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
    notes: ''
  });
  const [mlSuggestion, setMlSuggestion] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      const [expensesRes, categoriesRes] = await Promise.all([
        expensesAPI.getAll({ ...filters, limit: 100 }),
        categoriesAPI.getAll()
      ]);
      setExpenses(expensesRes.data?.data?.expenses || []);
      const fetchedCats = categoriesRes.data?.data?.categories || [];
      setCategories(fetchedCats);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingExpense(null);
    setFormData({
      description: '',
      amount: '',
      category: categories[0]?.name || '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'Cash',
      notes: ''
    });
    setMlSuggestion(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (expense) => {
    setEditingExpense(expense);
    setFormData({
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      date: new Date(expense.date).toISOString().split('T')[0],
      paymentMethod: expense.paymentMethod || 'Cash',
      notes: expense.notes || ''
    });
    setMlSuggestion(null);
    setShowModal(true);
  };

  const handlePredictCategory = async () => {
    if (!formData.description.trim()) return;
    try {
      const res = await mlAPI.predict(formData.description);
      if (res.data?.success && res.data?.data) {
        setMlSuggestion(res.data.data);
      }
    } catch (error) {
      console.error('ML prediction failed:', error);
    }
  };

  const handleAcceptSuggestion = () => {
    if (mlSuggestion) {
      const suggested = mlSuggestion.category;
      // Match with existing categories case-insensitively if available
      const matchedCategory = categories.find(
        c => c.name.toLowerCase() === suggested.toLowerCase()
      );
      setFormData(prev => ({
        ...prev,
        category: matchedCategory ? matchedCategory.name : suggested
      }));
      setMlSuggestion(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingExpense) {
        await expensesAPI.update(editingExpense._id, formData);
      } else {
        await expensesAPI.create(formData);
      }
      setFormData({
        description: '',
        amount: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'Cash',
        notes: ''
      });
      setMlSuggestion(null);
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Failed to save expense:', error);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await expensesAPI.delete(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete expense:', error);
    }
  };

  const formatCurrency = (amount) =>
    `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  return (
    <Layout>
      <div className="expenses-container">
        <div className="expenses-header">
          <div>
            <h1>Expenses</h1>
            <p className="text-muted">Track and manage all your transactions</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleOpenAddModal}
          >
            <Plus size={20} />
            Add Expense
          </button>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <input
            type="text"
            placeholder="Search expenses..."
            className="input"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <select
            className="input"
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="input"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          />
          <input
            type="date"
            className="input"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          />
        </div>

        {/* Expenses Table */}
        {expenses.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-state-icon">
              <Receipt size={48} color="#7c5cfc" />
            </div>
            <h3>No expenses yet</h3>
            <p>Start tracking your spending by adding your first expense.</p>
            <button
              className="btn btn-primary"
              onClick={handleOpenAddModal}
            >
              Add Expense
            </button>
          </div>
        ) : (
          <div className="expenses-table card">
            <table className="table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense._id}>
                    <td style={{ fontWeight: 500 }}>{expense.description}</td>
                    <td>
                      <span className="badge badge-primary">{expense.category}</span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>
                      {formatCurrency(expense.amount)}
                    </td>
                    <td>{new Date(expense.date).toLocaleDateString()}</td>
                    <td>{expense.paymentMethod}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleOpenEditModal(expense)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteExpense(expense._id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add / Edit Expense Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2>
                <button
                  className="btn btn-tertiary"
                  onClick={() => setShowModal(false)}
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>Description</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="e.g., Grocery shopping"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Amount (₹)</label>
                    <input
                      type="number"
                      className="input"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      placeholder="0.00"
                      step="0.01"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Category</label>
                    <select
                      className="input"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      required
                    >
                      <option value="">Select category</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!mlSuggestion && formData.description && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handlePredictCategory}
                    >
                      <Sparkles size={16} />
                      Suggest Category
                    </button>
                  )}

                  {mlSuggestion && (
                    <div className="ml-suggestion">
                      <div className="suggestion-box">
                        <div className="suggestion-header">ML Prediction</div>
                        <div className="suggestion-content">
                          <div className="suggestion-category">{mlSuggestion.category}</div>
                          <div className="suggestion-confidence">
                            Confidence: {Math.round(mlSuggestion.confidence * 100)}%
                          </div>
                        </div>
                        <div className="suggestion-actions">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={handleAcceptSuggestion}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => setMlSuggestion(null)}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Date</label>
                    <input
                      type="date"
                      className="input"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Payment Method</label>
                    <select
                      className="input"
                      value={formData.paymentMethod}
                      onChange={(e) =>
                        setFormData({ ...formData, paymentMethod: e.target.value })
                      }
                    >
                      <option>Cash</option>
                      <option>Credit Card</option>
                      <option>Debit Card</option>
                      <option>UPI</option>
                      <option>Net Banking</option>
                      <option>Wallet</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Notes</label>
                    <textarea
                      className="textarea"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="Additional notes..."
                    />
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowModal(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Add Expense
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
