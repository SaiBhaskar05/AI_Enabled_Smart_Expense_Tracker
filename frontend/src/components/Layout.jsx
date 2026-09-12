import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGroup } from '../context/GroupContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BarChart3, LogOut, Menu, X, Home, CreditCard, Target, PieChart,
  FileText, Tag, Upload, Mail, Settings, Compass, Users, User, ArrowRight, Receipt, Calendar, Sparkles
} from 'lucide-react';
import { FinancialCopilotModal } from './FinancialCopilotModal';
import '../styles/claymorphism.css';
import '../styles/layout.css';

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { activeGroup, switchToPersonal } = useGroup();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar automatically on route change on mobile
  React.useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const isGroupSpace = location.pathname.startsWith('/groups');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // 1. Pure Personal Nav Items (when in Personal Dashboard)
  const personalNavItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: CreditCard, label: 'Expenses', path: '/expenses' },
    { icon: Target, label: 'Budgets', path: '/budgets' },
    { icon: PieChart, label: 'Analytics', path: '/analytics' },
    { icon: Receipt, label: 'Bills & Vault', path: '/bills' },
    { icon: FileText, label: 'Reports', path: '/reports' },
    { icon: Tag, label: 'Categories', path: '/categories' },
    { icon: Upload, label: 'Import/Export', path: '/import-export' },
    { icon: Mail, label: 'Email Reports', path: '/email' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  // 2. Pure Group Nav Items (when in Group Space)
  const groupNavItems = [
    { icon: Users, label: 'All Groups', path: '/groups' },
    ...(activeGroup && location.pathname.includes(activeGroup._id) ? [
      { icon: Home, label: `${activeGroup.name}`, path: `/groups/${activeGroup._id}` }
    ] : [])
  ];

  const currentNavItems = isGroupSpace ? groupNavItems : personalNavItems;

  const getPageMeta = () => {
    const path = location.pathname;
    if (path.startsWith('/groups/')) {
      return {
        title: activeGroup ? activeGroup.name : 'Group Dashboard',
        subtitle: 'Group budget & debt settlements',
        icon: Compass
      };
    }
    if (path.startsWith('/groups')) {
      return {
        title: 'Group Workspaces',
        subtitle: 'Trips, flatmates & shared splits',
        icon: Users
      };
    }
    switch (path) {
      case '/dashboard':
        return { title: 'Dashboard', subtitle: 'Real-time financial overview', icon: Home };
      case '/expenses':
        return { title: 'Expenses Ledger', subtitle: 'Transaction history & logging', icon: CreditCard };
      case '/budgets':
        return { title: 'Budgets & Limits', subtitle: 'Category spending allocations', icon: Target };
      case '/analytics':
        return { title: 'Financial Analytics', subtitle: 'Insights & category trends', icon: PieChart };
      case '/bills':
        return { title: 'Bills & Receipts Vault', subtitle: 'Document & ticket storage', icon: Receipt };
      case '/reports':
        return { title: 'Reports & Filtering', subtitle: 'Custom ledger reports', icon: FileText };
      case '/categories':
        return { title: 'Expense Categories', subtitle: 'Manage custom categories', icon: Tag };
      case '/import-export':
        return { title: 'Import / Export & Sync', subtitle: 'CSV batches & Group sync', icon: Upload };
      case '/email':
        return { title: 'Email Reports', subtitle: 'Automated summaries & digests', icon: Mail };
      case '/settings':
        return { title: 'Account Settings', subtitle: 'Profile & preferences', icon: Settings };
      default:
        return { title: 'Expense Tracker', subtitle: 'Smart Financial Management', icon: BarChart3 };
    }
  };

  const pageMeta = getPageMeta();
  const CurrentIcon = pageMeta.icon;

  const todayDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="layout">
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div
            className="logo"
            onClick={() => navigate(isGroupSpace ? '/groups' : '/dashboard')}
            style={{ cursor: 'pointer' }}
          >
            <div
              className="logo-icon-bg"
              style={{
                background: isGroupSpace ? 'linear-gradient(135deg, #10b981, #059669)' : undefined
              }}
            >
              {isGroupSpace ? <Users size={24} color="#ffffff" /> : <BarChart3 size={24} />}
            </div>
            <span className="logo-text">
              {isGroupSpace ? 'Groups' : 'Personal'}
            </span>
          </div>
          <button
            className="sidebar-toggle-mobile"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {currentNavItems.map((item) => (
            <NavLink
              key={item.path}
              icon={item.icon}
              label={item.label}
              path={item.path}
              currentPath={location.pathname}
              onClick={() => {
                navigate(item.path);
                setSidebarOpen(false);
              }}
            />
          ))}
        </nav>

        {/* Sidebar Workspace Switcher Card */}
        <div style={{ padding: '0 0 1rem 0' }}>
          {isGroupSpace ? (
            <button
              onClick={() => {
                switchToPersonal();
                navigate('/dashboard');
              }}
              className="btn btn-secondary btn-sm"
              style={{
                width: '100%',
                fontWeight: 700,
                fontSize: '0.825rem',
                padding: '8px 12px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <User size={15} /> Switch to Personal
            </button>
          ) : (
            <button
              onClick={() => navigate('/groups')}
              className="btn btn-secondary btn-sm"
              style={{
                width: '100%',
                fontWeight: 700,
                fontSize: '0.825rem',
                padding: '8px 12px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                borderColor: '#10b981',
                color: '#059669'
              }}
            >
              <Users size={15} color="#10b981" /> Switch to Groups
            </button>
          )}
        </div>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">{user?.name?.charAt(0) || 'U'}</div>
            <div className="user-info">
              <div className="user-name">{user?.name || 'User'}</div>
              <div className="user-email">{user?.email || ''}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary btn-sm">
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-bar">
          <div className="top-bar-left">
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle navigation menu"
            >
              <Menu size={22} />
            </button>

            {/* Breadcrumb / Page Context */}
            <div className="topbar-context">
              <div
                className="topbar-icon-pill"
                style={{
                  background: isGroupSpace ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)' : 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
                  color: isGroupSpace ? '#15803d' : '#6d28d9'
                }}
              >
                <CurrentIcon size={18} />
              </div>
              <div className="topbar-titles">
                <div className="topbar-page-name">
                  {pageMeta.title}
                </div>
                <div className="topbar-subtitle">
                  {pageMeta.subtitle}
                </div>
              </div>
            </div>
          </div>

          {/* Center Date Badge */}
          <div className="topbar-center">
            <div className="topbar-date-pill">
              <Calendar size={13} color={isGroupSpace ? '#059669' : '#7c5cfc'} />
              <span>{todayDateStr}</span>
            </div>
          </div>

          {/* Right Workspace Segmented Switcher & Avatar */}
          <div className="topbar-right">
            <div className="workspace-segment-switch">
              <button
                type="button"
                className={`segment-btn ${!isGroupSpace ? 'active personal' : ''}`}
                onClick={() => {
                  switchToPersonal();
                  navigate('/dashboard');
                }}
                title="Personal Dashboard"
              >
                <User size={14} />
                <span>Personal</span>
              </button>
              <button
                type="button"
                className={`segment-btn ${isGroupSpace ? 'active groups' : ''}`}
                onClick={() => navigate('/groups')}
                title="Groups Workspace"
              >
                <Users size={14} />
                <span>Groups</span>
              </button>
            </div>

            <div
              className="topbar-user-avatar"
              onClick={() => navigate('/settings')}
              title={`Logged in as ${user?.name || 'User'}`}
            >
              <div className="avatar-mini">
                {user?.name?.charAt(0) || 'U'}
              </div>
            </div>
          </div>
        </header>

        <div className="content-area">
          {children}
        </div>

        {/* AI Financial Copilot Floating Assistant (Personal Workspace Only) */}
        {!isGroupSpace && <FinancialCopilotModal />}
      </main>
    </div>
  );
};

const NavLink = ({ icon: Icon, label, path, currentPath, onClick }) => {
  const navigate = useNavigate();
  const isActive = currentPath === path;

  return (
    <button
      className={`nav-link ${isActive ? 'active' : ''}`}
      onClick={() => {
        navigate(path);
        onClick?.();
      }}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );
};
