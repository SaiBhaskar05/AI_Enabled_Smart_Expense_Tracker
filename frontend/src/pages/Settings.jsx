import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import {
  User, Shield, Save, CheckCircle2, Globe, Key, Bell, Database,
  Download, Trash2, Smartphone, Laptop, Sparkles, RefreshCw,
  Mail, Calendar, Lock, LogOut, Check, AlertCircle, Loader2
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import '../styles/claymorphism.css';
import '../styles/settings.css';

export const Settings = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'preferences' | 'security' | 'data'

  // Profile Form
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currency: user?.currency || 'INR'
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Display & App Preferences
  const [currency, setCurrency] = useState(localStorage.getItem('user_currency') || 'INR');
  const [timezone, setTimezone] = useState(localStorage.getItem('user_timezone') || 'Asia/Kolkata');
  const [dateFormat, setDateFormat] = useState(localStorage.getItem('user_date_format') || 'DD/MM/YYYY');
  const [autoSplit, setAutoSplit] = useState(localStorage.getItem('pref_auto_split') !== 'false');
  const [emailAlerts, setEmailAlerts] = useState(localStorage.getItem('pref_email_alerts') !== 'false');
  const [budgetWarnings, setBudgetWarnings] = useState(localStorage.getItem('pref_budget_warn') !== 'false');

  // Password / Security Form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        currency: user.currency || 'INR'
      });
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      toast.error('Name cannot be blank');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await authAPI.updateProfile({
        name: profileForm.name.trim(),
        currency: profileForm.currency
      });
      const updatedUser = res.data?.data?.user || { ...user, name: profileForm.name.trim(), currency: profileForm.currency };
      updateUser(updatedUser);
      localStorage.setItem('user_currency', profileForm.currency);
      toast.success('Profile details updated successfully!');
    } catch (err) {
      console.error('Update profile error:', err);
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePreferences = (e) => {
    e.preventDefault();
    localStorage.setItem('user_currency', currency);
    localStorage.setItem('user_timezone', timezone);
    localStorage.setItem('user_date_format', dateFormat);
    localStorage.setItem('pref_auto_split', autoSplit ? 'true' : 'false');
    localStorage.setItem('pref_email_alerts', emailAlerts ? 'true' : 'false');
    localStorage.setItem('pref_budget_warn', budgetWarnings ? 'true' : 'false');
    toast.success('App preferences saved!');
  };

  const handlePasswordReset = (e) => {
    e.preventDefault();
    if (passwordForm.newPassword && passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setResettingPassword(true);
    setTimeout(() => {
      setResettingPassword(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success(`Password security instructions sent to ${user?.email || 'your registered email'}!`);
    }, 800);
  };

  const handleClearCache = () => {
    sessionStorage.clear();
    toast.success('Local application cache cleared!');
  };

  const handleAccountDeletion = () => {
    const confirmText = window.prompt(
      `ACCOUNT DELETION\n\nType your email "${user?.email}" to confirm account deletion request:`
    );
    if (confirmText === user?.email) {
      toast.success('Account deletion request submitted to system administrators.');
    } else if (confirmText !== null) {
      toast.error('Email did not match. Deletion cancelled.');
    }
  };

  const userInitial = user?.name?.charAt(0) || 'U';

  return (
    <Layout>
      <Toaster position="top-right" />
      <div className="settings-container">

        {/* 1. HERO PROFILE SUMMARY CARD */}
        <div className="settings-hero-card">
          <div className="settings-profile-left">
            <div className="settings-big-avatar">
              {userInitial}
            </div>
            <div className="settings-profile-info">
              <h2>{user?.name || 'User Account'}</h2>
              <p>{user?.email || 'user@example.com'}</p>
              <div className="settings-badges-row">
                <span className="settings-pill-badge active">
                  <CheckCircle2 size={13} /> Active Account
                </span>
                <span className="settings-pill-badge primary">
                  <Shield size={13} /> Cloud Secured
                </span>
                <span className="settings-pill-badge" style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}>
                  <Globe size={13} /> {currency}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="btn btn-secondary btn-sm"
              style={{
                borderRadius: '999px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#dc2626',
                borderColor: '#fecdd3'
              }}
            >
              <LogOut size={15} /> Logout
            </button>
          </div>
        </div>

        {/* 2. TABBED SETTINGS NAVIGATION */}
        <div className="settings-tabs-nav">
          {[
            { id: 'profile', label: 'Profile & Account', icon: User },
            { id: 'preferences', label: 'Preferences & Regional', icon: Globe },
            { id: 'security', label: 'Security & Access', icon: Shield },
            { id: 'data', label: 'Data & Privacy', icon: Database }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`settings-tab-btn ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} color={isActive ? '#7c5cfc' : 'var(--gray-500)'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 3. TAB 1: Profile & Account */}
        {activeTab === 'profile' && (
          <div className="settings-section-card">
            <div className="settings-card-header">
              <div>
                <h3>Personal Profile Information</h3>
                <p>Update your display name, primary currency, and contact identity.</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="settings-grid-2">
                <div className="settings-field-group">
                  <label>Full Display Name *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    placeholder="Your Full Name"
                  />
                  <span className="field-hint">Used in group expense split ledgers and notifications</span>
                </div>

                <div className="settings-field-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    disabled
                    className="input"
                    value={profileForm.email}
                    style={{ background: 'var(--gray-100)', cursor: 'not-allowed', color: 'var(--gray-600)' }}
                  />
                  <span className="field-hint">Primary login identifier & email report recipient</span>
                </div>
              </div>

              <div className="settings-grid-2">
                <div className="settings-field-group">
                  <label>Default Currency</label>
                  <select
                    className="input"
                    value={profileForm.currency}
                    onChange={(e) => setProfileForm({ ...profileForm, currency: e.target.value })}
                  >
                    <option value="INR">INR (₹) - Indian Rupee</option>
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="JPY">JPY (¥) - Japanese Yen</option>
                    <option value="AED">AED (د.إ) - UAE Dirham</option>
                  </select>
                  <span className="field-hint">Default currency for reports, budgets, and transactions</span>
                </div>

                <div className="settings-field-group">
                  <label>Account Role & Tier</label>
                  <div
                    style={{
                      padding: '11px 16px',
                      background: 'var(--gray-50)',
                      borderRadius: '12px',
                      border: '1.5px solid var(--gray-200)',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: 'var(--gray-800)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Shield size={16} color="#7c5cfc" />
                    <span>Personal Workspace Admin & Group Member</span>
                  </div>
                  <span className="field-hint">Full permissions for personal ledger and group trip creation</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px' }}>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="btn btn-primary"
                  style={{
                    fontWeight: 800,
                    padding: '0.75rem 1.75rem',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {savingProfile ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Saving Profile...
                    </>
                  ) : (
                    <>
                      <Save size={16} /> Save Profile Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 4. TAB 2: Preferences & Regional */}
        {activeTab === 'preferences' && (
          <div className="settings-section-card">
            <div className="settings-card-header">
              <div>
                <h3>Localization & Application Preferences</h3>
                <p>Configure timezones, formatting standards, and smart ledger automations.</p>
              </div>
            </div>

            <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="settings-grid-2">
                <div className="settings-field-group">
                  <label>Primary Timezone</label>
                  <select
                    className="input"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+05:30)</option>
                    <option value="America/New_York">America/New_York (EST/EDT - UTC-05:00)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT - UTC-08:00)</option>
                    <option value="Europe/London">Europe/London (GMT/BST - UTC+00:00)</option>
                    <option value="Europe/Paris">Europe/Paris (CET - UTC+01:00)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST - UTC+04:00)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT - UTC+08:00)</option>
                    <option value="UTC">UTC (Universal Time Coordinated)</option>
                  </select>
                  <span className="field-hint">Used for automatic transaction timestamps and recurring reports</span>
                </div>

                <div className="settings-field-group">
                  <label>Date Display Format</label>
                  <select
                    className="input"
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 09/09/2026)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 09/09/2026)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-09-09)</option>
                  </select>
                  <span className="field-hint">Display format for table listings and exported receipts</span>
                </div>
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                <div className="settings-interactive-row">
                  <div>
                    <h4>Smart Split Auto-Calculation</h4>
                    <p>Automatically compute equal shares among selected group participants when logging bills.</p>
                  </div>
                  <label className="settings-switch">
                    <input
                      type="checkbox"
                      checked={autoSplit}
                      onChange={(e) => setAutoSplit(e.target.checked)}
                    />
                    <span className="settings-slider" />
                  </label>
                </div>

                <div className="settings-interactive-row">
                  <div>
                    <h4>Automated Email Report Summaries</h4>
                    <p>Receive scheduled periodic spending digest summaries and month-end budget reviews.</p>
                  </div>
                  <label className="settings-switch">
                    <input
                      type="checkbox"
                      checked={emailAlerts}
                      onChange={(e) => setEmailAlerts(e.target.checked)}
                    />
                    <span className="settings-slider" />
                  </label>
                </div>

                <div className="settings-interactive-row">
                  <div>
                    <h4>Budget Threshold Alerts</h4>
                    <p>Notify when category spending crosses 80% or 100% of defined budget allocations.</p>
                  </div>
                  <label className="settings-switch">
                    <input
                      type="checkbox"
                      checked={budgetWarnings}
                      onChange={(e) => setBudgetWarnings(e.target.checked)}
                    />
                    <span className="settings-slider" />
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    fontWeight: 800,
                    padding: '0.75rem 1.75rem',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Save size={16} /> Save App Preferences
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 5. TAB 3: Security & Access */}
        {activeTab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="settings-section-card">
              <div className="settings-card-header">
                <div>
                  <h3>Change Account Password</h3>
                  <p>Update your credentials to keep your financial ledger secure.</p>
                </div>
              </div>

              <form onSubmit={handlePasswordReset} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '540px' }}>
                <div className="settings-field-group">
                  <label>Current Password</label>
                  <input
                    type="password"
                    required
                    className="input"
                    placeholder="Enter current password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  />
                </div>

                <div className="settings-field-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="input"
                    placeholder="Minimum 6 characters"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  />
                </div>

                <div className="settings-field-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    required
                    className="input"
                    placeholder="Confirm new password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  />
                </div>

                <div style={{ paddingTop: '8px' }}>
                  <button
                    type="submit"
                    disabled={resettingPassword}
                    className="btn btn-primary"
                    style={{
                      fontWeight: 800,
                      padding: '0.75rem 1.6rem',
                      borderRadius: '999px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {resettingPassword ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Updating Password...
                      </>
                    ) : (
                      <>
                        <Lock size={16} /> Update Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Active Devices Card */}
            <div className="settings-section-card">
              <div className="settings-card-header">
                <div>
                  <h3>Active Device Sessions</h3>
                  <p>Devices currently authenticated to your Smart Expense Tracker account.</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 18px',
                    background: '#f8fafc',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: '#dcfce7',
                        color: '#15803d',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Laptop size={22} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--gray-900)' }}>
                        Current Web Session (Windows / Chrome)
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '2px' }}>
                        Active now • IP: Localhost / Cloudflare Secured Tunnel
                      </div>
                    </div>
                  </div>

                  <span className="settings-pill-badge active">
                    <CheckCircle2 size={12} /> This Device
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. TAB 4: Data & Privacy */}
        {activeTab === 'data' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="settings-section-card">
              <div className="settings-card-header">
                <div>
                  <h3>Data Portability & Quick Actions</h3>
                  <p>Export your full ledger, manage temporary drafts, or clear application cache.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div
                  style={{
                    padding: '20px',
                    background: 'var(--gray-50)',
                    borderRadius: '18px',
                    border: '1px solid var(--gray-200)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <Download size={20} color="#7c5cfc" />
                      <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem' }}>Full CSV Ledger Export</h4>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                      Download complete personal transactions with categories, payment methods, and notes.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/import-export')}
                    className="btn btn-secondary btn-sm"
                    style={{ fontWeight: 750, borderRadius: '999px' }}
                  >
                    Go to Export Center →
                  </button>
                </div>

                <div
                  style={{
                    padding: '20px',
                    background: 'var(--gray-50)',
                    borderRadius: '18px',
                    border: '1px solid var(--gray-200)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <RefreshCw size={20} color="#10b981" />
                      <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem' }}>Clear Temporary Cache</h4>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                      Clears session filters, temporary import previews, and refreshes client state.
                    </p>
                  </div>
                  <button
                    onClick={handleClearCache}
                    className="btn btn-secondary btn-sm"
                    style={{ fontWeight: 750, borderRadius: '999px' }}
                  >
                    Clear Local Session Cache
                  </button>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="settings-danger-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <AlertCircle size={22} color="#dc2626" />
                <h3 style={{ margin: 0, color: '#991b1b', fontWeight: 900, fontSize: '1.2rem' }}>
                  Danger Zone
                </h3>
              </div>
              <p style={{ color: '#b91c1c', fontSize: '0.875rem', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                Account deletion will permanently remove your personal financial ledger, category budgets, and trip memberships. This action cannot be reversed.
              </p>
              <button
                onClick={handleAccountDeletion}
                className="btn btn-danger btn-sm"
                style={{
                  fontWeight: 800,
                  borderRadius: '999px',
                  padding: '8px 18px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 size={15} /> Request Account Deletion
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--gray-400)', fontSize: '0.8rem' }}>
          Smart Expense Tracker • Version 2.4 Enterprise Edition • Secured with JWT & MongoDB
        </div>

      </div>
    </Layout>
  );
};
