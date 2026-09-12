import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroup } from '../context/GroupContext';
import { useAuth } from '../context/AuthContext';
import { User, Users, Compass, ArrowRight, X, Plus, Sparkles, CheckCircle2 } from 'lucide-react';
import '../styles/claymorphism.css';

export const WorkspacePromptModal = ({ isOpen, onClose, onSelectGroup }) => {
  const { groups, selectGroup, switchToPersonal } = useGroup();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rememberChoice, setRememberChoice] = useState(false);

  if (!isOpen) return null;

  const handleChoosePersonal = () => {
    switchToPersonal();
    if (rememberChoice) {
      localStorage.setItem('preferredWorkspace', 'personal');
    }
    onClose();
    navigate('/dashboard');
  };

  const handleChooseGroupHub = () => {
    switchToPersonal(); // Reset active group to show all groups hub
    if (rememberChoice) {
      localStorage.setItem('preferredWorkspace', 'group');
    }
    onClose();
    navigate('/groups');
  };

  const handleSelectSpecificGroup = (group) => {
    selectGroup(group);
    if (rememberChoice) {
      localStorage.setItem('preferredWorkspace', 'group');
    }
    onClose();
    navigate(`/groups/${group._id}`);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1.25rem'
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '680px',
          background: 'linear-gradient(145deg, #ffffff 0%, #fdfcff 100%)',
          borderRadius: '28px',
          padding: '2.25rem',
          boxShadow: '0 25px 70px rgba(124, 58, 237, 0.25)',
          border: '1.5px solid rgba(168, 85, 247, 0.25)',
          position: 'relative',
          animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Close Button */}
        <button
          className="btn btn-tertiary"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            padding: '8px',
            borderRadius: '50%'
          }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '10px 16px',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
              color: '#6d28d9',
              fontWeight: 700,
              fontSize: '0.85rem',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '0.75rem'
            }}
          >
            <Sparkles size={16} /> Choose Your Workspace
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--gray-900)' }}>
            Welcome back, {user?.name || 'Explorer'}!
          </h2>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.95rem' }}>
            Where would you like to start your financial session today?
          </p>
        </div>

        {/* Workspace Options Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
            marginBottom: '1.75rem'
          }}
        >
          {/* Option 1: Personal Dashboard */}
          <div
            onClick={handleChoosePersonal}
            style={{
              border: '2px solid rgba(124, 58, 237, 0.2)',
              borderRadius: '20px',
              padding: '1.5rem',
              cursor: 'pointer',
              background: 'linear-gradient(145deg, #ffffff 0%, #f9f5ff 100%)',
              transition: 'all 0.25s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#7c3aed';
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 12px 30px rgba(124, 58, 237, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.2)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div>
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  marginBottom: '1rem',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
                }}
              >
                <User size={26} />
              </div>
              <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.2rem', fontWeight: 700 }}>
                Personal Dashboard
              </h3>
              <p className="text-muted" style={{ fontSize: '0.875rem', lineHeight: 1.5, margin: 0 }}>
                Track personal expenses, monthly category budgets, AI analytics, and automated email summaries.
              </p>
            </div>

            <button
              className="btn btn-primary"
              style={{
                marginTop: '1.5rem',
                width: '100%',
                fontWeight: 700,
                fontSize: '0.875rem',
                padding: '0.65rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              Open Personal Space <ArrowRight size={16} />
            </button>
          </div>

          {/* Option 2: Group & Trip Workspace */}
          <div
            onClick={handleChooseGroupHub}
            style={{
              border: '2px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '20px',
              padding: '1.5rem',
              cursor: 'pointer',
              background: 'linear-gradient(145deg, #ffffff 0%, #f0fdf4 100%)',
              transition: 'all 0.25s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#10b981';
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 12px 30px rgba(16, 185, 129, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.25)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div>
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  marginBottom: '1rem',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                }}
              >
                <Compass size={26} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.2rem', fontWeight: 700 }}>
                  Trip & Group Budgets
                </h3>
                <span
                  style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}
                >
                  {groups.length} Group{groups.length !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-muted" style={{ fontSize: '0.875rem', lineHeight: 1.5, margin: 0 }}>
                Manage group travel budgets, record shared trip expenses, and auto-calculate "Who Owes Who" settlements.
              </p>
            </div>

            <button
              className="btn"
              style={{
                marginTop: '1.5rem',
                width: '100%',
                fontWeight: 700,
                fontSize: '0.875rem',
                padding: '0.65rem 1rem',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '999px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              Enter Group Workspace <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Existing Groups Quick Select (if any) */}
        {groups.length > 0 && (
          <div
            style={{
              background: 'var(--gray-50)',
              borderRadius: '16px',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              border: '1px solid var(--gray-200)'
            }}
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: '0.65rem' }}>
              Jump directly to a trip or group:
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {groups.slice(0, 4).map(g => (
                <button
                  key={g._id}
                  onClick={() => handleSelectSpecificGroup(g)}
                  className="btn btn-secondary btn-sm"
                  style={{
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    padding: '6px 14px',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Users size={14} /> {g.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer Checkbox */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '0.875rem', color: 'var(--gray-600)' }}>
            <input
              type="checkbox"
              checked={rememberChoice}
              onChange={(e) => setRememberChoice(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--primary-600)', cursor: 'pointer' }}
            />
            <span>Remember my workspace preference</span>
          </label>

          <span className="text-muted" style={{ fontSize: '0.825rem' }}>
            (You can switch anytime in the top bar)
          </span>
        </div>

      </div>
    </div>
  );
};
