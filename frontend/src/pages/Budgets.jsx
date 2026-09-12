import React, { useState, useEffect } from 'react';
import { budgetsAPI, categoriesAPI } from '../services/api';
import { Layout } from '../components/Layout';
import { Plus, Edit2, Trash2, AlertTriangle, CheckCircle2, Target, Compass, User, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Budgets = () => {
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);

  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    period: 'monthly',
    alertThreshold: 80,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [budgetsRes, categoriesRes] = await Promise.all([
        budgetsAPI.getAll(),
        categoriesAPI.getAll()
      ]);
      const fetchedBudgets = budgetsRes.data?.data?.budgets || [];
      const fetchedCategories = categoriesRes.data?.data?.categories || [];

      setBudgets(fetchedBudgets);
      setCategories(fetchedCategories);

      if (fetchedCategories.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: fetchedCategories[0].name }));
      }
    } catch (error) {
      console.error('Failed to load budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingBudget(null);
    setFormData({
      category: categories[0]?.name || '',
      amount: '',
      period: 'monthly',
      alertThreshold: 80,
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (budget) => {
    setEditingBudget(budget);
    setFormData({
      category: budget.category,
      amount: budget.amount,
      period: budget.period || 'monthly',
      alertThreshold: budget.alertThreshold || 80,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBudget) {
        await budgetsAPI.update(editingBudget._id, formData);
      } else {
        await budgetsAPI.create(formData);
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Failed to save budget:', error);
    }
  };

  const handleDeleteBudget = async (id) => {
    if (!window.confirm('Are you sure you want to delete this budget?')) return;
    try {
      await budgetsAPI.delete(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete budget:', error);
    }
  };

  const formatCurrency = (amount) =>
    `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <Layout>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px'
        }}>
          <p className="text-muted">Loading budgets...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-container" style={{ padding: 'var(--spacing-lg)' }}>
        <div className="flex-between mb-lg">
          <div>
            <h1>Budgets</h1>
            <p className="text-muted">Set spending limits and stay in control of your monthly expenses</p>
          </div>
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={20} />
            Add Budget
          </button>
        </div>

        {budgets.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-state-icon">
              <Target size={48} color="#7c5cfc" />
            </div>
            <h3>No budgets set</h3>
            <p>Create a budget for categories like Food, Travel, or Shopping to track your spending limits.</p>
            <button className="btn btn-primary" onClick={handleOpenAddModal}>
              <Plus size={18} /> Create First Budget
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 'var(--spacing-lg)' }}>
            {budgets.map((budget) => {
              const spent = budget.spent || 0;
              const amount = budget.amount || 0;
              const percentage = budget.percentage || (amount > 0 ? Math.round((spent / amount) * 100) : 0);
              const isOver = spent > amount;
              const isNear = percentage >= (budget.alertThreshold || 80) && !isOver;

              let fillClass = 'var(--primary)';
              if (isOver) fillClass = 'var(--danger)';
              else if (isNear) fillClass = 'var(--warning)';

              return (
                <div key={budget._id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div className="flex-between mb-md">
                      <h3 style={{ margin: 0 }}>{budget.category}</h3>
                      <span className={`badge ${isOver ? 'badge-danger' : isNear ? 'badge-warning' : 'badge-primary'}`}>
                        {budget.period}
                      </span>
                    </div>

                    <div style={{ margin: 'var(--spacing-md) 0' }}>
                      <div className="flex-between text-sm mb-xs">
                        <span style={{ fontWeight: 600, color: isOver ? 'var(--danger)' : 'var(--text-2)' }}>
                          {formatCurrency(spent)} spent
                        </span>
                        <span className="text-muted">of {formatCurrency(amount)}</span>
                      </div>

                      {/* Progress Bar Container */}
                      <div style={{
                        height: '10px',
                        background: 'var(--border)',
                        borderRadius: 'var(--radius-full)',
                        overflow: 'hidden',
                        position: 'relative'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(percentage, 100)}%`,
                          background: fillClass,
                          borderRadius: 'var(--radius-full)',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>

                      <div className="flex-between mt-xs text-xs text-muted">
                        <span>{percentage}% used</span>
                        <span>{formatCurrency(Math.max(0, amount - spent))} left</span>
                      </div>
                    </div>

                    {isOver && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: 'var(--danger-bg)',
                        color: 'var(--danger)',
                        fontSize: '0.8rem',
                        marginTop: '8px'
                      }}>
                        <AlertTriangle size={14} /> Budget limit exceeded by {formatCurrency(spent - amount)}!
                      </div>
                    )}
                    {isNear && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: 'var(--warning-bg)',
                        color: 'var(--warning)',
                        fontSize: '0.8rem',
                        marginTop: '8px'
                      }}>
                        <AlertTriangle size={14} /> Approaching budget limit ({percentage}%)
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleOpenEditModal(budget)}>
                      <Edit2 size={16} /> Edit
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteBudget(budget._id)}
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create / Edit Budget Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingBudget ? 'Edit Budget' : 'Add New Budget'}</h2>
                <button className="btn btn-tertiary" onClick={() => setShowModal(false)} aria-label="Close modal">
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      className="input"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                    >
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Budget Limit (₹)</label>
                    <input
                      type="number"
                      className="input"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="e.g. 10000"
                      min="1"
                      step="0.01"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Period</label>
                    <select
                      className="input"
                      value={formData.period}
                      onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="weekly">Weekly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Alert Threshold (%)</label>
                    <input
                      type="number"
                      className="input"
                      value={formData.alertThreshold}
                      onChange={(e) => setFormData({ ...formData, alertThreshold: e.target.value })}
                      placeholder="80"
                      min="1"
                      max="100"
                    />
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {editingBudget ? 'Save Changes' : 'Create Budget'}
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

