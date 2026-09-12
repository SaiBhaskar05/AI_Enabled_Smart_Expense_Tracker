import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { expensesAPI, reportsAPI } from '../services/api';
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
  Filler
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  TrendingUp, Award, Flame, Layers, PieChart, BarChart3, Sparkles, Filter, CreditCard
} from 'lucide-react';
import '../styles/dashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const CATEGORY_COLORS = [
  '#7c5cfc', '#f97316', '#06b6d4', '#a855f7', '#eab308',
  '#ef4444', '#3b82f6', '#ec4899', '#10b981', '#64748b'
];

export const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [stats, setStats] = useState(null);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    loadAnalyticsData();
  }, [period]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const [statsRes, expensesRes] = await Promise.all([
        expensesAPI.getStats().catch(() => ({ data: { data: {} } })),
        expensesAPI.getAll({ limit: 300 }).catch(() => ({ data: { data: { expenses: [] } } }))
      ]);

      setStats(statsRes.data?.data || {});
      setExpenses(expensesRes.data?.data?.expenses || []);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) =>
    `₹${Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  // Highest single expense
  const highestExpense = expenses.length > 0
    ? [...expenses].sort((a, b) => (b.amount || 0) - (a.amount || 0))[0]
    : null;

  // Highest spending category
  const categoryBreakdown = stats?.categoryBreakdown || [];
  const topCategory = categoryBreakdown.length > 0
    ? [...categoryBreakdown].sort((a, b) => (b.total || 0) - (a.total || 0))[0]
    : null;

  const totalSpending = stats?.total || 0;
  const topCategoryPercent = totalSpending > 0 && topCategory
    ? Math.round((topCategory.total / totalSpending) * 100)
    : 0;

  // 1. Doughnut Plot — Category Distribution
  const doughnutLabels = categoryBreakdown.map(c => c._id || 'Uncategorized');
  const doughnutValues = categoryBreakdown.map(c => Number(c.total || 0));
  const doughnutColors = categoryBreakdown.map((_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length]);

  const doughnutChartData = {
    labels: doughnutLabels,
    datasets: [
      {
        data: doughnutValues.length > 0 ? doughnutValues : [1],
        backgroundColor: doughnutColors.length > 0 ? doughnutColors : ['#e2deff'],
        borderColor: '#ffffff',
        borderWidth: 3,
        hoverOffset: 6
      }
    ]
  };

  // 2. Bar Plot — Monthly Spending
  const monthlyTrend = stats?.monthlyTrend || [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const barLabels = monthlyTrend.length > 0
    ? monthlyTrend.map(item => {
        if (item && item._id && typeof item._id.month === 'number') {
          return `${monthNames[(item._id.month - 1) % 12]} ${item._id.year || ''}`.trim();
        }
        return 'Month';
      })
    : ['No Data'];
  const barValues = monthlyTrend.length > 0
    ? monthlyTrend.map(item => Number(item.total || 0))
    : [0];

  const barChartData = {
    labels: barLabels,
    datasets: [
      {
        label: 'Monthly Spend (₹)',
        data: barValues,
        backgroundColor: 'rgba(124, 92, 252, 0.85)',
        hoverBackgroundColor: '#7c5cfc',
        borderRadius: 8,
      }
    ]
  };

  // 3. Line Plot — Daily / Recent Spend Trend
  const dailyTrend = stats?.dailyTrend || [];
  const lineLabels = dailyTrend.length > 0
    ? dailyTrend.map(d => d._id)
    : ['No Data'];
  const lineValues = dailyTrend.length > 0
    ? dailyTrend.map(d => Number(d.total || 0))
    : [0];

  const lineChartData = {
    labels: lineLabels,
    datasets: [
      {
        label: 'Daily Spending (₹)',
        data: lineValues,
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.15)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#06b6d4',
        pointBorderColor: '#ffffff',
        pointRadius: 4,
      }
    ]
  };

  // 4. Payment Method Plot
  const paymentMethodBreakdown = stats?.paymentMethodBreakdown || [];
  const pmLabels = paymentMethodBreakdown.map(p => p._id || 'Cash');
  const pmValues = paymentMethodBreakdown.map(p => Number(p.total || 0));

  const pmChartData = {
    labels: pmLabels,
    datasets: [
      {
        label: 'Payment Method (₹)',
        data: pmValues.length > 0 ? pmValues : [0],
        backgroundColor: ['#7c5cfc', '#06b6d4', '#a855f7', '#10b981', '#f97316', '#ec4899'],
        borderRadius: 6,
      }
    ]
  };

  // Top 5 Highest Transactions
  const topExpensesList = [...expenses]
    .sort((a, b) => (b.amount || 0) - (a.amount || 0))
    .slice(0, 5);

  if (loading) {
    return (
      <Layout>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '450px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <Sparkles size={40} color="#7c5cfc" style={{ animation: 'spin 1.5s infinite linear', marginBottom: '1rem' }} />
            <p className="text-muted" style={{ fontWeight: 600 }}>Loading analytics plots...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="analytics-page">
        {/* Header */}
        <div className="flex-between mb-lg">
          <div>
            <h1>Analytics & Insights</h1>
            <p className="text-muted">Spending trends and peak transaction insights</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Filter size={18} color="#7c5cfc" />
            <select
              className="input"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={{ width: '160px', padding: '8px 14px' }}
            >
              <option value="all">All Time</option>
              <option value="month">This Month</option>
              <option value="week">This Week</option>
            </select>
          </div>
        </div>

        {/* Top High Spend Highlight Banner */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '24px'
        }}>
          {/* Top Category Banner */}
          <div className="clay-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f3ebff 100%)', border: '1.5px solid #d8ccff', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #7c5cfc, #6366f1)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(124, 92, 252, 0.3)'
              }}>
                <Flame size={20} />
              </div>
              <div>
                <span className="text-xs text-muted" style={{ fontWeight: 600 }}>HIGHEST SPEND CATEGORY</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{topCategory ? topCategory._id : 'N/A'}</h3>
                  <span className="badge badge-primary">{formatCurrency(topCategory?.total)} ({topCategoryPercent}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Peak Single Expense Banner */}
          <div className="clay-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fff0f5 100%)', border: '1.5px solid #fecdd3', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ef4444, #f43f5e)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
              }}>
                <Award size={20} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <span className="text-xs text-muted" style={{ fontWeight: 600 }}>HIGHEST SINGLE TRANSACTION</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {highestExpense ? highestExpense.description : 'N/A'}
                  </h3>
                  <span className="badge badge-danger" style={{ flexShrink: 0 }}>
                    {formatCurrency(highestExpense?.amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: '20px',
          marginBottom: '24px'
        }}>
          {/* 1: Monthly Spend */}
          <div className="card">
            <div className="flex-between mb-md">
              <h3><BarChart3 size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Monthly Spending</h3>
            </div>
            {barValues.every(v => v === 0) ? (
              <div className="empty-chart-placeholder">
                <TrendingUp size={36} color="#a8a6d1" />
                <p className="text-muted">No monthly spending data available.</p>
              </div>
            ) : (
              <div className="chart-wrapper" style={{ height: '240px' }}>
                <Bar
                  data={barChartData}
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

          {/* 2: Category Share */}
          <div className="card">
            <div className="flex-between mb-md">
              <h3><PieChart size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Category Share</h3>
            </div>
            {categoryBreakdown.length === 0 ? (
              <div className="empty-chart-placeholder">
                <Layers size={36} color="#a8a6d1" />
                <p className="text-muted">No category breakdown recorded.</p>
              </div>
            ) : (
              <div className="chart-wrapper" style={{ height: '240px' }}>
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

          {/* 3: Daily Spend Trend */}
          <div className="card">
            <div className="flex-between mb-md">
              <h3><TrendingUp size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Daily Spending Trend</h3>
            </div>
            {lineValues.every(v => v === 0) ? (
              <div className="empty-chart-placeholder">
                <TrendingUp size={36} color="#a8a6d1" />
                <p className="text-muted">No daily spending records found.</p>
              </div>
            ) : (
              <div className="chart-wrapper" style={{ height: '240px' }}>
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

          {/* 4: Payment Methods */}
          <div className="card">
            <div className="flex-between mb-md">
              <h3><CreditCard size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Payment Methods</h3>
            </div>
            {pmValues.length === 0 ? (
              <div className="empty-chart-placeholder">
                <CreditCard size={36} color="#a8a6d1" />
                <p className="text-muted">No payment method data recorded.</p>
              </div>
            ) : (
              <div className="chart-wrapper" style={{ height: '240px' }}>
                <Bar
                  data={pmChartData}
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
        </div>

        {/* Highest Spend Transactions Table */}
        <div className="card mb-lg">
          <div className="flex-between mb-md">
            <div>
              <h3>High Spend Transactions Leaderboard</h3>
              <p className="text-muted text-sm" style={{ margin: 0 }}>Top 5 largest transactions</p>
            </div>
            <span className="badge badge-danger">Peak Expenses</span>
          </div>

          {topExpensesList.length === 0 ? (
            <p className="text-muted">No transactions found.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {topExpensesList.map((exp, index) => (
                  <tr key={exp._id || index}>
                    <td style={{ fontWeight: 700, color: index === 0 ? 'var(--danger)' : 'var(--text-2)' }}>
                      #{index + 1}
                    </td>
                    <td style={{ fontWeight: 600 }}>{exp.description}</td>
                    <td>
                      <span className="badge badge-primary">{exp.category}</span>
                    </td>
                    <td>{new Date(exp.date).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 800, color: 'var(--primary-dark)', fontSize: '1rem' }}>
                      {formatCurrency(exp.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
};
