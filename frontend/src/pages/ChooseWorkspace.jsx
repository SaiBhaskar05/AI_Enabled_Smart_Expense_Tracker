import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGroup } from '../context/GroupContext';
import {
  User, Users, Compass, ArrowRight, Sparkles, CheckCircle2,
  TrendingUp, Shield, CreditCard, PieChart, DollarSign, LogOut, Info,
  Receipt, RefreshCw, Layers
} from 'lucide-react';
import '../styles/claymorphism.css';
import '../styles/workspace.css';

export const ChooseWorkspace = () => {
  const { user, logout } = useAuth();
  const { groups, selectGroup, switchToPersonal } = useGroup();
  const navigate = useNavigate();
  const [rememberChoice, setRememberChoice] = useState(false);

  const handleSelectPersonal = () => {
    switchToPersonal();
    if (rememberChoice) {
      localStorage.setItem('preferredWorkspace', 'personal');
    }
    navigate('/dashboard');
  };

  const handleSelectGroup = () => {
    switchToPersonal(); // Opens group hub
    if (rememberChoice) {
      localStorage.setItem('preferredWorkspace', 'group');
    }
    navigate('/groups');
  };

  const handleSelectSpecificGroup = (group) => {
    selectGroup(group);
    if (rememberChoice) {
      localStorage.setItem('preferredWorkspace', 'group');
    }
    navigate(`/groups/${group._id}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="workspace-gateway">
      {/* Ambient background glow orbs safely isolated */}
      <div className="workspace-ambient-bg" aria-hidden="true" />

      {/* Top Bar with User Info & Logout */}
      <div className="workspace-top-bar">
        <div className="workspace-user-chip">
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c5cfc, #6366f1)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 800
            }}
          >
            {user?.name?.charAt(0) || 'U'}
          </div>
          <span>{user?.name || 'User'}</span>
        </div>

        <button
          onClick={handleLogout}
          className="workspace-logout-btn"
          title="Sign out of your account"
        >
          <LogOut size={15} /> Sign Out
        </button>
      </div>

      <div className="workspace-content-container">
        
        {/* Welcome Header */}
        <div className="workspace-header">
          <div className="workspace-badge-pill">
            <Sparkles size={16} /> Smart Financial Ecosystem
          </div>

          <h1>Select Your Workspace</h1>
          <p>
            Welcome back, <strong>{user?.name || 'Friend'}</strong>! Choose where you would like to track and manage your finances today:
          </p>
        </div>

        {/* 2 Interactive Workspace Cards */}
        <div className="workspace-cards-grid">
          
          {/* WORKSPACE 1: Personal Finance */}
          <div
            className="workspace-card personal-card"
            onClick={handleSelectPersonal}
          >
            <div>
              {/* Card Top Row */}
              <div className="card-top-row">
                <div className="card-icon-badge personal">
                  <User size={34} />
                </div>
                <span className="card-status-pill personal">
                  Personal Finance
                </span>
              </div>

              {/* Title & Subtitle */}
              <h2>Personal Ledger</h2>
              <p className="card-desc">
                Your private dashboard for tracking daily expenses, setting category budgets, smart AI category categorization, and generating PDF financial reports.
              </p>

              {/* Feature Points */}
              <div className="card-feature-list">
                <div className="feature-item">
                  <CheckCircle2 size={18} color="#7c5cfc" />
                  <span>Personal expense tracking & payment modes</span>
                </div>
                <div className="feature-item">
                  <CheckCircle2 size={18} color="#7c5cfc" />
                  <span>Monthly category budgets & threshold alerts</span>
                </div>
                <div className="feature-item">
                  <CheckCircle2 size={18} color="#7c5cfc" />
                  <span>AI automatic category suggestion engine</span>
                </div>
                <div className="feature-item">
                  <CheckCircle2 size={18} color="#7c5cfc" />
                  <span>Private receipts vault & financial analytics</span>
                </div>
              </div>
            </div>

            {/* Launch Button */}
            <button
              className="workspace-launch-btn personal"
            >
              Launch Personal <ArrowRight size={18} />
            </button>
          </div>

          {/* WORKSPACE 2: Shared Groups & Trips */}
          <div
            className="workspace-card group-card"
            onClick={handleSelectGroup}
          >
            <div>
              {/* Card Top Row */}
              <div className="card-top-row">
                <div className="card-icon-badge group">
                  <Users size={34} />
                </div>
                <span className="card-status-pill group">
                  {groups.length} Active Group{groups.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Title & Subtitle */}
              <h2>Shared Groups</h2>
              <p className="card-desc">
                Collaborative workspace for trips, roommates, events, and projects. Automatic multi-member bill splits, minimum-payment settlements, and instant personal sync.
              </p>

              {/* Feature Points */}
              <div className="card-feature-list">
                <div className="feature-item">
                  <CheckCircle2 size={18} color="#10b981" />
                  <span>Group budgets & category spend breakdown</span>
                </div>
                <div className="feature-item">
                  <CheckCircle2 size={18} color="#10b981" />
                  <span>Flexible bill splitting (Equal, exact, custom)</span>
                </div>
                <div className="feature-item">
                  <CheckCircle2 size={18} color="#10b981" />
                  <span>"Who Owes Who" minimum debt settlement engine</span>
                </div>
                <div className="feature-item">
                  <CheckCircle2 size={18} color="#10b981" />
                  <span>1-Click sync of group shares to personal ledger</span>
                </div>
              </div>
            </div>

            {/* Launch Button */}
            <button
              className="workspace-launch-btn group"
            >
              Launch Groups <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Existing Groups Quick Access */}
        {groups.length > 0 && (
          <div className="workspace-jump-card">
            <div className="jump-card-title">
              Jump directly into an active group:
            </div>
            <div className="jump-pills-row">
              {groups.map(g => (
                <button
                  key={g._id}
                  onClick={() => handleSelectSpecificGroup(g)}
                  className="jump-group-pill"
                >
                  <Compass size={15} color="#10b981" />
                  <span>{g.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>
                    ({g.members?.length || 1} members)
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Preference & Info */}
        <div className="workspace-footer">
          <label className="remember-choice-label">
            <input
              type="checkbox"
              checked={rememberChoice}
              onChange={(e) => setRememberChoice(e.target.checked)}
            />
            <span>Remember my selection on this device</span>
          </label>

          <span className="text-muted" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Info size={16} color="#7c5cfc" />
            <span>You can switch between Personal and Groups anytime using the top bar switcher.</span>
          </span>
        </div>

      </div>
    </div>
  );
};
