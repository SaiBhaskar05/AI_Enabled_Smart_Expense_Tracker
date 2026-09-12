import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { expensesAPI, budgetsAPI, categoriesAPI, mlAPI, aiAPI } from '../services/api';
import { Plus, Mail, Upload, ArrowRight, Wallet, TrendingUp, Calendar, Hash, Target, Receipt, Sparkles, DollarSign, Compass, Users, X, Bot, Zap, CheckCircle2 } from 'lucide-react';
import { Layout } from '../components/Layout';
import { StatCard } from '../components/StatCard';
import { BudgetCard } from '../components/BudgetCard';
import '../styles/dashboard.css';
import '../styles/copilot.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CATEGORY_COLORS = [
  '#7c5cfc', '#f97316', '#06b6d4', '#a855f7', '#eab308',
  '#ef4444', '#3b82f6', '#ec4899', '#10b981', '#64748b'
];

export const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick Add Expense Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [mlSuggestion, setMlSuggestion] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
    notes: ''
  });

  const [errorState, setErrorState] = useState(null);

  const handlePredictCategory = async () => {
    if (!formData.description.trim()) return;
    try {
      const res = await mlAPI.predict(formData.description);
      if (res.data?.success && res.data?.data) {
        setMlSuggestion(res.data.data);
      }
    } catch (err) {
      console.error('ML prediction failed:', err);
    }
  };

  const handleAcceptSuggestion = () => {
    if (mlSuggestion) {
      const suggested = mlSuggestion.category;
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setErrorState(null);
    try {
      const [statsRes, expensesRes, budgetsRes, categoriesRes] = await Promise.all([
        expensesAPI.getStats().catch(err => ({ error: err })),
        expensesAPI.getAll({ limit: 10 }).catch(err => ({ error: err })),
        budgetsAPI.getAll().catch(err => ({ error: err })),
        categoriesAPI.getAll().catch(err => ({ error: err }))
      ]);

      const statsData = statsRes.data?.data || {};
      setStats({
        totalSpending: statsData.total || 0,
        monthlySpending: statsData.monthTotal || 0,
        transactionCount: statsData.monthCount || 0,
        momChangePercent: statsData.momChangePercent || 0,
        avgDaily: statsData.avgDaily || 0,
        categoryBreakdown: Array.isArray(statsData.categoryBreakdown) ? statsData.categoryBreakdown : [],
        monthlyTrend: Array.isArray(statsData.monthlyTrend) ? statsData.monthlyTrend : [],
        paymentMethodBreakdown: Array.isArray(statsData.paymentMethodBreakdown) ? statsData.paymentMethodBreakdown : [],
        dailyTrend: Array.isArray(statsData.dailyTrend) ? statsData.dailyTrend : []
      });
      
      setExpenses(Array.isArray(expensesRes.data?.data?.expenses) ? expensesRes.data.data.expenses : []);
      setBudgets(Array.isArray(budgetsRes.data?.data?.budgets) ? budgetsRes.data.data.budgets : []);
      const fetchedCats = Array.isArray(categoriesRes.data?.data?.categories) ? categoriesRes.data.data.categories : [];
      setCategories(fetchedCats);
      if (fetchedCats.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: fetchedCats[0].name }));
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setErrorState('Failed to load dashboard data. Please make sure backend is connected.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAddExpense = async (e) => {
    e.preventDefault();
    try {
      await expensesAPI.create(formData);
      setShowAddModal(false);
      setFormData({
        description: '',
        amount: '',
        category: categories[0]?.name || '',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'Cash',
        notes: ''
      });
      loadDashboardData();
    } catch (error) {
      console.error('Failed to add expense:', error);
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
          minHeight: '500px',
          background: 'linear-gradient(135deg, #f9fafb 0%, #f3f0ff 100%)',
          borderRadius: '24px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <Sparkles size={48} color="#7c5cfc" style={{ animation: 'spin 1.5s infinite linear', marginBottom: '1rem' }} />
            <p style={{ fontSize: '1.1rem', color: '#4c4a7a', fontWeight: '600' }}>Loading your financial overview...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Process dynamic line chart data safely
  const monthlyTrendArray = stats?.monthlyTrend || [];
  const lineLabels = monthlyTrendArray.length > 0
    ? monthlyTrendArray.map(item => {
        if (item && item._id && typeof item._id.month === 'number') {
          const monthName = MONTH_NAMES[(item._id.month - 1) % 12] || '';
          const year = item._id.year || '';
          return `${monthName} ${year}`.trim();
        }
        return 'Month';
      })
    : ['No Data'];
  const lineValues = monthlyTrendArray.length > 0
    ? monthlyTrendArray.map(item => Number(item?.total || 0))
    : [0];

  const lineChartData = {
    labels: lineLabels,
    datasets: [
      {
        label: 'Monthly Spending (₹)',
        data: lineValues,
        borderColor: '#7c5cfc',
        backgroundColor: 'rgba(124, 92, 252, 0.15)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#7c5cfc',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
      },
    ],
  };

  // Process dynamic doughnut chart data safely
  const categoryBreakdown = stats?.categoryBreakdown || [];
  const doughnutLabels = categoryBreakdown.length > 0
    ? categoryBreakdown.map(item => item?._id || 'Uncategorized')
    : ['No Data'];
  const doughnutValues = categoryBreakdown.length > 0
    ? categoryBreakdown.map(item => Number(item?.total || 0))
    : [1];

  const doughnutColors = categoryBreakdown.length > 0
    ? categoryBreakdown.map((_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length])
    : ['#e2deff'];

  const doughnutChartData = {
    labels: doughnutLabels,
    datasets: [
      {
        data: doughnutValues,
        backgroundColor: doughnutColors,
        borderColor: '#ffffff',
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  };

  const momChange = stats?.momChangePercent || 0;
  const momText = momChange > 0 ? `+${momChange}% vs last month` : `${momChange}% vs last month`;

  return (
    <Layout>
      <div className="dashboard">
        <div className="dashboard-header">
          <div>
            <h1>Dashboard</h1>
            <p className="text-muted">Welcome back! Here's your real-time spending overview.</p>
          </div>
          <div className="dashboard-actions">
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={20} />
              Add Expense
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/email')}>
              <Mail size={20} />
              Send Report
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/import-export')}>
              <Upload size={20} />
              Import CSV
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="stats-grid">
          <StatCard
            icon={<Wallet size={24} color="#7c5cfc" />}
            iconBg="#ede9ff"
            label="Total Spending"
            value={formatCurrency(stats?.totalSpending)}
            change="All time recorded"
            positive={true}
          />
          <StatCard
            icon={<Calendar size={24} color="#06b6d4" />}
            iconBg="#e0f7fa"
            label="This Month"
            value={formatCurrency(stats?.monthlySpending)}
            change={momText}
            positive={momChange <= 0}
          />
          <StatCard
            icon={<Hash size={24} color="#a855f7" />}
            iconBg="#f3e8ff"
            label="Month Transactions"
            value={stats?.transactionCount || 0}
            change={`${stats?.avgDaily ? formatCurrency(stats.avgDaily) : '₹0'}/day avg`}
            positive={true}
          />
          <StatCard
            icon={<TrendingUp size={24} color="#10b981" />}
            iconBg="#d1fae5"
            label="Avg Daily Spend"
            value={formatCurrency(stats?.avgDaily)}
            change="Current month pace"
            positive={true}
          />
        </div>

        {/* Charts Section */}
        <div className="charts-section">
          <div className="chart-container card">
            <div className="flex-between mb-md">
              <h3>Monthly Spending Trend</h3>
              <span className="badge badge-primary">6 Months</span>
            </div>
            {lineValues.every(v => v === 0) ? (
              <div className="empty-chart-placeholder">
                <TrendingUp size={36} color="#a8a6d1" />
                <p className="text-muted">No monthly spending data yet. Add expenses to track trends!</p>
              </div>
            ) : (
              <div className="chart-wrapper">
                <Line
                  data={lineChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                  }}
                />
              </div>
            )}
          </div>

          <div className="chart-container card">
            <div className="flex-between mb-md">
              <h3>Spending by Category</h3>
              <span className="badge badge-secondary">All Time</span>
            </div>
            {categoryBreakdown.length === 0 ? (
              <div className="empty-chart-placeholder">
                <Wallet size={36} color="#a8a6d1" />
                <p className="text-muted">No category data recorded yet.</p>
              </div>
            ) : (
              <div className="chart-wrapper">
                <Doughnut
                  data={doughnutChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } }
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Budget Overview */}
        <div className="section">
          <div className="flex-between mb-md">
            <h3>Budget Overview</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate('/budgets')}>
              View All Budgets <ArrowRight size={16} />
            </button>
          </div>
          {budgets.length === 0 ? (
            <div className="empty-state card">
              <div className="empty-state-icon">
                <Target size={44} color="#7c5cfc" />
              </div>
              <h3>No Active Budgets</h3>
              <p>Create budgets to monitor category spending limits.</p>
              <button className="btn btn-primary" onClick={() => navigate('/budgets')}>
                Set Up Budgets
              </button>
            </div>
          ) : (
            <div className="budgets-grid">
              {budgets.slice(0, 4).map((budget) => (
                <BudgetCard key={budget._id} budget={budget} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Expenses */}
        <div className="section">
          <div className="flex-between mb-md">
            <h3>Recent Expenses</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate('/expenses')}>
              View All Expenses <ArrowRight size={16} />
            </button>
          </div>
          {expenses.length === 0 ? (
            <div className="empty-state card">
              <div className="empty-state-icon">
                <Receipt size={44} color="#7c5cfc" />
              </div>
              <h3>No Expenses Recorded</h3>
              <p>Click below to log your first transaction.</p>
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
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
                  </tr>
                </thead>
                <tbody>
                  {expenses.slice(0, 5).map((expense) => (
                    <tr key={expense._id}>
                      <td style={{ fontWeight: '500' }}>{expense.description}</td>
                      <td>
                        <span className="badge badge-primary">{expense.category}</span>
                      </td>
                      <td style={{ fontWeight: '600', color: 'var(--primary-dark)' }}>
                        {formatCurrency(expense.amount)}
                      </td>
                      <td>{new Date(expense.date).toLocaleDateString()}</td>
                      <td>{expense.paymentMethod || 'Cash'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Add Expense Modal */}
        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Quick Add Expense</h2>
                <button className="btn btn-tertiary" onClick={() => setShowAddModal(false)} aria-label="Close modal">
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleQuickAddExpense}>
                  <div className="form-group">
                    <label>Description</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="e.g. Dinner with team"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Amount (₹)</label>
                    <input
                      type="number"
                      className="input"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                    >
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {!mlSuggestion && formData.description && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handlePredictCategory}
                      style={{ marginBottom: '16px' }}
                    >
                      <Sparkles size={16} />
                      Suggest Category
                    </button>
                  )}

                  {mlSuggestion && (
                    <div className="ml-suggestion">
                      <div className="suggestion-box">
                        <div className="suggestion-header">ML Category Suggestion</div>
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
                            Dismiss
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
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Payment Method</label>
                    <select
                      className="input"
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
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
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Save Expense
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



