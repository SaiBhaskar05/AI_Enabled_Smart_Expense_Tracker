import React, { useState, useEffect } from 'react';
import { emailAPI } from '../services/api';
import { Layout } from '../components/Layout';
import {
  Mail, Users, Plus, Trash2, Edit2, Check, X, Send,
  Clock, Calendar, UserPlus, Heart, CheckCircle2,
  Sparkles, RefreshCw
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export const EmailReports = () => {
  const [preferences, setPreferences] = useState({
    dailySummary: true,
    weeklySummary: true,
    monthlySummary: true,
    budgetAlerts: true,
    recipients: []
  });
  const [loading, setLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [sendingKey, setSendingKey] = useState('');

  // Modal / Form state for Add/Edit recipient
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [editingRecipientId, setEditingRecipientId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    relationship: 'Family',
    daily: false,
    weekly: true,
    monthly: true,
    active: true
  });

  // Instant share modal state
  const [showInstantModal, setShowInstantModal] = useState(false);
  const [instantForm, setInstantForm] = useState({
    email: '',
    name: '',
    relationship: 'Family',
    frequency: 'monthly'
  });
  const [testingSmtp, setTestingSmtp] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const handleTestConnection = async () => {
    setTestingSmtp(true);
    const toastId = toast.loading('Testing SMTP server connection on backend...');
    try {
      const res = await emailAPI.testConnection();
      toast.success(res.data?.message || 'SMTP Connection Verified Successfully!', { id: toastId, duration: 4000 });
    } catch (error) {
      console.error('SMTP test failed:', error);
      const msg = error.response?.data?.message || error.message || 'SMTP connection failed';
      toast.error(msg, { id: toastId, duration: 6000 });
    } finally {
      setTestingSmtp(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const res = await emailAPI.getPreferences();
      if (res.data?.data?.preferences) {
        setPreferences(res.data.data.preferences);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      toast.error('Failed to load email preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePref = (key) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    try {
      await emailAPI.updatePreferences({
        dailySummary: preferences.dailySummary,
        weeklySummary: preferences.weeklySummary,
        monthlySummary: preferences.monthlySummary,
        budgetAlerts: preferences.budgetAlerts
      });
      toast.success('Digest preferences saved!');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast.error(error.response?.data?.message || 'Failed to save preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  // Open modal to add new recipient
  const handleOpenAddRecipient = () => {
    setEditingRecipientId(null);
    setFormData({
      name: '',
      email: '',
      relationship: 'Family',
      daily: false,
      weekly: true,
      monthly: true,
      active: true
    });
    setShowRecipientModal(true);
  };

  // Open modal to edit recipient
  const handleOpenEditRecipient = (r) => {
    setEditingRecipientId(r._id);
    setFormData({
      name: r.name || '',
      email: r.email,
      relationship: r.relationship || 'Family',
      daily: r.daily,
      weekly: r.weekly,
      monthly: r.monthly,
      active: r.active
    });
    setShowRecipientModal(true);
  };

  // Save (Create or Update) Recipient
  const handleSaveRecipient = async (e) => {
    e.preventDefault();
    if (!formData.email) {
      toast.error('Please enter an email address');
      return;
    }

    if (!formData.daily && !formData.weekly && !formData.monthly) {
      toast.error('Please select at least one frequency (Daily, Weekly, or Monthly)');
      return;
    }

    try {
      if (editingRecipientId) {
        const res = await emailAPI.updateRecipient(editingRecipientId, formData);
        setPreferences(res.data.data.preferences);
        toast.success('Contact preferences updated!');
      } else {
        const res = await emailAPI.addRecipient(formData);
        setPreferences(res.data.data.preferences);
        toast.success('Contact added to your auto-reports!');
      }
      setShowRecipientModal(false);
    } catch (error) {
      console.error('Failed to save recipient:', error);
      toast.error(error.response?.data?.message || 'Failed to save recipient');
    }
  };

  // Delete recipient
  const handleDeleteRecipient = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name || 'this contact'}?`)) {
      return;
    }

    try {
      const res = await emailAPI.deleteRecipient(id);
      setPreferences(res.data.data.preferences);
      toast.success('Contact removed');
    } catch (error) {
      console.error('Failed to delete recipient:', error);
      toast.error(error.response?.data?.message || 'Failed to remove contact');
    }
  };

  // Toggle recipient active status
  const handleToggleRecipientActive = async (r) => {
    try {
      const res = await emailAPI.updateRecipient(r._id, { active: !r.active });
      setPreferences(res.data.data.preferences);
      toast.success(r.active ? `${r.name || r.email} paused` : `${r.name || r.email} activated`);
    } catch (error) {
      console.error('Failed to toggle status:', error);
      toast.error('Failed to update status');
    }
  };

  // Manual Trigger: Send Personal Digest
  const handleSendManual = async (type) => {
    setSendingKey(`personal-${type}`);
    try {
      let res;
      if (type === 'daily') res = await emailAPI.sendDaily();
      else if (type === 'weekly') res = await emailAPI.sendWeekly();
      else if (type === 'monthly') res = await emailAPI.sendMonthly();
      toast.success(res.data?.message || `${type.charAt(0).toUpperCase() + type.slice(1)} digest dispatched!`);
    } catch (error) {
      console.error('Send error:', error);
      toast.error(error.response?.data?.message || 'Failed to send digest');
    } finally {
      setSendingKey('');
    }
  };

  // Send summary directly to a specific saved recipient
  const handleSendToSavedRecipient = async (r, freq) => {
    const key = `contact-${r._id}-${freq}`;
    setSendingKey(key);
    try {
      const res = await emailAPI.sendToRecipient({
        recipientId: r._id,
        frequency: freq
      });
      toast.success(res.data?.message || `${freq.charAt(0).toUpperCase() + freq.slice(1)} summary sent to ${r.name || r.email}!`);
    } catch (error) {
      console.error('Send to recipient error:', error);
      toast.error(error.response?.data?.message || 'Failed to send report');
    } finally {
      setSendingKey('');
    }
  };

  // Instant share to custom address
  const handleInstantShare = async (e) => {
    e.preventDefault();
    if (!instantForm.email) {
      toast.error('Please enter an email');
      return;
    }

    setSendingKey('instant');
    try {
      const res = await emailAPI.sendToRecipient(instantForm);
      toast.success(res.data?.message || 'Report sent successfully!');
      setShowInstantModal(false);
      setInstantForm({ email: '', name: '', relationship: 'Family', frequency: 'monthly' });
    } catch (error) {
      console.error('Instant share error:', error);
      toast.error(error.response?.data?.message || 'Failed to send report');
    } finally {
      setSendingKey('');
    }
  };

  const recipients = preferences.recipients || [];
  const activeCount = recipients.filter(r => r.active).length;

  const relationshipBadges = {
    Family: { bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' },
    Friend: { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
    Spouse: { bg: '#fce7f3', color: '#be185d', border: '#fbcfe8' },
    Parent: { bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
    Sibling: { bg: '#ede9fe', color: '#6d28d9', border: '#ddd6fe' },
    Child: { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' },
    Accountant: { bg: '#ffedd5', color: '#c2410c', border: '#fed7aa' },
    Other: { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' }
  };

  return (
    <Layout>
      <Toaster position="top-right" />
      <div className="page-container" style={{ padding: '2rem 1.5rem', maxWidth: '1120px', margin: '0 auto' }}>
        
        {/* Header Banner */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
          marginBottom: '2.5rem',
          background: 'linear-gradient(135deg, #ffffff 0%, #f9f5ff 100%)',
          padding: '1.75rem 2rem',
          borderRadius: '24px',
          boxShadow: '0 8px 30px rgba(124, 92, 252, 0.1)',
          border: '1.5px solid rgba(168, 85, 247, 0.2)'
        }}>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '1.85rem', margin: 0, color: 'var(--gray-900)' }}>
              <span style={{
                background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                color: 'white',
                padding: '10px',
                borderRadius: '14px',
                display: 'inline-flex',
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)'
              }}>
                <Mail size={24} />
              </span>
              Email Reports & Auto-Sharing
            </h1>
            <p className="text-muted" style={{ marginTop: '0.5rem', marginBottom: 0, fontSize: '0.95rem' }}>
              Schedule automated financial summaries for yourself and automatically share updates with family & friends.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Test SMTP Connection Button */}
            <button
              className="btn btn-secondary"
              onClick={handleTestConnection}
              disabled={testingSmtp}
              title="Test backend SMTP connection"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.75rem 1.25rem',
                fontSize: '0.925rem',
                fontWeight: 700,
                borderRadius: '999px',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={16} className={testingSmtp ? 'spin' : ''} />
              {testingSmtp ? 'Testing Server...' : 'Test SMTP Connection'}
            </button>

            {/* Quick Send Button - Solid Vibrant Active Indigo */}
            <button
              className="btn"
              onClick={() => setShowInstantModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.75rem 1.35rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#ffffff',
                borderRadius: '999px',
                border: 'none',
                boxShadow: '0 6px 18px rgba(99, 102, 241, 0.35)',
                cursor: 'pointer'
              }}
            >
              <Send size={18} /> Quick Send
            </button>

            {/* Add Family / Friend Button - Solid Vibrant Active Purple */}
            <button
              className="btn"
              onClick={handleOpenAddRecipient}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.75rem 1.45rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                color: '#ffffff',
                borderRadius: '999px',
                border: 'none',
                boxShadow: '0 6px 20px rgba(124, 58, 237, 0.4)',
                cursor: 'pointer'
              }}
            >
              <UserPlus size={18} /> Add Family / Friend
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div className="skeleton" style={{ width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 1.5rem' }} />
            <p className="text-muted">Loading preferences...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            
            {/* 1. Friends & Family Shared Reports Section */}
            <div className="card" style={{ padding: '2.25rem', borderRadius: '24px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                borderBottom: '1px solid var(--gray-200)',
                paddingBottom: '1.25rem',
                marginBottom: '1.75rem'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Users size={24} style={{ color: 'var(--primary-600)' }} />
                    <h2 style={{ fontSize: '1.35rem', margin: 0, color: 'var(--gray-900)' }}>
                      Family & Friends Scheduled Reports
                    </h2>
                    <span
                      style={{
                        background: activeCount > 0 ? '#ede9fe' : 'var(--gray-100)',
                        color: activeCount > 0 ? '#6d28d9' : 'var(--gray-600)',
                        padding: '4px 12px',
                        borderRadius: '999px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        border: activeCount > 0 ? '1px solid #ddd6fe' : '1px solid var(--gray-200)'
                      }}
                    >
                      {activeCount} Active Contact{activeCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '0.35rem', marginBottom: 0 }}>
                    Automatically email spending summaries to your family, spouse, parents, or accountant on their chosen frequency.
                  </p>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleOpenAddRecipient}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0.65rem 1.35rem',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%) !important',
                    color: '#ffffff !important',
                    borderRadius: '999px',
                    border: 'none',
                    boxShadow: '0 6px 18px rgba(124, 58, 237, 0.4)',
                    cursor: 'pointer',
                    position: 'relative',
                    zIndex: 2
                  }}
                >
                  <Plus size={18} strokeWidth={2.5} color="#ffffff" /> Add Contact
                </button>
              </div>

              {recipients.length === 0 ? (
                <div className="empty-state" style={{ padding: '3.5rem 2rem', borderRadius: '20px', background: 'var(--gray-50)' }}>
                  <div className="empty-state-icon" style={{ marginBottom: '1rem' }}>
                    <Heart size={48} style={{ color: 'var(--primary-400)' }} />
                  </div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem' }}>No Contacts Added Yet</h3>
                  <p style={{ maxWidth: '480px', margin: '0 auto 1.5rem', color: 'var(--gray-600)', fontSize: '0.95rem' }}>
                    Keep your loved ones in the loop! Add family members or friends to send them automated <strong>Daily</strong>, <strong>Weekly</strong>, or <strong>Monthly</strong> expense reports.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={handleOpenAddRecipient}
                    style={{
                      padding: '0.75rem 1.6rem',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%) !important',
                      color: '#ffffff !important',
                      borderRadius: '999px',
                      border: 'none',
                      boxShadow: '0 6px 20px rgba(124, 58, 237, 0.4)',
                      cursor: 'pointer',
                      position: 'relative',
                      zIndex: 2
                    }}
                  >
                    <Plus size={18} strokeWidth={2.5} color="#ffffff" /> Add Your First Contact
                  </button>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 290px), 1fr))',
                  gap: '1.25rem'
                }}>
                  {recipients.map((r) => {
                    const badgeStyle = relationshipBadges[r.relationship] || relationshipBadges.Other;
                    return (
                      <div
                        key={r._id}
                        style={{
                          background: r.active ? 'white' : 'var(--gray-50)',
                          border: `1.5px solid ${r.active ? 'rgba(168, 85, 247, 0.3)' : 'var(--gray-200)'}`,
                          borderRadius: '20px',
                          padding: '1.5rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: r.active ? '0 6px 20px rgba(124, 92, 252, 0.08)' : 'none',
                          opacity: r.active ? 1 : 0.75,
                          transition: 'all 0.2s ease',
                          gap: '1.25rem'
                        }}
                      >
                        <div>
                          {/* Header & Tag */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--gray-900)' }}>
                                {r.name || 'Unnamed Contact'}
                              </h4>
                              <p className="text-muted" style={{ fontSize: '0.875rem', margin: '3px 0 0 0', wordBreak: 'break-all' }}>
                                {r.email}
                              </p>
                            </div>
                            <span
                              style={{
                                background: badgeStyle.bg,
                                color: badgeStyle.color,
                                border: `1px solid ${badgeStyle.border}`,
                                padding: '3px 10px',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: 700
                              }}
                            >
                              {r.relationship}
                            </span>
                          </div>

                          {/* Frequencies Badges */}
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '1rem 0 0.5rem 0' }}>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                background: r.daily ? '#dcfce7' : '#f1f5f9',
                                color: r.daily ? '#16a34a' : '#94a3b8',
                                fontWeight: 700,
                                border: r.daily ? '1px solid #bbf7d0' : '1px solid transparent',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {r.daily ? <Check size={12} /> : <X size={12} />}
                              <span>{r.daily ? 'Daily (8 PM)' : 'Daily'}</span>
                            </span>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                background: r.weekly ? '#dbeafe' : '#f1f5f9',
                                color: r.weekly ? '#2563eb' : '#94a3b8',
                                fontWeight: 700,
                                border: r.weekly ? '1px solid #bfdbfe' : '1px solid transparent',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {r.weekly ? <Check size={12} /> : <X size={12} />}
                              <span>{r.weekly ? 'Weekly (Sun)' : 'Weekly'}</span>
                            </span>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                background: r.monthly ? '#f3e8ff' : '#f1f5f9',
                                color: r.monthly ? '#9333ea' : '#94a3b8',
                                fontWeight: 700,
                                border: r.monthly ? '1px solid #e9d5ff' : '1px solid transparent',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {r.monthly ? <Check size={12} /> : <X size={12} />}
                              <span>{r.monthly ? 'Monthly (1st)' : 'Monthly'}</span>
                            </span>
                          </div>
                        </div>

                        {/* Card Bottom Actions */}
                        <div style={{
                          borderTop: '1px solid var(--gray-100)',
                          paddingTop: '1rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '0.5rem'
                        }}>
                          {/* Send test buttons with permanent active colors */}
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {r.daily && (
                              <button
                                className="btn"
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '0.785rem',
                                  fontWeight: 700,
                                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '999px',
                                  boxShadow: '0 3px 10px rgba(16, 185, 129, 0.3)',
                                  cursor: 'pointer'
                                }}
                                title="Send Daily summary to this contact now"
                                disabled={sendingKey === `contact-${r._id}-daily`}
                                onClick={() => handleSendToSavedRecipient(r, 'daily')}
                              >
                                {sendingKey === `contact-${r._id}-daily` ? 'Sending...' : 'Send Daily'}
                              </button>
                            )}
                            {r.weekly && (
                              <button
                                className="btn"
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '0.785rem',
                                  fontWeight: 700,
                                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '999px',
                                  boxShadow: '0 3px 10px rgba(59, 130, 246, 0.3)',
                                  cursor: 'pointer'
                                }}
                                title="Send Weekly summary to this contact now"
                                disabled={sendingKey === `contact-${r._id}-weekly`}
                                onClick={() => handleSendToSavedRecipient(r, 'weekly')}
                              >
                                {sendingKey === `contact-${r._id}-weekly` ? 'Sending...' : 'Send Weekly'}
                              </button>
                            )}
                            {r.monthly && (
                              <button
                                className="btn"
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '0.785rem',
                                  fontWeight: 700,
                                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '999px',
                                  boxShadow: '0 3px 10px rgba(139, 92, 246, 0.3)',
                                  cursor: 'pointer'
                                }}
                                title="Send Monthly summary to this contact now"
                                disabled={sendingKey === `contact-${r._id}-monthly`}
                                onClick={() => handleSendToSavedRecipient(r, 'monthly')}
                              >
                                {sendingKey === `contact-${r._id}-monthly` ? 'Sending...' : 'Send Monthly'}
                              </button>
                            )}
                          </div>

                          {/* Edit / Delete / Toggle */}
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              className="btn btn-sm"
                              style={{
                                padding: '6px 8px',
                                borderRadius: '8px',
                                background: '#ede9fe',
                                color: '#6d28d9',
                                border: '1px solid #ddd6fe',
                                cursor: 'pointer'
                              }}
                              title="Edit Contact"
                              onClick={() => handleOpenEditRecipient(r)}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              className="btn btn-sm"
                              style={{
                                padding: '6px 8px',
                                borderRadius: '8px',
                                background: '#fee2e2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                cursor: 'pointer'
                              }}
                              title="Remove Contact"
                              onClick={() => handleDeleteRecipient(r._id, r.name)}
                            >
                              <Trash2 size={16} />
                            </button>
                            <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', margin: 0 }} title={r.active ? 'Active (Click to pause)' : 'Paused (Click to activate)'}>
                              <input
                                type="checkbox"
                                checked={r.active}
                                onChange={() => handleToggleRecipientActive(r)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary-600)' }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Personal Subscriptions & Scheduled Digest */}
            <div className="card" style={{ padding: '2.25rem', borderRadius: '24px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                borderBottom: '1px solid var(--gray-200)',
                paddingBottom: '1.25rem',
                marginBottom: '1.75rem'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Clock size={24} style={{ color: 'var(--primary-600)' }} />
                    <h2 style={{ fontSize: '1.35rem', margin: 0, color: 'var(--gray-900)' }}>
                      My Personal Digest Preferences
                    </h2>
                  </div>
                  <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '0.35rem', marginBottom: 0 }}>
                    Configure automated digest reports sent directly to your own registered email address.
                  </p>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleSavePreferences}
                  disabled={savingPrefs}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0.65rem 1.4rem',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%) !important',
                    color: '#ffffff !important',
                    borderRadius: '999px',
                    border: 'none',
                    boxShadow: '0 6px 18px rgba(124, 58, 237, 0.4)',
                    cursor: 'pointer',
                    position: 'relative',
                    zIndex: 2
                  }}
                >
                  <Check size={18} strokeWidth={2.5} color="#ffffff" /> {savingPrefs ? 'Saving...' : 'Save Settings'}
                </button>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem'
              }}>
                {/* Daily Summary Box */}
                <div
                  style={{
                    padding: '1.5rem',
                    border: `1.5px solid ${preferences.dailySummary ? 'rgba(168, 85, 247, 0.3)' : 'var(--gray-200)'}`,
                    borderRadius: '18px',
                    background: preferences.dailySummary ? 'linear-gradient(145deg, #ffffff, #faf5ff)' : 'var(--gray-50)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: preferences.dailySummary ? '0 4px 16px rgba(124, 92, 252, 0.06)' : 'none'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Daily Summary</h3>
                      <input
                        type="checkbox"
                        checked={preferences.dailySummary}
                        onChange={() => handleTogglePref('dailySummary')}
                        style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--primary-600)' }}
                      />
                    </div>
                    <p className="text-muted" style={{ fontSize: '0.875rem', lineHeight: '1.5', margin: 0 }}>
                      Dispatched every evening at 8:00 PM with daily spending totals and categorized breakdown.
                    </p>
                  </div>
                  <div style={{ marginTop: '1.5rem' }}>
                    <button
                      className="btn"
                      style={{
                        width: '100%',
                        fontWeight: 700,
                        padding: '0.6rem 1rem',
                        fontSize: '0.875rem',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '999px',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleSendManual('daily')}
                      disabled={sendingKey === 'personal-daily'}
                    >
                      <Send size={14} /> {sendingKey === 'personal-daily' ? 'Dispatching...' : 'Test Send Today'}
                    </button>
                  </div>
                </div>

                {/* Weekly Summary Box */}
                <div
                  style={{
                    padding: '1.5rem',
                    border: `1.5px solid ${preferences.weeklySummary ? 'rgba(168, 85, 247, 0.3)' : 'var(--gray-200)'}`,
                    borderRadius: '18px',
                    background: preferences.weeklySummary ? 'linear-gradient(145deg, #ffffff, #faf5ff)' : 'var(--gray-50)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: preferences.weeklySummary ? '0 4px 16px rgba(124, 92, 252, 0.06)' : 'none'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Weekly Summary</h3>
                      <input
                        type="checkbox"
                        checked={preferences.weeklySummary}
                        onChange={() => handleTogglePref('weeklySummary')}
                        style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--primary-600)' }}
                      />
                    </div>
                    <p className="text-muted" style={{ fontSize: '0.875rem', lineHeight: '1.5', margin: 0 }}>
                      Dispatched every Sunday at 9:00 AM with week-over-week trends and top expense categories.
                    </p>
                  </div>
                  <div style={{ marginTop: '1.5rem' }}>
                    <button
                      className="btn"
                      style={{
                        width: '100%',
                        fontWeight: 700,
                        padding: '0.6rem 1rem',
                        fontSize: '0.875rem',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '999px',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleSendManual('weekly')}
                      disabled={sendingKey === 'personal-weekly'}
                    >
                      <Send size={14} /> {sendingKey === 'personal-weekly' ? 'Dispatching...' : 'Test Send Weekly'}
                    </button>
                  </div>
                </div>

                {/* Monthly Summary Box */}
                <div
                  style={{
                    padding: '1.5rem',
                    border: `1.5px solid ${preferences.monthlySummary ? 'rgba(168, 85, 247, 0.3)' : 'var(--gray-200)'}`,
                    borderRadius: '18px',
                    background: preferences.monthlySummary ? 'linear-gradient(145deg, #ffffff, #faf5ff)' : 'var(--gray-50)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: preferences.monthlySummary ? '0 4px 16px rgba(124, 92, 252, 0.06)' : 'none'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Monthly Summary</h3>
                      <input
                        type="checkbox"
                        checked={preferences.monthlySummary}
                        onChange={() => handleTogglePref('monthlySummary')}
                        style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--primary-600)' }}
                      />
                    </div>
                    <p className="text-muted" style={{ fontSize: '0.875rem', lineHeight: '1.5', margin: 0 }}>
                      Dispatched on the 1st of every month with budget utilization tracking and comprehensive analytics.
                    </p>
                  </div>
                  <div style={{ marginTop: '1.5rem' }}>
                    <button
                      className="btn"
                      style={{
                        width: '100%',
                        fontWeight: 700,
                        padding: '0.6rem 1rem',
                        fontSize: '0.875rem',
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '999px',
                        boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleSendManual('monthly')}
                      disabled={sendingKey === 'personal-monthly'}
                    >
                      <Send size={14} /> {sendingKey === 'personal-monthly' ? 'Dispatching...' : 'Test Send Monthly'}
                    </button>
                  </div>
                </div>

                {/* Budget Alerts Box */}
                <div
                  style={{
                    padding: '1.5rem',
                    border: `1.5px solid ${preferences.budgetAlerts ? 'rgba(16, 185, 129, 0.3)' : 'var(--gray-200)'}`,
                    borderRadius: '18px',
                    background: preferences.budgetAlerts ? 'linear-gradient(145deg, #ffffff, #f0fdf4)' : 'var(--gray-50)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: preferences.budgetAlerts ? '0 4px 16px rgba(16, 185, 129, 0.06)' : 'none'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Budget Alerts</h3>
                      <input
                        type="checkbox"
                        checked={preferences.budgetAlerts}
                        onChange={() => handleTogglePref('budgetAlerts')}
                        style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--accent-green)' }}
                      />
                    </div>
                    <p className="text-muted" style={{ fontSize: '0.875rem', lineHeight: '1.5', margin: 0 }}>
                      Instant trigger notifications when monthly spending crosses 80% or exceeds 100% of category limits.
                    </p>
                  </div>
                  <div style={{ marginTop: '1.5rem' }}>
                    <span className="badge badge-success" style={{ width: '100%', justifyContent: 'center', padding: '0.55rem', fontWeight: 700 }}>
                      <Check size={14} style={{ marginRight: '4px' }} /> Active Protection
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Modal: Add/Edit Recipient */}
        {showRecipientModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.55)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1.5rem'
            }}
          >
            <div
              className="card"
              style={{
                width: '100%',
                maxWidth: '540px',
                background: 'white',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
                borderRadius: '24px',
                padding: '2rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.3rem' }}>
                  {editingRecipientId ? 'Edit Contact & Preferences' : 'Add Family Member or Friend'}
                </h3>
                <button
                  className="btn btn-tertiary btn-sm"
                  onClick={() => setShowRecipientModal(false)}
                  style={{ padding: '6px' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveRecipient}>
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Name / Nickname</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Mom, Dad, Sarah, Accountant John"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Email Address *</label>
                  <input
                    type="email"
                    required
                    className="input"
                    placeholder="e.g. contact@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Relationship</label>
                  <select
                    className="select"
                    value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  >
                    <option value="Family">Family Member</option>
                    <option value="Friend">Friend</option>
                    <option value="Spouse">Spouse / Partner</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Child">Child</option>
                    <option value="Accountant">Accountant / Advisor</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                  <label style={{ fontWeight: 600, marginBottom: '0.65rem', display: 'block' }}>Scheduled Frequencies</label>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    padding: '1rem',
                    background: 'var(--gray-50)',
                    borderRadius: '14px',
                    border: '1px solid var(--gray-200)'
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0, fontSize: '0.9rem' }}>
                      <input
                        type="checkbox"
                        checked={formData.daily}
                        onChange={(e) => setFormData({ ...formData, daily: e.target.checked })}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--primary-600)' }}
                      />
                      <span><strong>Daily Summary:</strong> Dispatched every evening at 8:00 PM</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0, fontSize: '0.9rem' }}>
                      <input
                        type="checkbox"
                        checked={formData.weekly}
                        onChange={(e) => setFormData({ ...formData, weekly: e.target.checked })}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--primary-600)' }}
                      />
                      <span><strong>Weekly Summary:</strong> Dispatched every Sunday at 9:00 AM</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0, fontSize: '0.9rem' }}>
                      <input
                        type="checkbox"
                        checked={formData.monthly}
                        onChange={(e) => setFormData({ ...formData, monthly: e.target.checked })}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--primary-600)' }}
                      />
                      <span><strong>Monthly Summary:</strong> Dispatched on the 1st of every month</span>
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowRecipientModal(false)}
                    style={{ fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{
                      fontWeight: 700,
                      padding: '0.65rem 1.4rem',
                      background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%) !important',
                      color: '#ffffff !important',
                      border: 'none',
                      borderRadius: '999px',
                      boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
                      cursor: 'pointer',
                      position: 'relative',
                      zIndex: 2
                    }}
                  >
                    <Check size={18} strokeWidth={2.5} color="#ffffff" /> {editingRecipientId ? 'Save Changes' : 'Add Contact'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Quick Instant Send */}
        {showInstantModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.55)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1.5rem'
            }}
          >
            <div
              className="card"
              style={{
                width: '100%',
                maxWidth: '500px',
                background: 'white',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
                borderRadius: '24px',
                padding: '2rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Send size={20} className="text-primary" /> Instant Report Share
                </h3>
                <button
                  className="btn btn-tertiary btn-sm"
                  onClick={() => setShowInstantModal(false)}
                  style={{ padding: '6px' }}
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Send an immediate spending summary to any recipient address on-demand.
              </p>

              <form onSubmit={handleInstantShare}>
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Recipient Email *</label>
                  <input
                    type="email"
                    required
                    className="input"
                    placeholder="e.g. friend@example.com"
                    value={instantForm.email}
                    onChange={(e) => setInstantForm({ ...instantForm, email: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Recipient Name (Optional)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Alex"
                    value={instantForm.name}
                    onChange={(e) => setInstantForm({ ...instantForm, name: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                  <label style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Summary Type</label>
                  <select
                    className="select"
                    value={instantForm.frequency}
                    onChange={(e) => setInstantForm({ ...instantForm, frequency: e.target.value })}
                  >
                    <option value="daily">Daily Summary (Today's Expenses)</option>
                    <option value="weekly">Weekly Summary (This Week's Breakdown)</option>
                    <option value="monthly">Monthly Summary (Full Monthly Report)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowInstantModal(false)}
                    style={{ fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={sendingKey === 'instant'}
                    style={{
                      fontWeight: 700,
                      padding: '0.65rem 1.4rem',
                      background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%) !important',
                      color: '#ffffff !important',
                      border: 'none',
                      borderRadius: '999px',
                      boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
                      cursor: 'pointer',
                      position: 'relative',
                      zIndex: 2
                    }}
                  >
                    <Send size={18} strokeWidth={2.5} color="#ffffff" /> {sendingKey === 'instant' ? 'Sending...' : 'Send Now'}
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
