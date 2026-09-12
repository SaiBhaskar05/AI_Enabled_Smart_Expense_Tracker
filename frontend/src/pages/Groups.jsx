import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroup } from '../context/GroupContext';
import { useAuth } from '../context/AuthContext';
import { groupsAPI } from '../services/api';
import { Layout } from '../components/Layout';
import {
  Users, Plus, Compass, KeyRound, Calendar, ArrowRight, DollarSign,
  Copy, Check, UserPlus, Trash2, LogOut, Sparkles, Tag, PieChart, Info, X,
  Plane, Home
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import '../styles/claymorphism.css';
import '../styles/groups.css';

const PRESET_CATEGORIES = [
  'Accommodation & Stay',
  'Food & Dining',
  'Transport & Fuel',
  'Activities & Sightseeing',
  'Groceries',
  'Shopping',
  'Entertainment & Passes',
  'Utilities & Bills',
  'Healthcare & Medical',
  'General & Misc'
];

export const Groups = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { groups, fetchGroups, selectGroup } = useGroup();

  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  // Create form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'Trip',
    currency: 'INR',
    totalBudget: '',
    startDate: '',
    endDate: '',
    categoryBudgets: [
      { category: 'Accommodation & Stay', amount: '' },
      { category: 'Food & Dining', amount: '' },
      { category: 'Transport & Fuel', amount: '' },
      { category: 'Activities & Sightseeing', amount: '' }
    ]
  });

  // Join form state
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await fetchGroups();
    setLoading(false);
  };

  const handleApplyPreset = (type) => {
    if (type === 'trip') {
      setFormData(prev => ({
        ...prev,
        categoryBudgets: [
          { category: 'Accommodation & Stay', amount: '' },
          { category: 'Food & Dining', amount: '' },
          { category: 'Transport & Fuel', amount: '' },
          { category: 'Activities & Sightseeing', amount: '' },
          { category: 'Shopping', amount: '' }
        ]
      }));
    } else if (type === 'flatmates') {
      setFormData(prev => ({
        ...prev,
        categoryBudgets: [
          { category: 'Groceries', amount: '' },
          { category: 'Utilities & Bills', amount: '' },
          { category: 'Food & Dining', amount: '' },
          { category: 'General & Misc', amount: '' }
        ]
      }));
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    setCreating(true);
    try {
      const cleanedCategoryBudgets = formData.categoryBudgets
        .filter(c => c.category && c.category.trim() && Number(c.amount) >= 0)
        .map(c => ({ category: c.category.trim(), amount: Number(c.amount) || 0 }));

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        type: formData.type,
        currency: formData.currency,
        totalBudget: Math.max(0, Number(formData.totalBudget) || 0),
        categoryBudgets: cleanedCategoryBudgets,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null
      };

      const res = await groupsAPI.create(payload);
      if (res.data?.success) {
        toast.success(`Group "${formData.name}" created!`);
        setShowCreateModal(false);
        setFormData({
          name: '',
          description: '',
          type: 'Trip',
          currency: 'INR',
          totalBudget: '',
          startDate: '',
          endDate: '',
          categoryBudgets: [
            { category: 'Accommodation & Stay', amount: '' },
            { category: 'Food & Dining', amount: '' },
            { category: 'Transport & Fuel', amount: '' },
            { category: 'Activities & Sightseeing', amount: '' }
          ]
        });
        await fetchGroups();
        const createdGroup = res.data.data.group;
        selectGroup(createdGroup);
        navigate(`/groups/${createdGroup._id}`);
      }
    } catch (err) {
      console.error('Create group error:', err);
      toast.error(err.response?.data?.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) {
      toast.error('Please enter an invite code');
      return;
    }

    setJoining(true);
    try {
      const res = await groupsAPI.joinByCode(inviteCodeInput.trim());
      if (res.data?.success) {
        toast.success(res.data.message || 'Joined group successfully!');
        setShowJoinModal(false);
        setInviteCodeInput('');
        await fetchGroups();
        const joined = res.data.data.group;
        selectGroup(joined);
        navigate(`/groups/${joined._id}`);
      }
    } catch (err) {
      console.error('Join group error:', err);
      toast.error(err.response?.data?.message || 'Invalid invite code');
    } finally {
      setJoining(false);
    }
  };

  const handleCopyInviteCode = (code, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Invite code "${code}" copied!`);
    setTimeout(() => setCopiedCode(''), 2500);
  };

  const handleOpenGroup = (group) => {
    selectGroup(group);
    navigate(`/groups/${group._id}`);
  };

  const handleCategoryBudgetChange = (index, field, value) => {
    const updated = [...formData.categoryBudgets];
    updated[index][field] = value;
    setFormData({ ...formData, categoryBudgets: updated });
  };

  const handleDeleteGroup = async (group, e) => {
    e.stopPropagation();
    const confirmation = window.prompt(
      `DANGER ZONE: This will permanently delete "${group.name}" and ALL associated expenses, debt records, and bills.\n\nType the group name "${group.name}" to confirm:`
    );

    if (confirmation !== group.name) {
      if (confirmation !== null) toast.error('Group name did not match. Deletion cancelled.');
      return;
    }

    try {
      await groupsAPI.delete(group._id);
      toast.success(`Group "${group.name}" permanently deleted.`);
      await fetchGroups();
    } catch (err) {
      console.error('Delete group error:', err);
      toast.error(err.response?.data?.message || 'Failed to delete group');
    }
  };

  const handleAddCategoryBudgetRow = () => {
    setFormData({
      ...formData,
      categoryBudgets: [...formData.categoryBudgets, { category: '', amount: '' }]
    });
  };

  const handleRemoveCategoryBudgetRow = (index) => {
    const updated = formData.categoryBudgets.filter((_, i) => i !== index);
    setFormData({ ...formData, categoryBudgets: updated });
  };

  const filteredGroups = groups.filter(g => {
    if (filterType === 'all') return true;
    return g.type?.toLowerCase() === filterType.toLowerCase();
  });

  const typeBadges = {
    Trip: { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd', icon: Compass },
    Travel: { bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe', icon: Compass },
    Roommates: { bg: '#fef3c7', color: '#b45309', border: '#fde68a', icon: Users },
    Project: { bg: '#ede9fe', color: '#6d28d9', border: '#ddd6fe', icon: Tag },
    Family: { bg: '#fce7f3', color: '#be185d', border: '#fbcfe8', icon: Users },
    Event: { bg: '#ffedd5', color: '#c2410c', border: '#fed7aa', icon: Sparkles },
    Other: { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', icon: Tag }
  };

  return (
    <Layout>
      <Toaster position="top-right" />
      <div className="page-container" style={{ padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header Banner */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.25rem',
            marginBottom: '2.5rem',
            background: 'linear-gradient(135deg, #ffffff 0%, #f4fbf7 50%, #faf5ff 100%)',
            padding: '2rem 2.25rem',
            borderRadius: '26px',
            boxShadow: '0 10px 32px rgba(16, 185, 129, 0.12)',
            border: '1.5px solid rgba(16, 185, 129, 0.25)'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.4rem' }}>
              <span
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  padding: '10px',
                  borderRadius: '16px',
                  display: 'inline-flex',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                }}
              >
                <Users size={26} />
              </span>
              <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: 0, color: 'var(--gray-900)' }}>
                Groups
              </h1>
            </div>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.95rem' }}>
              Manage shared group budgets, track split expenses with friends, and calculate who owes who.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowJoinModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.75rem 1.35rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                borderRadius: '999px',
                cursor: 'pointer'
              }}
            >
              <KeyRound size={18} /> Join with Code
            </button>

            <button
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.75rem 1.6rem',
                fontSize: '0.95rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%) !important',
                color: '#ffffff !important',
                borderRadius: '999px',
                border: 'none',
                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
                cursor: 'pointer'
              }}
            >
              <Plus size={18} strokeWidth={2.5} color="#ffffff" /> + Create Group
            </button>
          </div>
        </div>

        {/* Filter Categories */}
        <div className="groups-filter-nav">
          {['all', 'trip', 'travel', 'roommates', 'family', 'project', 'event'].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className="btn btn-sm"
              style={{
                padding: '8px 18px',
                borderRadius: '999px',
                fontWeight: 700,
                fontSize: '0.85rem',
                textTransform: 'capitalize',
                background: filterType === t ? 'linear-gradient(135deg, #10b981, #059669)' : 'white',
                color: filterType === t ? 'white' : 'var(--gray-700)',
                border: filterType === t ? 'none' : '1.5px solid var(--gray-200)',
                boxShadow: filterType === t ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none',
                cursor: 'pointer'
              }}
            >
              {t === 'all' ? `All Groups (${groups.length})` : t}
            </button>
          ))}
        </div>

        {/* Groups Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div className="skeleton" style={{ width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 1.5rem' }} />
            <p className="text-muted">Loading groups...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              borderRadius: '26px',
              background: 'linear-gradient(145deg, #ffffff 0%, #faf8ff 100%)'
            }}
          >
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '24px',
                background: '#dcfce7',
                color: '#15803d',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}
            >
              <Compass size={38} />
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '0 0 0.5rem 0' }}>
              No {filterType !== 'all' ? filterType : ''} Groups Yet
            </h2>
            <p className="text-muted" style={{ maxWidth: '520px', margin: '0 auto 1.75rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Create a group budget or join with an invite code to manage shared costs.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
                style={{
                  fontWeight: 800,
                  padding: '0.8rem 1.7rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%) !important',
                  color: '#ffffff !important',
                  borderRadius: '999px',
                  boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)'
                }}
              >
                <Plus size={18} strokeWidth={2.5} /> + Create Group
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowJoinModal(true)}
                style={{ fontWeight: 700, padding: '0.8rem 1.5rem', borderRadius: '999px' }}
              >
                <KeyRound size={18} /> Join with Invite Code
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
              gap: '1.5rem'
            }}
          >
            {filteredGroups.map(group => {
              const badge = typeBadges[group.type] || typeBadges.Other;
              const IconComp = badge.icon;
              const totalBudget = group.totalBudget || 0;
              const totalSpent = group.totalSpent || 0;
              const budgetPercent = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;
              const isOverBudget = totalBudget > 0 && totalSpent > totalBudget;
              const progressColor = isOverBudget ? '#ef4444' : budgetPercent > 80 ? '#f97316' : '#10b981';

              return (
                <div
                  key={group._id}
                  className="card"
                  onClick={() => handleOpenGroup(group)}
                  style={{
                    padding: '1.75rem',
                    borderRadius: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    border: '1.5px solid rgba(16, 185, 129, 0.25)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 16px 36px rgba(16, 185, 129, 0.18)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.05)';
                  }}
                >
                  <div>
                    {/* Top Row: Type Badge & Invite Code */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span
                        style={{
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          padding: '4px 12px',
                          borderRadius: '999px',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <IconComp size={14} /> {group.type}
                      </span>

                      <button
                        className="btn btn-sm"
                        onClick={(e) => handleCopyInviteCode(group.inviteCode, e)}
                        title="Click to copy invite code"
                        style={{
                          background: '#f8fafc',
                          border: '1.5px dashed #cbd5e1',
                          color: '#475569',
                          padding: '3px 10px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {copiedCode === group.inviteCode ? (
                          <>
                            <Check size={12} color="#10b981" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy size={12} /> {group.inviteCode}
                          </>
                        )}
                      </button>
                    </div>

                    {/* Group Title & Description */}
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 900, margin: '0 0 0.35rem 0', color: 'var(--gray-900)' }}>
                      {group.name}
                    </h3>
                    {group.description && (
                      <p className="text-muted" style={{ fontSize: '0.875rem', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                        {group.description}
                      </p>
                    )}

                    {/* Dates if available */}
                    {(group.startDate || group.endDate) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--gray-600)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                        <Calendar size={14} />
                        <span>
                          {group.startDate ? new Date(group.startDate).toLocaleDateString() : 'Start'}
                          {' → '}
                          {group.endDate ? new Date(group.endDate).toLocaleDateString() : 'End'}
                        </span>
                      </div>
                    )}

                    {/* Budget Progress Box */}
                    <div
                      style={{
                        background: 'var(--gray-50)',
                        borderRadius: '16px',
                        padding: '1rem',
                        marginBottom: '1.25rem',
                        border: '1px solid var(--gray-200)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--gray-600)' }}>Group Budget</span>
                        <span style={{ fontWeight: 800, color: progressColor }}>
                          {totalBudget > 0 ? `${budgetPercent}%` : 'Flexible'}
                        </span>
                      </div>

                      <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.65rem' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, budgetPercent)}%`,
                            background: progressColor,
                            borderRadius: '999px',
                            transition: 'width 0.4s ease'
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem' }}>
                        <span>Spent: <strong>₹{totalSpent.toLocaleString()}</strong></span>
                        <span>Budget: <strong>{totalBudget > 0 ? `₹${totalBudget.toLocaleString()}` : 'Flexible'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Member Avatars & Open Button */}
                  <div
                    style={{
                      borderTop: '1px solid var(--gray-100)',
                      paddingTop: '1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ display: 'flex', marginLeft: '-6px' }}>
                        {(group.members || []).slice(0, 4).map((m, i) => (
                          <div
                            key={i}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.8rem',
                              fontWeight: 800,
                              border: '2px solid white',
                              marginLeft: '-6px'
                            }}
                            title={m.user?.name || 'Member'}
                          >
                            {m.user?.name?.charAt(0) || 'M'}
                          </div>
                        ))}
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginLeft: '8px', fontWeight: 700 }}>
                        {group.members?.length || 0} Member{group.members?.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {(group.members?.some(m => m.user?._id === user?._id && m.role === 'admin') || group.createdBy?._id === user?._id) && (
                        <button
                          onClick={(e) => handleDeleteGroup(group, e)}
                          className="btn btn-secondary btn-sm"
                          style={{
                            padding: '6px 10px',
                            color: '#dc2626',
                            borderColor: '#fca5a5',
                            borderRadius: '999px'
                          }}
                          title="Delete Group (Admin)"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}

                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenGroup(group)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '999px',
                          fontSize: '0.825rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        Open {group.name} <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Create Trip / Group */}
        {showCreateModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(6px)',
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
                maxWidth: '620px',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: 'white',
                borderRadius: '26px',
                padding: '2.25rem',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ padding: '8px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', display: 'flex' }}>
                    <Users size={24} />
                  </span>
                  <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>
                    Create New Group
                  </h3>
                </div>
                <button
                  className="btn btn-tertiary"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '6px', borderRadius: '50%' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateGroup}>
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block' }}>
                    Group Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="e.g. Flat 402 Roommates, Summer Vacation, Project Alpha"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block' }}>Type</label>
                    <select
                      className="select"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      <option value="Trip">Trip / Vacation</option>
                      <option value="Travel">Travel & Roadtrip</option>
                      <option value="Roommates">Roommates / Flat</option>
                      <option value="Family">Family Expenses</option>
                      <option value="Project">Project / Team</option>
                      <option value="Event">Event / Party</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block' }}>Currency</label>
                    <select
                      className="select"
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="AED">AED (د.إ)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block' }}>
                    Total Overall Budget ({formData.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="input"
                    placeholder="e.g. 50000"
                    value={formData.totalBudget}
                    onChange={(e) => setFormData({ ...formData, totalBudget: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block' }}>Start Date</label>
                    <input
                      type="date"
                      className="input"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block' }}>End Date</label>
                    <input
                      type="date"
                      className="input"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1.75rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '18px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={{ fontWeight: 800, margin: 0, fontSize: '0.95rem' }}>
                        Category Budgets (Optional)
                      </label>
                      <div style={{ fontSize: '0.775rem', color: 'var(--gray-500)' }}>
                        Set spending targets per category
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCategoryBudgetRow}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.8rem', padding: '4px 10px', fontWeight: 800, borderRadius: '999px' }}
                    >
                      + Add Category
                    </button>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 750, color: 'var(--gray-500)', alignSelf: 'center' }}>
                      Templates:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('trip')}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', borderRadius: '999px', padding: '3px 10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <Plane size={13} /> Trip / Vacation
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('flatmates')}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', borderRadius: '999px', padding: '3px 10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <Home size={13} /> Flatmates
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {formData.categoryBudgets.map((cb, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          list={`create-categories-list-${idx}`}
                          className="input"
                          placeholder="Category name"
                          value={cb.category}
                          onChange={(e) => handleCategoryBudgetChange(idx, 'category', e.target.value)}
                          style={{ flex: 3, padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                        />
                        <datalist id={`create-categories-list-${idx}`}>
                          {PRESET_CATEGORIES.map((preset, pIdx) => (
                            <option key={pIdx} value={preset} />
                          ))}
                        </datalist>

                        <div style={{ flex: 2, display: 'flex', alignItems: 'center', position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '8px', color: 'var(--gray-500)', fontSize: '0.85rem' }}>₹</span>
                          <input
                            type="number"
                            min="0"
                            className="input"
                            placeholder="Amount"
                            value={cb.amount}
                            onChange={(e) => handleCategoryBudgetChange(idx, 'amount', e.target.value)}
                            style={{ paddingLeft: '1.5rem', paddingRight: '0.5rem', fontSize: '0.875rem' }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveCategoryBudgetRow(idx)}
                          className="btn btn-tertiary btn-sm"
                          style={{ padding: '6px', color: '#ef4444' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCreateModal(false)}
                    style={{ fontWeight: 700 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={creating}
                    style={{
                      fontWeight: 800,
                      padding: '0.75rem 1.6rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%) !important',
                      color: '#ffffff !important',
                      borderRadius: '999px',
                      boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)'
                    }}
                  >
                    {creating ? 'Creating...' : 'Create & Open Group'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Join Group by Code */}
        {showJoinModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(6px)',
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
                maxWidth: '480px',
                background: 'white',
                borderRadius: '24px',
                padding: '2.25rem',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ padding: '8px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', display: 'flex' }}>
                    <KeyRound size={22} />
                  </span>
                  <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900 }}>
                    Join with Invite Code
                  </h3>
                </div>
                <button
                  className="btn btn-tertiary"
                  onClick={() => setShowJoinModal(false)}
                  style={{ padding: '6px', borderRadius: '50%' }}
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Enter the invite code shared by your friend (e.g., <code>TRIP-7X9K2</code>).
              </p>

              <form onSubmit={handleJoinGroup}>
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontWeight: 800, marginBottom: '0.5rem', display: 'block' }}>
                    Group Invite Code *
                  </label>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="TRIP-XXXX"
                    value={inviteCodeInput}
                    onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                    style={{
                      textAlign: 'center',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      letterSpacing: '2px',
                      textTransform: 'uppercase'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowJoinModal(false)}
                    style={{ fontWeight: 700 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={joining}
                    style={{
                      fontWeight: 800,
                      padding: '0.75rem 1.6rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%) !important',
                      color: '#ffffff !important',
                      borderRadius: '999px',
                      boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)'
                    }}
                  >
                    {joining ? 'Joining...' : 'Join Group'}
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
