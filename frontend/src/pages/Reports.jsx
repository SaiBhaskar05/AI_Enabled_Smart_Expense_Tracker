import React, { useState, useEffect } from 'react';
import { reportsAPI, importExportAPI, emailAPI } from '../services/api';
import { Layout } from '../components/Layout';
import { Download, Mail, Calendar, TrendingUp, PieChart, FileText, Send, Users, X, Check } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export const Reports = () => {
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [emailSending, setEmailSending] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTarget, setEmailTarget] = useState('me'); // 'me' | 'all' | 'custom'
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');

  useEffect(() => {
    loadReport();
  }, [period, startDate, endDate]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await reportsAPI.get({ period, startDate, endDate });
      setReportData(res.data?.data || null);
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await importExportAPI.export({ startDate, endDate });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `financial_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Report CSV downloaded successfully!');
    } catch (error) {
      console.error('Failed to export CSV:', error);
      try {
        const url = importExportAPI.exportUrl({ startDate, endDate });
        window.open(url, '_blank');
      } catch (fallbackErr) {
        toast.error('Failed to export CSV file');
      }
    }
  };

  const handleSendEmailReport = async (e) => {
    e.preventDefault();
    setEmailSending(true);
    try {
      let freq = period === 'today' ? 'daily' : period === 'week' ? 'weekly' : 'monthly';

      if (emailTarget === 'custom') {
        if (!customEmail) {
          toast.error('Please enter recipient email');
          setEmailSending(false);
          return;
        }
        const res = await emailAPI.sendToRecipient({
          email: customEmail,
          name: customName,
          frequency: freq
        });
        toast.success(res.data?.message || `Report sent to ${customEmail}!`);
      } else {
        const includeRecipients = emailTarget === 'all';
        let res;
        if (freq === 'daily') res = await emailAPI.sendDaily(includeRecipients);
        else if (freq === 'weekly') res = await emailAPI.sendWeekly(includeRecipients);
        else res = await emailAPI.sendMonthly(includeRecipients);

        toast.success(res.data?.message || 'Report dispatched successfully!');
      }

      setShowEmailModal(false);
    } catch (error) {
      console.error('Failed to send email:', error);
      toast.error(error.response?.data?.message || 'Failed to send email report');
    } finally {
      setEmailSending(false);
    }
  };

  const formatCurrency = (val) =>
    `₹${Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  const summary = reportData?.summary || { total: 0, count: 0, avg: 0, max: 0 };
  const categories = reportData?.categoryBreakdown || [];
  const topExpenses = reportData?.topExpenses || [];

  return (
    <Layout>
      <Toaster position="top-right" />
      <div className="page-container" style={{ padding: 'var(--spacing-lg)' }}>
        <div className="flex-between mb-lg">
          <div>
            <h1>Spending Reports</h1>
            <p className="text-muted">Generate, analyze, and export comprehensive financial reports</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <button className="btn btn-primary" onClick={handleExportCSV}>
              <Download size={18} /> Export CSV
            </button>
            <button className="btn btn-secondary" onClick={() => setShowEmailModal(true)}>
              <Mail size={18} /> Email Report
            </button>
          </div>
        </div>


        {/* Period Selector */}
        <div className="card mb-lg">
          <h3 className="mb-md">Select Report Period</h3>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className={`btn ${period === 'today' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPeriod('today')}
            >
              Today
            </button>
            <button
              className={`btn ${period === 'week' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPeriod('week')}
            >
              This Week
            </button>
            <button
              className={`btn ${period === 'month' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPeriod('month')}
            >
              This Month
            </button>
            <button
              className={`btn ${period === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPeriod('custom')}
            >
              Custom Range
            </button>

            {period === 'custom' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
                <input
                  type="date"
                  className="input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span>to</span>
                <input
                  type="date"
                  className="input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p className="text-muted">Generating report data...</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
            {/* Summary Statistics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--spacing-md)' }}>
              <div className="card">
                <p className="text-muted text-sm" style={{ margin: 0 }}>Total Spending</p>
                <h2 style={{ color: 'var(--primary-dark)', margin: '4px 0' }}>{formatCurrency(summary.total)}</h2>
                <span className="text-xs text-muted">In selected period</span>
              </div>
              <div className="card">
                <p className="text-muted text-sm" style={{ margin: 0 }}>Transactions</p>
                <h2 style={{ margin: '4px 0' }}>{summary.count}</h2>
                <span className="text-xs text-muted">Total recorded</span>
              </div>
              <div className="card">
                <p className="text-muted text-sm" style={{ margin: 0 }}>Average Spend</p>
                <h2 style={{ margin: '4px 0' }}>{formatCurrency(summary.avg)}</h2>
                <span className="text-xs text-muted">Per transaction</span>
              </div>
              <div className="card">
                <p className="text-muted text-sm" style={{ margin: 0 }}>Largest Expense</p>
                <h2 style={{ margin: '4px 0' }}>{formatCurrency(summary.max)}</h2>
                <span className="text-xs text-muted">Peak transaction</span>
              </div>
            </div>

            {/* Category Breakdown & Top Expenses */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 'var(--spacing-lg)' }}>
              {/* Category Breakdown List */}
              <div className="card">
                <h3>Category Breakdown</h3>
                {categories.length === 0 ? (
                  <p className="text-muted mt-md">No expenses recorded for this period.</p>
                ) : (
                  <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {categories.map((cat) => {
                      const pct = summary.total > 0 ? Math.round((cat.total / summary.total) * 100) : 0;
                      return (
                        <div key={cat._id}>
                          <div className="flex-between text-sm mb-xs">
                            <span style={{ fontWeight: 600 }}>{cat._id || 'Uncategorized'} ({cat.count})</span>
                            <span style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>{formatCurrency(cat.total)} ({pct}%)</span>
                          </div>
                          <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary)', borderRadius: '4px' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Top Expenses */}
              <div className="card">
                <h3>Top Expenses</h3>
                {topExpenses.length === 0 ? (
                  <p className="text-muted mt-md">No expenses found for this period.</p>
                ) : (
                  <table className="table" style={{ marginTop: 'var(--spacing-md)' }}>
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topExpenses.map((exp) => (
                        <tr key={exp._id}>
                          <td style={{ fontWeight: 500 }}>{exp.description}</td>
                          <td><span className="badge badge-primary">{exp.category}</span></td>
                          <td style={{ fontWeight: 600 }}>{formatCurrency(exp.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Email Report Destination Modal */}
        {showEmailModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 'var(--spacing-md)'
            }}
          >
            <div
              className="card"
              style={{
                width: '100%',
                maxWidth: '480px',
                background: 'white',
                boxShadow: 'var(--shadow-xl)'
              }}
            >
              <div className="flex-between mb-md">
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail className="text-primary" size={22} /> Send Report via Email
                </h3>
                <button
                  className="btn btn-tertiary btn-sm"
                  onClick={() => setShowEmailModal(false)}
                  style={{ padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-muted text-sm mb-lg">
                Dispatch the <strong>{period === 'today' ? 'Daily' : period === 'week' ? 'Weekly' : 'Monthly'}</strong> report to yourself, all saved family/friends, or an ad-hoc recipient.
              </p>

              <form onSubmit={handleSendEmailReport}>
                <div className="form-group">
                  <label>Destination</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="radio"
                        name="emailTarget"
                        value="me"
                        checked={emailTarget === 'me'}
                        onChange={(e) => setEmailTarget(e.target.value)}
                        style={{ accentColor: 'var(--primary-600)' }}
                      />
                      <span><strong>My Email Only</strong> (Personal registered address)</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="radio"
                        name="emailTarget"
                        value="all"
                        checked={emailTarget === 'all'}
                        onChange={(e) => setEmailTarget(e.target.value)}
                        style={{ accentColor: 'var(--primary-600)' }}
                      />
                      <span><strong>Myself + All Active Family & Friends</strong></span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="radio"
                        name="emailTarget"
                        value="custom"
                        checked={emailTarget === 'custom'}
                        onChange={(e) => setEmailTarget(e.target.value)}
                        style={{ accentColor: 'var(--primary-600)' }}
                      />
                      <span><strong>Specific Friend or Family Email</strong></span>
                    </label>
                  </div>
                </div>

                {emailTarget === 'custom' && (
                  <div style={{ padding: '12px', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-md)' }}>
                    <div className="form-group mb-sm">
                      <label style={{ fontSize: '0.875rem' }}>Recipient Email *</label>
                      <input
                        type="email"
                        required
                        className="input"
                        placeholder="e.g. brother@example.com"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.875rem' }}>Recipient Name (Optional)</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g. Brother John"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'flex-end', marginTop: 'var(--spacing-lg)' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowEmailModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={emailSending}
                  >
                    <Send size={18} /> {emailSending ? 'Sending...' : 'Send Report'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>

  );
};

