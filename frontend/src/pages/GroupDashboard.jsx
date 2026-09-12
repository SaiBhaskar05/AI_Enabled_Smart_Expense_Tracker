import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGroup } from '../context/GroupContext';
import { groupsAPI, billsAPI } from '../services/api';
import { Layout } from '../components/Layout';
import {
  Compass, Users, Plus, DollarSign, ArrowLeft, Copy, Check, UserPlus,
  Trash2, Edit, Calendar, Tag, Sparkles, CheckCircle2, AlertCircle, AlertTriangle,
  ArrowRight, CreditCard, Shield, Send, LogOut, X, PieChart, RefreshCw,
  TrendingUp, HelpCircle, UserCheck, Receipt, Wallet, Award, Target, ArrowLeftRight,
  Mail, BellRing, Share2, Loader2, UploadCloud, Eye, Download, FileText,
  Plane, Home
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import '../styles/claymorphism.css';
import '../styles/groups.css';

export const PRESET_CATEGORIES = [
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

export const GroupDashboard = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectGroup, fetchGroups } = useGroup();

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'whoOwesWho' | 'expenses' | 'bills' | 'members'

  // Modals state
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [showCategoryBudgetModal, setShowCategoryBudgetModal] = useState(false);
  const [categoryBudgetsDraft, setCategoryBudgetsDraft] = useState([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showUploadBillModal, setShowUploadBillModal] = useState(false);
  const [previewGroupBill, setPreviewGroupBill] = useState(null);

  const [copiedCode, setCopiedCode] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Group Bills State
  const [groupBills, setGroupBills] = useState([]);
  const [uploadingBill, setUploadingBill] = useState(false);
  const [billForm, setBillForm] = useState({
    title: '',
    category: 'Travel & Tickets',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    fileData: null,
    fileName: '',
    fileType: '',
    fileSize: 0
  });
  const billFileInputRef = useRef(null);

  // Sync to Personal Dashboard State
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncExpensesList, setSyncExpensesList] = useState([]);
  const [selectedSyncIds, setSelectedSyncIds] = useState([]);
  const [syncMode, setSyncMode] = useState('my_share'); // 'my_share' | 'paid_by_me'
  const [syncLoading, setSyncLoading] = useState(false);
  const [fetchingSyncStatus, setFetchingSyncStatus] = useState(false);

  // Group Email State
  const [emailTarget, setEmailTarget] = useState('all'); // 'all' | 'me' | 'custom'
  const [customEmail, setCustomEmail] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [sendingReminderId, setSendingReminderId] = useState(null);

  // Add Expense form
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: 'Food & Dining',
    paidBy: '',
    date: new Date().toISOString().split('T')[0],
    splitType: 'equal',
    selectedMembers: [],
    notes: ''
  });

  // Settlement form
  const [settleForm, setSettleForm] = useState({
    fromUser: '',
    toUser: '',
    amount: '',
    paymentMethod: 'UPI',
    notes: ''
  });

  // Add member form
  const [memberEmail, setMemberEmail] = useState('');

  // Edit group form
  const [editGroupForm, setEditGroupForm] = useState({
    name: '',
    description: '',
    totalBudget: '',
    type: 'Trip',
    currency: 'INR',
    categoryBudgets: []
  });

  useEffect(() => {
    if (groupId) {
      loadGroupData();
    }
  }, [groupId]);

  const loadGroupData = async () => {
    setLoading(true);
    try {
      const [groupRes, expRes, balRes, setRes, billRes] = await Promise.all([
        groupsAPI.getOne(groupId),
        groupsAPI.getExpenses(groupId),
        groupsAPI.getBalances(groupId),
        groupsAPI.getSettlements(groupId),
        billsAPI.getGroup(groupId)
      ]);

      const gData = groupRes.data.data.group;
      setGroup(gData);
      selectGroup(gData);
      setExpenses(expRes.data?.data?.expenses || []);
      setBalances(balRes.data?.data || null);
      setSettlements(setRes.data?.data?.settlements || []);
      setGroupBills(billRes.data?.data?.bills || []);

      // Init edit form
      setEditGroupForm({
        name: gData.name || '',
        description: gData.description || '',
        totalBudget: gData.totalBudget || '',
        type: gData.type || 'Trip',
        currency: gData.currency || 'INR',
        categoryBudgets: (gData.categoryBudgets || []).map(cb => ({
          category: cb.category,
          amount: cb.amount
        }))
      });

      // Init default payer and selected members
      if (user) {
        const memberIds = (gData.members || []).map(m => m.user?._id).filter(Boolean);
        setExpenseForm(prev => ({
          ...prev,
          paidBy: user._id,
          selectedMembers: memberIds
        }));
      }
    } catch (err) {
      console.error('Failed to load group details:', err);
      toast.error(err.response?.data?.message || 'Failed to load group');
      navigate('/groups');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!group?.inviteCode) return;
    navigator.clipboard.writeText(group.inviteCode);
    setCopiedCode(true);
    toast.success(`Invite code "${group.inviteCode}" copied to clipboard!`);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // ─── Category Budget Handlers ─────────────────────────────────────
  const handleOpenCategoryBudgetModal = (prefillCategory = null) => {
    const current = (group?.categoryBudgets || []).map(cb => ({
      category: cb.category,
      amount: cb.amount
    }));

    if (prefillCategory && !current.some(cb => cb.category?.toLowerCase() === prefillCategory.toLowerCase())) {
      current.push({ category: prefillCategory, amount: '' });
    }

    if (current.length === 0) {
      current.push(
        { category: 'Accommodation & Stay', amount: '' },
        { category: 'Food & Dining', amount: '' },
        { category: 'Transport & Fuel', amount: '' },
        { category: 'Activities & Sightseeing', amount: '' }
      );
    }

    setCategoryBudgetsDraft(current);
    setShowCategoryBudgetModal(true);
  };

  const handleAddBudgetDraftRow = () => {
    setCategoryBudgetsDraft(prev => [...prev, { category: '', amount: '' }]);
  };

  const handleUpdateBudgetDraftRow = (index, field, value) => {
    setCategoryBudgetsDraft(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveBudgetDraftRow = (index) => {
    setCategoryBudgetsDraft(prev => prev.filter((_, i) => i !== index));
  };

  const handleApplyPreset = (type) => {
    if (type === 'trip') {
      setCategoryBudgetsDraft([
        { category: 'Accommodation & Stay', amount: '' },
        { category: 'Food & Dining', amount: '' },
        { category: 'Transport & Fuel', amount: '' },
        { category: 'Activities & Sightseeing', amount: '' },
        { category: 'Shopping', amount: '' }
      ]);
    } else if (type === 'flatmates') {
      setCategoryBudgetsDraft([
        { category: 'Groceries', amount: '' },
        { category: 'Utilities & Bills', amount: '' },
        { category: 'Food & Dining', amount: '' },
        { category: 'General & Misc', amount: '' }
      ]);
    }
  };

  const handleSaveCategoryBudgets = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const cleaned = categoryBudgetsDraft
        .filter(c => c.category && c.category.trim() && Number(c.amount) >= 0)
        .map(c => ({
          category: c.category.trim(),
          amount: Number(c.amount) || 0
        }));

      await groupsAPI.update(groupId, {
        categoryBudgets: cleaned
      });

      toast.success('Category budgets updated successfully!');
      setShowCategoryBudgetModal(false);
      await loadGroupData();
    } catch (err) {
      console.error('Update category budgets error:', err);
      toast.error(err.response?.data?.message || 'Failed to update category budgets');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Expense Handlers ──────────────────────────────────────────────
  const handleOpenAddExpense = () => {
    if (!group) return;
    const allMemberIds = (group.members || []).map(m => m.user?._id).filter(Boolean);
    const defaultCat = (group.categoryBudgets && group.categoryBudgets.length > 0)
      ? group.categoryBudgets[0].category
      : 'Food & Dining';

    setExpenseForm({
      description: '',
      amount: '',
      category: defaultCat,
      paidBy: user?._id || allMemberIds[0] || '',
      date: new Date().toISOString().split('T')[0],
      splitType: 'equal',
      selectedMembers: allMemberIds,
      notes: ''
    });
    setShowAddExpenseModal(true);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    const numAmount = Number(expenseForm.amount);
    if (!expenseForm.description.trim() || !numAmount || numAmount <= 0) {
      toast.error('Please enter a valid description and amount');
      return;
    }

    if (expenseForm.selectedMembers.length === 0) {
      toast.error('Please select at least 1 member to split this bill');
      return;
    }

    setActionLoading(true);
    try {
      const splitsPayload = expenseForm.selectedMembers.map(uId => ({ user: uId }));

      const payload = {
        description: expenseForm.description.trim(),
        amount: numAmount,
        category: expenseForm.category,
        paidBy: expenseForm.paidBy,
        date: expenseForm.date,
        splitType: 'equal',
        splits: splitsPayload,
        notes: expenseForm.notes.trim()
      };

      await groupsAPI.addExpense(groupId, payload);
      toast.success('Group expense recorded and split calculated!');
      setShowAddExpenseModal(false);
      await loadGroupData();
    } catch (err) {
      console.error('Add expense error:', err);
      toast.error(err.response?.data?.message || 'Failed to add group expense');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await groupsAPI.deleteExpense(groupId, expenseId);
      toast.success('Expense removed');
      await loadGroupData();
    } catch (err) {
      console.error('Delete expense error:', err);
      toast.error('Failed to remove expense');
    }
  };

  // ─── Settlement Handlers ──────────────────────────────────────────
  const handleOpenSettleModal = (debt = null) => {
    if (debt) {
      setSettleForm({
        fromUser: debt.fromUser?._id || '',
        toUser: debt.toUser?._id || '',
        amount: debt.amount || '',
        paymentMethod: 'UPI',
        notes: `Settlement payment from ${debt.fromUser?.name || 'Member'}`
      });
    } else {
      const otherMembers = (group.members || []).filter(m => m.user?._id !== user?._id);
      setSettleForm({
        fromUser: user?._id || '',
        toUser: otherMembers[0]?.user?._id || '',
        amount: '',
        paymentMethod: 'UPI',
        notes: ''
      });
    }
    setShowSettleModal(true);
  };

  const handleRecordSettlement = async (e) => {
    e.preventDefault();
    const numAmount = Number(settleForm.amount);
    if (!settleForm.toUser || !numAmount || numAmount <= 0) {
      toast.error('Please specify the recipient and a valid amount');
      return;
    }

    if (settleForm.fromUser === settleForm.toUser) {
      toast.error('Payer and recipient cannot be the same person');
      return;
    }

    setActionLoading(true);
    try {
      await groupsAPI.recordSettlement(groupId, settleForm);
      toast.success('Payment recorded and debt settled!');
      setShowSettleModal(false);
      await loadGroupData();
    } catch (err) {
      console.error('Settlement error:', err);
      toast.error(err.response?.data?.message || 'Failed to record settlement');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Member Handlers ──────────────────────────────────────────────
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setActionLoading(true);
    try {
      await groupsAPI.addMember(groupId, memberEmail.trim());
      toast.success('Member added to group!');
      setShowAddMemberModal(false);
      setMemberEmail('');
      await loadGroupData();
    } catch (err) {
      console.error('Add member error:', err);
      toast.error(err.response?.data?.message || 'Failed to add member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (memberUserId, memberName) => {
    const isSelf = memberUserId === user?._id;
    const msg = isSelf
      ? 'Are you sure you want to leave this group?'
      : `Remove ${memberName} from this group?`;

    if (!window.confirm(msg)) return;

    try {
      await groupsAPI.removeMember(groupId, memberUserId);
      toast.success(isSelf ? 'You have left the group' : `${memberName} removed`);
      if (isSelf) {
        await fetchGroups();
        navigate('/groups');
      } else {
        await loadGroupData();
      }
    } catch (err) {
      console.error('Remove member error:', err);
      toast.error(err.response?.data?.message || 'Failed to update member');
    }
  };

  // ─── Edit Group Handlers ──────────────────────────────────────────
  const handleAddEditGroupCategoryRow = () => {
    setEditGroupForm(prev => ({
      ...prev,
      categoryBudgets: [...(prev.categoryBudgets || []), { category: '', amount: '' }]
    }));
  };

  const handleUpdateEditGroupCategoryRow = (index, field, value) => {
    setEditGroupForm(prev => {
      const updated = [...(prev.categoryBudgets || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, categoryBudgets: updated };
    });
  };

  const handleRemoveEditGroupCategoryRow = (index) => {
    setEditGroupForm(prev => ({
      ...prev,
      categoryBudgets: (prev.categoryBudgets || []).filter((_, i) => i !== index)
    }));
  };

  const handleSaveGroupSettings = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const cleanedCategoryBudgets = (editGroupForm.categoryBudgets || [])
        .filter(c => c && c.category && c.category.trim() && Number(c.amount) >= 0)
        .map(c => ({
          category: c.category.trim(),
          amount: Number(c.amount) || 0
        }));

      await groupsAPI.update(groupId, {
        name: editGroupForm.name.trim(),
        description: editGroupForm.description.trim(),
        type: editGroupForm.type,
        currency: editGroupForm.currency,
        totalBudget: Math.max(0, Number(editGroupForm.totalBudget) || 0),
        categoryBudgets: cleanedCategoryBudgets
      });
      toast.success('Group settings & budgets updated!');
      setShowEditGroupModal(false);
      await loadGroupData();
    } catch (err) {
      console.error('Update group error:', err);
      toast.error(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    const confirmation = window.prompt(
      `DANGER ZONE: This will permanently delete "${group.name}" and ALL its split expenses, debt records, and uploaded bills.\n\nType the group name "${group.name}" to confirm deletion:`
    );

    if (confirmation !== group.name) {
      if (confirmation !== null) toast.error('Group name did not match. Deletion cancelled.');
      return;
    }

    setActionLoading(true);
    try {
      await groupsAPI.delete(groupId);
      toast.success(`Group "${group.name}" permanently deleted.`);
      await fetchGroups();
      navigate('/groups');
    } catch (err) {
      console.error('Delete group error:', err);
      toast.error(err.response?.data?.message || 'Failed to delete group');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Group Email Handlers ─────────────────────────────────────────
  const handleSendGroupEmail = async (e) => {
    e.preventDefault();
    if (emailTarget === 'custom' && !customEmail.trim()) {
      toast.error('Please enter a recipient email address');
      return;
    }

    setEmailSending(true);
    try {
      const payload = {
        sendToAll: emailTarget === 'all',
        targetEmail: emailTarget === 'custom' ? customEmail.trim() : (emailTarget === 'me' ? user?.email : null)
      };

      const res = await groupsAPI.sendEmailSummary(groupId, payload);
      toast.success(res.data?.message || 'Group summary email sent successfully!');
      setShowEmailModal(false);
      setCustomEmail('');
    } catch (err) {
      console.error('Send group email error:', err);
      toast.error(err.response?.data?.message || 'Failed to send group summary email');
    } finally {
      setEmailSending(false);
    }
  };

  const handleSendReminder = async (debt) => {
    const debtorId = debt.fromUser?._id || debt.fromUser;
    const debtorName = debt.fromUser?.name || 'Member';
    
    setSendingReminderId(debtorId);
    try {
      const res = await groupsAPI.sendSettlementReminder(groupId, {
        debtorId,
        amount: debt.amount,
        notes: `Settlement reminder for ${group?.name || 'our group'}`
      });
      toast.success(res.data?.message || `Settlement reminder sent to ${debtorName}!`);
    } catch (err) {
      console.error('Send reminder error:', err);
      toast.error(err.response?.data?.message || 'Failed to send reminder email');
    } finally {
      setSendingReminderId(null);
    }
  };

  // ─── Sync to Personal Dashboard Handlers ──────────────────────────
  const getEligibleItemsForMode = (items, mode) => {
    return items.filter(item => {
      if (item.isAlreadySynced) return false;
      if (mode === 'my_share') {
        return item.itemType === 'expense' && (item.myShareAmount || 0) > 0;
      }
      if (mode === 'paid_by_me') {
        return item.itemType === 'expense' && item.isPayer && (item.paidAmount || item.amount || 0) > 0;
      }
      if (mode === 'settled_by_me') {
        return item.itemType === 'settlement' && item.isPayer && (item.paidAmount || item.amount || 0) > 0;
      }
      return false;
    });
  };

  const handleOpenSyncModal = async () => {
    setFetchingSyncStatus(true);
    setShowSyncModal(true);
    try {
      const res = await groupsAPI.getSyncStatus(groupId);
      const items = res.data?.data?.items || res.data?.data?.expenses || [];
      setSyncExpensesList(items);
      // Pre-select items that are eligible for current mode and not yet synced
      const eligible = getEligibleItemsForMode(items, syncMode).map(item => item._id);
      setSelectedSyncIds(eligible);
    } catch (err) {
      console.error('Failed to load sync status:', err);
      toast.error('Failed to fetch sync status');
    } finally {
      setFetchingSyncStatus(false);
    }
  };

  const handleModeChange = (newMode) => {
    setSyncMode(newMode);
    const eligible = getEligibleItemsForMode(syncExpensesList, newMode).map(i => i._id);
    setSelectedSyncIds(eligible);
  };

  const toggleSelectSyncItem = (id) => {
    setSelectedSyncIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllSync = () => {
    const currentEligible = getEligibleItemsForMode(syncExpensesList, syncMode).map(item => item._id);

    if (selectedSyncIds.length === currentEligible.length) {
      setSelectedSyncIds([]);
    } else {
      setSelectedSyncIds(currentEligible);
    }
  };

  const handleExecuteSync = async () => {
    if (selectedSyncIds.length === 0) {
      toast.error('Please select at least 1 item to import');
      return;
    }

    setSyncLoading(true);
    try {
      const selectedItems = syncExpensesList.filter(item => selectedSyncIds.includes(item._id));
      const expenseIds = selectedItems.filter(i => i.itemType === 'expense').map(i => i._id);
      const settlementIds = selectedItems.filter(i => i.itemType === 'settlement').map(i => i._id);

      const res = await groupsAPI.importToPersonal(groupId, {
        expenseIds,
        settlementIds,
        itemIds: selectedSyncIds,
        importMode: syncMode
      });
      const data = res.data?.data;
      toast.success(res.data?.message || `Successfully synced ${data?.importedCount || 0} transaction(s) to your Personal Dashboard!`);
      
      // Refresh sync status list
      const updated = await groupsAPI.getSyncStatus(groupId);
      const newItems = updated.data?.data?.items || updated.data?.data?.expenses || [];
      setSyncExpensesList(newItems);
      setSelectedSyncIds([]);
      setShowSyncModal(false);
    } catch (err) {
      console.error('Execute sync error:', err);
      toast.error(err.response?.data?.message || 'Failed to sync to personal dashboard');
    } finally {
      setSyncLoading(false);
    }
  };

  // ─── Group Bill Vault Handlers ─────────────────────────────────────
  const handleBillFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error('File size exceeds 8MB limit');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setBillForm(prev => ({
        ...prev,
        fileData: reader.result,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        title: prev.title || file.name.replace(/\.[^/.]+$/, '')
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveGroupBill = async (e) => {
    e.preventDefault();
    if (!billForm.fileData) {
      toast.error('Please attach a bill image or PDF');
      return;
    }
    if (!billForm.title.trim()) {
      toast.error('Please enter a bill title');
      return;
    }

    setUploadingBill(true);
    try {
      await billsAPI.upload({
        groupId,
        title: billForm.title.trim(),
        category: billForm.category,
        amount: billForm.amount ? Number(billForm.amount) : null,
        date: billForm.date || new Date(),
        fileData: billForm.fileData,
        fileName: billForm.fileName,
        fileType: billForm.fileType,
        fileSize: billForm.fileSize,
        notes: billForm.notes
      });

      toast.success('Bill saved to group vault!');
      setShowUploadBillModal(false);
      setBillForm({
        title: '',
        category: 'Travel & Tickets',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        fileData: null,
        fileName: '',
        fileType: '',
        fileSize: 0
      });
      const updatedBills = await billsAPI.getGroup(groupId);
      setGroupBills(updatedBills.data?.data?.bills || []);
    } catch (err) {
      console.error('Upload group bill error:', err);
      toast.error(err.response?.data?.message || 'Failed to upload bill');
    } finally {
      setUploadingBill(false);
    }
  };

  const handleDeleteGroupBill = async (id, title) => {
    if (!window.confirm(`Delete "${title}" from group vault?`)) return;
    try {
      await billsAPI.delete(id);
      toast.success('Bill removed from group vault');
      setGroupBills(prev => prev.filter(b => b._id !== id));
      if (previewGroupBill?._id === id) setPreviewGroupBill(null);
    } catch (err) {
      toast.error('Failed to delete bill');
    }
  };

  const downloadGroupBill = (fileData, fileName) => {
    const link = document.createElement('a');
    link.href = fileData;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  if (loading || !group) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <div className="skeleton" style={{ width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 1.5rem' }} />
          <p className="text-muted">Loading group...</p>
        </div>
      </Layout>
    );
  }

  const isUserAdmin = group.members?.some(m => m.user?._id === user?._id && m.role === 'admin');
  const totalBudget = group.totalBudget || 0;
  const totalSpent = group.totalSpent || 0;
  const budgetPercent = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;
  const isOverBudget = totalBudget > 0 && totalSpent > totalBudget;
  const progressColor = isOverBudget ? '#ef4444' : budgetPercent > 80 ? '#f97316' : '#10b981';

  const myNetBalance = balances?.myStats?.netBalance || 0;
  const isOwed = myNetBalance > 0.01;
  const owesMoney = myNetBalance < -0.01;

  // Split calculation helper for modal
  const selectedCount = expenseForm.selectedMembers.length;
  const splitAmountPerPerson = (Number(expenseForm.amount) && selectedCount > 0)
    ? Math.round((Number(expenseForm.amount) / selectedCount) * 100) / 100
    : 0;

  return (
    <Layout>
      <Toaster position="top-right" />
      <div className="group-dashboard-container">

        {/* 1. TOP NAVIGATION & BREADCRUMB */}
        <div className="group-top-nav">
          <button
            onClick={() => navigate('/groups')}
            className="group-back-btn"
          >
            <ArrowLeft size={16} /> All Groups
          </button>

          <div className="group-header-tags">
            <span className={`group-chip type-${group.type?.toLowerCase() || 'trip'}`}>
              <Compass size={14} /> {group.type}
            </span>
            {isUserAdmin && (
              <span className="group-chip admin-badge">
                <Shield size={13} /> Organizer
              </span>
            )}
          </div>
        </div>

        {/* 2. HERO TRIP BANNER WITH ACTION BUTTONS */}
        <div className="group-hero-banner">
          <div className="group-hero-left">
            <div className="group-hero-icon">
              <Compass size={32} />
            </div>
            <div className="group-hero-info">
              <h1>{group.name}</h1>
              
              <div className="group-meta-chips">
                {(group.startDate || group.endDate) && (
                  <span className="group-chip date-badge">
                    <Calendar size={13} />
                    <span>
                      {group.startDate ? new Date(group.startDate).toLocaleDateString() : 'Start'}
                      {' → '}
                      {group.endDate ? new Date(group.endDate).toLocaleDateString() : 'End'}
                    </span>
                  </span>
                )}
                <span className="group-chip" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                  <Award size={13} /> {expenses.length} Split Expenses
                </span>
              </div>

              <p>
                {group.description || 'Shared group expenses, budget tracking & instant debt settlements.'}
              </p>

              {/* Invite Code Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
                <button
                  onClick={handleCopyCode}
                  className={`invite-code-btn ${copiedCode ? 'copied' : ''}`}
                  title="Click to copy invite code to share with friends"
                >
                  {copiedCode ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                  Invite Code: <strong style={{ color: '#059669', letterSpacing: '0.5px' }}>{group.inviteCode}</strong>
                </button>

                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="btn btn-secondary btn-sm"
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 750,
                    padding: '8px 16px',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <UserPlus size={15} /> Invite Friend by Email
                </button>
              </div>
            </div>
          </div>

          {/* Big Action Buttons */}
          <div className="group-hero-actions">
            <button
              className="action-pill-btn sync"
              onClick={handleOpenSyncModal}
              title="Import and sync your group spends to your Personal Dashboard"
            >
              <RefreshCw size={17} color="#10b981" /> Sync to Personal
            </button>

            <button
              className="action-pill-btn email"
              onClick={() => setShowEmailModal(true)}
              title="Send group summary and expense report via email"
            >
              <Mail size={17} color="#6366f1" /> Email Report
            </button>

            <button
              className="action-pill-btn settle"
              onClick={() => handleOpenSettleModal()}
            >
              <DollarSign size={17} /> Settle Debt
            </button>

            <button
              className="action-pill-btn primary"
              onClick={handleOpenAddExpense}
            >
              <Plus size={19} strokeWidth={2.5} color="#ffffff" /> Record Expense
            </button>

            {isUserAdmin && (
              <button
                className="btn btn-secondary"
                onClick={() => setShowEditGroupModal(true)}
                style={{ padding: '0.75rem', borderRadius: '50%', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                title="Edit Group Settings & Budgets"
              >
                <Edit size={17} />
              </button>
            )}
          </div>
        </div>

        {/* 3. THREE CRYSTAL-CLEAR CORE STAT CARDS */}
        <div className="group-stats-grid">
          {/* CARD 1: Trip Budget Progress */}
          <div className={`group-stat-card budget-card ${isOverBudget ? 'over-budget' : ''}`}>
            <div>
              <div className="stat-header">
                <span className="stat-label">Group Budget Status</span>
                <span
                  className="stat-tag"
                  style={{
                    background: isOverBudget ? '#fee2e2' : budgetPercent > 80 ? '#ffedd5' : '#dcfce7',
                    color: isOverBudget ? '#dc2626' : budgetPercent > 80 ? '#c2410c' : '#15803d'
                  }}
                >
                  {isOverBudget ? 'Over Budget' : totalBudget > 0 ? `${budgetPercent}% Spent` : 'Flexible'}
                </span>
              </div>

              <div className="stat-number">
                ₹{totalSpent.toLocaleString()}
                <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--gray-500)', marginLeft: '6px' }}>
                  / {totalBudget > 0 ? `₹${totalBudget.toLocaleString()}` : 'No limit set'}
                </span>
              </div>

              {/* Progress Bar */}
              <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', margin: '10px 0' }}>
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
            </div>

            <div className="stat-footer">
              <span className="text-muted">Remaining Funds:</span>
              <strong style={{ color: progressColor, fontSize: '1rem' }}>
                ₹{Math.max(0, totalBudget - totalSpent).toLocaleString()}
              </strong>
            </div>
          </div>

          {/* CARD 2: Your Personal Settlement Balance */}
          <div className={`group-stat-card balance-card ${isOwed ? 'is-owed' : owesMoney ? 'owes-money' : 'settled'}`}>
            <div>
              <div className="stat-header">
                <span className="stat-label">Your Settlement Balance</span>
                <span
                  className="stat-tag"
                  style={{
                    background: isOwed ? '#dcfce7' : owesMoney ? '#fee2e2' : '#ede9fe',
                    color: isOwed ? '#15803d' : owesMoney ? '#dc2626' : '#6d28d9'
                  }}
                >
                  {isOwed ? 'You Are Owed' : owesMoney ? 'You Owe Money' : 'All Square'}
                </span>
              </div>

              <div
                className="stat-number"
                style={{
                  color: isOwed ? '#16a34a' : owesMoney ? '#dc2626' : 'var(--gray-900)'
                }}
              >
                {isOwed ? `+₹${myNetBalance.toLocaleString()}` : owesMoney ? `-₹${Math.abs(myNetBalance).toLocaleString()}` : '₹0.00'}
              </div>

              <p className="stat-subtext">
                {isOwed
                  ? 'Your friends will pay you back this amount to square all bills.'
                  : owesMoney
                  ? 'You need to send this amount to friends to clear your group share.'
                  : 'You have paid exactly your share. No pending settlements.'}
              </p>
            </div>

            <div className="stat-footer">
              <span className="text-muted" style={{ fontSize: '0.825rem' }}>
                {balances?.simplifiedDebts?.length || 0} group debts pending
              </span>
              <button
                onClick={() => setActiveTab('whoOwesWho')}
                style={{ background: 'none', border: 'none', color: '#6d28d9', fontWeight: 800, fontSize: '0.825rem', cursor: 'pointer' }}
              >
                View Debt Matrix →
              </button>
            </div>
          </div>

          {/* CARD 3: Trip Members & Split Stats */}
          <div className="group-stat-card members-card">
            <div>
              <div className="stat-header">
                <span className="stat-label">Group Members</span>
                <span className="stat-tag" style={{ background: '#ede9fe', color: '#6d28d9' }}>
                  {group.members?.length || 0} Members
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', marginLeft: '-4px' }}>
                  {(group.members || []).slice(0, 5).map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        border: '2.5px solid white',
                        marginLeft: idx === 0 ? '0' : '-8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                      title={m.user?.name || 'Member'}
                    >
                      {m.user?.name?.charAt(0) || 'M'}
                    </div>
                  ))}
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: 750, color: 'var(--gray-700)', marginLeft: '6px' }}>
                  {expenses.length} bills split
                </span>
              </div>

              <p className="stat-subtext">
                Expenses are split automatically among selected friends upon entry.
              </p>
            </div>

            <div className="stat-footer">
              <span className="text-muted" style={{ fontSize: '0.825rem' }}>
                Invite code active
              </span>
              <button
                onClick={() => setShowAddMemberModal(true)}
                style={{ background: 'none', border: 'none', color: '#10b981', fontWeight: 800, fontSize: '0.825rem', cursor: 'pointer' }}
              >
                + Add Friend
              </button>
            </div>
          </div>
        </div>

        {/* 4. INTUITIVE NAVIGATION TABS */}
        <div className="group-tabs-nav">
          {[
            { id: 'overview', label: 'Budgets & Breakdown', icon: Target, badge: null },
            { id: 'whoOwesWho', label: 'Who Owes Who (Settlements)', icon: ArrowLeftRight, badge: balances?.simplifiedDebts?.length || 0 },
            { id: 'expenses', label: 'Expense Feed', icon: CreditCard, badge: expenses.length },
            { id: 'bills', label: 'Important Bills', icon: FileText, badge: groupBills.length },
            { id: 'members', label: 'Members & Sharing', icon: Users, badge: group.members?.length || 0 }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group-tab-btn ${isActive ? 'active' : ''}`}
              >
                <TabIcon size={18} color={isActive ? '#059669' : 'var(--gray-500)'} />
                <span>{tab.label}</span>
                {tab.badge !== null && tab.badge > 0 && (
                  <span className="tab-badge-counter">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: Overview & Category Budgets */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Category Budgets Grid */}
            <div className="group-content-card">
              <div className="group-content-header">
                <div>
                  <h3>
                    <Target size={22} color="#10b981" /> Category Budget Breakdown
                  </h3>
                  <p>
                    Track expenses allocated per category (Accommodation, Dining, Travel, Activities, etc.).
                  </p>
                </div>
                {isUserAdmin && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleOpenCategoryBudgetModal()}
                      className="btn btn-primary btn-sm"
                      style={{
                        fontWeight: 800,
                        borderRadius: '999px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%) !important',
                        color: '#ffffff !important'
                      }}
                    >
                      <Plus size={15} /> Manage Category Budgets
                    </button>
                  </div>
                )}
              </div>

              {/* Allocation Summary Bar if totalBudget is set */}
              {totalBudget > 0 && (
                <div
                  style={{
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    borderRadius: '16px',
                    padding: '12px 18px',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.875rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Wallet size={16} color="#6366f1" />
                    <span>
                      Total Category Budgets Allocated: <strong style={{ color: 'var(--gray-900)' }}>₹{(group.totalCategoryBudgets || 0).toLocaleString()}</strong>
                    </span>
                    <span className="text-muted">
                      / Overall Budget: <strong>₹{totalBudget.toLocaleString()}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {group.totalCategoryBudgets > totalBudget ? (
                      <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <AlertTriangle size={14} /> Category budgets exceed group budget by ₹{(group.totalCategoryBudgets - totalBudget).toLocaleString()}
                      </span>
                    ) : (
                      <span style={{ color: '#059669', fontWeight: 750, fontSize: '0.8rem' }}>
                        ₹{Math.max(0, totalBudget - (group.totalCategoryBudgets || 0)).toLocaleString()} Flexible / Unallocated
                      </span>
                    )}
                  </div>
                </div>
              )}

              {(!group.categorySpendBreakdown || group.categorySpendBreakdown.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '2.75rem 1.5rem', background: 'var(--gray-50)', borderRadius: '22px', border: '1.5px dashed var(--gray-300)' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: '#dcfce7', color: '#15803d', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                    <Target size={28} />
                  </div>
                  <h4 style={{ margin: '0 0 0.35rem 0', fontWeight: 900, color: 'var(--gray-900)' }}>
                    No Category Budgets Defined Yet
                  </h4>
                  <p className="text-muted" style={{ margin: '0 auto 1.25rem', maxWidth: '440px', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    Set limits for Food, Stay, Fuel, Activities, and Groceries to avoid overspending as a group.
                  </p>
                  {isUserAdmin && (
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleOpenCategoryBudgetModal()}
                        className="btn btn-primary btn-sm"
                        style={{ borderRadius: '999px', fontWeight: 800, padding: '8px 20px' }}
                      >
                        + Set Category Budgets
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Budgeted Categories Grid */}
                  <div className="category-budgets-grid">
                    {(group.categorySpendBreakdown || []).filter(cb => !cb.isUnbudgeted).map((cb, idx) => {
                      const isCatOver = cb.isOverBudget || cb.spent > cb.budget;
                      const catColor = isCatOver ? '#ef4444' : cb.percentage > 80 ? '#f97316' : '#10b981';
                      const progressWidth = cb.budget > 0 ? Math.min(100, (cb.spent / cb.budget) * 100) : 0;

                      return (
                        <div
                          key={idx}
                          className={`category-budget-item ${isCatOver ? 'over-budget' : ''}`}
                          style={{
                            position: 'relative',
                            background: isCatOver ? '#fff5f5' : '#ffffff',
                            border: `1.5px solid ${isCatOver ? '#fca5a5' : '#e2e8f0'}`,
                            borderRadius: '20px',
                            padding: '1.25rem',
                            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <div>
                              <span style={{ fontWeight: 850, fontSize: '0.95rem', color: 'var(--gray-900)', display: 'block' }}>
                                {cb.category}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  color: isCatOver ? '#dc2626' : cb.percentage > 80 ? '#c2410c' : '#15803d',
                                  background: isCatOver ? '#fee2e2' : cb.percentage > 80 ? '#ffedd5' : '#dcfce7',
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  marginTop: '4px'
                                }}
                              >
                                {isCatOver ? (
                                  <>
                                    <AlertTriangle size={12} /> Over by ₹{(cb.spent - cb.budget).toLocaleString()}
                                  </>
                                ) : (
                                  `${cb.percentage}% Spent`
                                )}
                              </span>
                            </div>

                            {isUserAdmin && (
                              <button
                                onClick={() => handleOpenCategoryBudgetModal(cb.category)}
                                className="btn btn-tertiary btn-sm"
                                style={{ padding: '4px 6px', color: 'var(--gray-500)' }}
                                title="Adjust this category budget"
                              >
                                <Edit size={14} />
                              </button>
                            )}
                          </div>

                          {/* Progress Bar */}
                          <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${progressWidth}%`,
                                background: catColor,
                                borderRadius: '999px',
                                transition: 'width 0.4s ease'
                              }}
                            />
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                            <span className="text-muted">Spent: <strong style={{ color: 'var(--gray-900)' }}>₹{cb.spent.toLocaleString()}</strong></span>
                            <span className="text-muted">Budget: <strong style={{ color: 'var(--gray-900)' }}>₹{cb.budget.toLocaleString()}</strong></span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderTop: '1px dashed #e2e8f0', paddingTop: '6px', marginTop: '6px' }}>
                            <span className="text-muted">Remaining:</span>
                            <strong style={{ color: isCatOver ? '#dc2626' : '#16a34a' }}>
                              {isCatOver ? `-₹${(cb.spent - cb.budget).toLocaleString()}` : `₹${cb.remaining.toLocaleString()}`}
                            </strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Unbudgeted Categories Spending Section (if any expenses exist without budget) */}
                  {(group.categorySpendBreakdown || []).filter(cb => cb.isUnbudgeted).length > 0 && (
                    <div style={{ borderTop: '1.5px dashed #cbd5e1', paddingTop: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                        <AlertCircle size={18} color="#f59e0b" />
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 850, color: 'var(--gray-900)' }}>
                          Unbudgeted Spending in Other Categories
                        </h4>
                      </div>

                      <div className="category-budgets-grid">
                        {(group.categorySpendBreakdown || []).filter(cb => cb.isUnbudgeted).map((cb, idx) => (
                          <div
                            key={`unbudgeted-${idx}`}
                            style={{
                              background: '#fffbeb',
                              border: '1.5px solid #fde68a',
                              borderRadius: '20px',
                              padding: '1.1rem 1.25rem',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              gap: '10px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 850, fontSize: '0.95rem', color: '#92400e' }}>
                                {cb.category}
                              </span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '999px' }}>
                                No Budget Set
                              </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                              <span className="text-muted">Total Spent:</span>
                              <strong style={{ color: 'var(--gray-900)', fontSize: '0.95rem' }}>₹{cb.spent.toLocaleString()}</strong>
                            </div>

                            {isUserAdmin && (
                              <button
                                onClick={() => handleOpenCategoryBudgetModal(cb.category)}
                                className="btn btn-secondary btn-sm"
                                style={{
                                  borderRadius: '999px',
                                  fontSize: '0.785rem',
                                  fontWeight: 800,
                                  padding: '5px 12px',
                                  borderColor: '#fcd34d',
                                  color: '#b45309',
                                  background: 'white'
                                }}
                              >
                                + Set Budget Limit
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Member Spending Contributions Breakdown */}
            <div className="group-content-card">
              <div className="group-content-header">
                <div>
                  <h3>
                    <Users size={22} color="#6366f1" /> Member Spending vs Consumed Shares
                  </h3>
                  <p>
                    Summary of how much each friend paid up-front for the group versus their consumed share.
                  </p>
                </div>
              </div>

              <div className="member-contributions-grid">
                {(balances?.memberBalances || []).map((mb, i) => (
                  <div
                    key={i}
                    className="member-contribution-card"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: '1rem',
                          boxShadow: '0 3px 10px rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        {mb.user?.name?.charAt(0) || 'M'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 850, fontSize: '0.975rem', color: 'var(--gray-900)' }}>
                          {mb.user?.name} {mb.user?._id === user?._id ? '(You)' : ''}
                        </div>
                        <div style={{ fontSize: '0.775rem', color: 'var(--gray-500)' }}>{mb.user?.email}</div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="text-muted">Paid for group:</span>
                        <strong style={{ color: 'var(--gray-900)' }}>₹{mb.totalPaid.toLocaleString()}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="text-muted">Consumed share:</span>
                        <strong style={{ color: 'var(--gray-900)' }}>₹{mb.totalShare.toLocaleString()}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: '8px', marginTop: '4px' }}>
                        <span style={{ fontWeight: 750 }}>Net Standing:</span>
                        <strong style={{ color: mb.netBalance > 0 ? '#16a34a' : mb.netBalance < 0 ? '#dc2626' : 'var(--gray-800)' }}>
                          {mb.netBalance > 0 ? `+₹${mb.netBalance.toLocaleString()} (Gets back)` : mb.netBalance < 0 ? `-₹${Math.abs(mb.netBalance).toLocaleString()} (Owes)` : 'Settled'}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: Who Owes Who (Settlements) */}
        {activeTab === 'whoOwesWho' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div className="group-content-card">
              <div className="group-content-header">
                <div>
                  <h3>
                    <ArrowLeftRight size={22} color="#059669" /> Who Owes Who (Minimum Payment Engine)
                  </h3>
                  <p>
                    Simplified pairwise payments needed to square up all balances completely.
                  </p>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => handleOpenSettleModal()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 800,
                    padding: '0.75rem 1.4rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%) !important',
                    color: '#ffffff !important',
                    borderRadius: '999px',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                  }}
                >
                  <DollarSign size={16} strokeWidth={2.5} color="#ffffff" /> Record Custom Settlement
                </button>
              </div>

              {(!balances?.simplifiedDebts || balances.simplifiedDebts.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#f0fdf4', borderRadius: '22px', border: '1.5px solid #bbf7d0' }}>
                  <CheckCircle2 size={52} color="#16a34a" style={{ marginBottom: '1rem' }} />
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', color: '#15803d', fontWeight: 900 }}>
                    All Balances Are 100% Settled!
                  </h4>
                  <p style={{ color: '#166534', margin: 0, fontSize: '0.95rem' }}>
                    No one owes anyone in this group. Every member is completely square!
                  </p>
                </div>
              ) : (
                <div className="debt-matrix-grid">
                  {balances.simplifiedDebts.map((debt, idx) => (
                    <div
                      key={idx}
                      className="debt-flow-card"
                    >
                      {/* Visual Payer -> Recipient Flow */}
                      <div className="debt-flow-users">
                        {/* Debtor */}
                        <div className="debt-user-node">
                          <div className="debt-user-avatar from">
                            {debt.fromUser?.name?.charAt(0) || 'D'}
                          </div>
                          <div style={{ fontWeight: 850, fontSize: '0.925rem', color: 'var(--gray-900)' }}>
                            {debt.fromUser?.name || 'Member'}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 800 }}>
                            Needs to Pay
                          </span>
                        </div>

                        {/* Amount & Arrow */}
                        <div className="debt-arrow-box">
                          <div className="debt-arrow-pill">
                            ₹{debt.amount.toLocaleString()}
                          </div>
                          <div style={{ color: '#10b981', display: 'flex', justifyContent: 'center' }}>
                            <ArrowRight size={22} strokeWidth={2.5} />
                          </div>
                        </div>

                        {/* Creditor */}
                        <div className="debt-user-node">
                          <div className="debt-user-avatar to">
                            {debt.toUser?.name?.charAt(0) || 'C'}
                          </div>
                          <div style={{ fontWeight: 850, fontSize: '0.925rem', color: 'var(--gray-900)' }}>
                            {debt.toUser?.name || 'Member'}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 800 }}>
                            Receives
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleOpenSettleModal(debt)}
                          style={{
                            flex: 1,
                            minWidth: '130px',
                            fontWeight: 800,
                            padding: '0.7rem 0.9rem',
                            borderRadius: '999px',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%) !important',
                            color: '#ffffff !important',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          <Check size={16} strokeWidth={2.5} /> Settle
                        </button>

                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleSendReminder(debt)}
                          disabled={sendingReminderId === (debt.fromUser?._id || debt.fromUser)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            padding: '0.7rem 0.9rem',
                            borderRadius: '999px',
                            fontWeight: 750,
                            fontSize: '0.825rem',
                            border: '1.5px solid #c7d2fe',
                            color: '#4338ca',
                            background: '#ffffff'
                          }}
                          title={`Send an email reminder to ${debt.fromUser?.name || 'debtor'}`}
                        >
                          {sendingReminderId === (debt.fromUser?._id || debt.fromUser) ? (
                            <>
                              <Loader2 size={14} className="animate-spin" /> Reminding...
                            </>
                          ) : (
                            <>
                              <Mail size={14} color="#6366f1" /> Send Reminder
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Settlements Log */}
            {settlements.length > 0 && (
              <div className="group-content-card">
                <div className="group-content-header">
                  <h3>
                    <CheckCircle2 size={20} color="#10b981" /> Settled Payment History
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {settlements.map((st, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '1.1rem 1.35rem',
                        background: '#f8fafc',
                        borderRadius: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.925rem',
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CheckCircle2 size={18} color="#10b981" />
                        <span>
                          <strong>{st.fromUser?.name}</strong> paid <strong>{st.toUser?.name}</strong> via <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: '6px', fontSize: '0.775rem', fontWeight: 800 }}>{st.paymentMethod}</span>
                        </span>
                      </div>
                      <div style={{ fontWeight: 900, color: '#10b981', fontSize: '1.05rem' }}>
                        ₹{st.amount.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 3: Expense Feed */}
        {activeTab === 'expenses' && (
          <div className="card" style={{ padding: '2rem', borderRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900 }}>
                  Expense Log
                </h3>
                <p className="text-muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
                  All bills recorded for this group with individual member splits.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleOpenSyncModal}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    fontWeight: 700,
                    padding: '0.75rem 1.35rem',
                    borderRadius: '999px',
                    fontSize: '0.9rem',
                    border: '1.5px solid #a7f3d0',
                    color: '#047857',
                    background: '#ffffff'
                  }}
                  title="Import group spends into your Personal Dashboard"
                >
                  <RefreshCw size={16} color="#10b981" /> Sync to Personal
                </button>

                <button
                  className="btn btn-primary"
                  onClick={handleOpenAddExpense}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 800,
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%) !important',
                    color: '#ffffff !important',
                    borderRadius: '999px',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                  }}
                >
                  <Plus size={18} strokeWidth={2.5} color="#ffffff" /> Record New Expense
                </button>
              </div>
            </div>

            {expenses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: 'var(--gray-50)', borderRadius: '20px' }}>
                <Receipt size={48} style={{ color: 'var(--primary-400)', marginBottom: '1rem' }} />
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 800 }}>No Expenses Yet</h4>
                <p className="text-muted" style={{ maxWidth: '400px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                  Record shared bills, fuel, dining, and tickets to split costs with your group.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={handleOpenAddExpense}
                  style={{
                    fontWeight: 800,
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%) !important',
                    color: '#ffffff !important',
                    borderRadius: '999px'
                  }}
                >
                  <Plus size={18} /> Record First Expense
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {expenses.map(exp => {
                  const isPayer = exp.paidBy?._id === user?._id;
                  const mySplit = (exp.splits || []).find(s => s.user?._id === user?._id || s.user === user?._id);
                  return (
                    <div
                      key={exp._id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1.25rem 1.5rem',
                        background: 'var(--gray-50)',
                        borderRadius: '18px',
                        border: '1px solid var(--gray-200)',
                        flexWrap: 'wrap',
                        gap: '1rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '14px',
                            background: '#dcfce7',
                            color: '#15803d',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800
                          }}
                        >
                          <Tag size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--gray-900)' }}>
                            {exp.description}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', display: 'flex', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                            <span>{new Date(exp.date).toLocaleDateString()}</span>
                            <span>•</span>
                            <span style={{ fontWeight: 700, color: '#059669' }}>{exp.category}</span>
                            <span>•</span>
                            <span>Paid by <strong>{exp.paidBy?.name || 'Member'}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--gray-900)' }}>
                            ₹{exp.amount.toLocaleString()}
                          </div>
                          <div style={{ fontSize: '0.785rem', color: 'var(--gray-600)' }}>
                            {mySplit ? (
                              <span>Your share: <strong>₹{mySplit.amount.toLocaleString()}</strong></span>
                            ) : (
                              <span>Not involved in split</span>
                            )}
                          </div>
                        </div>

                        <button
                          className="btn btn-sm"
                          onClick={() => handleDeleteExpense(exp._id)}
                          style={{
                            padding: '8px',
                            background: '#fee2e2',
                            color: '#dc2626',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                          title="Delete Expense"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Important Bills & Documents */}
        {activeTab === 'bills' && (
          <div className="card" style={{ padding: '2rem', borderRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={22} color="#10b981" />
                  <span>Important Bills & Tickets Vault</span>
                </h3>
                <p className="text-muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
                  Store flight tickets, hotel reservations, food receipts, and booking vouchers for {group.name}.
                </p>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => setShowUploadBillModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 800,
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%) !important',
                  color: '#ffffff !important',
                  borderRadius: '999px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                }}
              >
                <Plus size={18} strokeWidth={2.5} color="#ffffff" /> Upload Group Bill
              </button>
            </div>

            {groupBills.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: '#f8fafc', borderRadius: '20px', border: '2px dashed #cbd5e1' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#15803d' }}>
                  <FileText size={30} />
                </div>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 900 }}>No bills uploaded to this group yet</h4>
                <p className="text-muted" style={{ margin: '0 0 1.5rem 0', maxWidth: '420px', marginInline: 'auto', fontSize: '0.9rem' }}>
                  Upload flight tickets, hotel booking PDFs, or shared dining receipts so all group members can view and download them anytime.
                </p>
                <button
                  onClick={() => setShowUploadBillModal(true)}
                  className="btn btn-primary btn-sm"
                  style={{
                    borderRadius: '999px',
                    fontWeight: 800,
                    padding: '0.65rem 1.4rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%) !important',
                    color: '#ffffff !important'
                  }}
                >
                  + Upload First Group Bill
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {groupBills.map((bill) => {
                  const isPdf = bill.fileType?.includes('pdf') || bill.fileName?.toLowerCase().endsWith('.pdf');
                  const uploaderName = bill.uploadedBy?.name || 'Member';
                  const isUploaderOrAdmin = bill.uploadedBy?._id === user?._id || isUserAdmin;

                  return (
                    <div
                      key={bill._id}
                      className="clay-card-interactive"
                      style={{
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '1rem'
                      }}
                    >
                      <div>
                        {/* Thumbnail / Header */}
                        <div
                          style={{
                            height: '140px',
                            borderRadius: '16px',
                            background: isPdf ? 'linear-gradient(135deg, #fee2e2, #fecdd3)' : '#f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            marginBottom: '1rem',
                            position: 'relative',
                            border: '1px solid rgba(0,0,0,0.05)',
                            cursor: 'pointer'
                          }}
                          onClick={() => setPreviewGroupBill(bill)}
                          title="Click to preview bill"
                        >
                          {isPdf ? (
                            <div style={{ textAlign: 'center', color: '#dc2626' }}>
                              <FileText size={48} style={{ margin: '0 auto 4px' }} />
                              <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>PDF Document</div>
                            </div>
                          ) : (
                            <img
                              src={bill.fileData}
                              alt={bill.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          )}

                          <span
                            style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              background: 'rgba(0,0,0,0.65)',
                              color: 'white',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              fontSize: '0.7rem',
                              fontWeight: 700
                            }}
                          >
                            {formatFileSize(bill.fileSize)}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--gray-900)', wordBreak: 'break-word' }}>
                            {bill.title}
                          </h4>
                          {bill.amount !== null && bill.amount !== undefined && (
                            <span style={{ fontSize: '1rem', fontWeight: 900, color: '#16a34a', whiteSpace: 'nowrap' }}>
                              ₹{Number(bill.amount).toLocaleString()}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '0.725rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background: '#dcfce7',
                              color: '#15803d'
                            }}
                          >
                            {bill.category}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                            by {uploaderName}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>•</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                            {new Date(bill.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>

                        {bill.notes && (
                          <p style={{ fontSize: '0.8rem', color: 'var(--gray-600)', margin: '0 0 10px 0', lineClamp: 2, overflow: 'hidden' }}>
                            {bill.notes}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                        <button
                          onClick={() => setPreviewGroupBill(bill)}
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 700 }}
                        >
                          <Eye size={14} /> View
                        </button>
                        <button
                          onClick={() => downloadGroupBill(bill.fileData, bill.fileName)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '6px 10px' }}
                          title="Download file"
                        >
                          <Download size={14} />
                        </button>
                        {isUploaderOrAdmin && (
                          <button
                            onClick={() => handleDeleteGroupBill(bill._id, bill.title)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '6px 10px', color: '#dc2626', borderColor: '#fecdd3' }}
                            title="Delete bill"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Group Members */}
        {activeTab === 'members' && (
          <div className="card" style={{ padding: '2rem', borderRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900 }}>
                  Members & Roles
                </h3>
                <p className="text-muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
                  Manage group members, invite friends with codes, and assign organizer permissions.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleCopyCode}
                  className="btn btn-secondary btn-sm"
                  style={{ fontWeight: 700, padding: '0.65rem 1.3rem', borderRadius: '999px' }}
                >
                  <Copy size={16} /> Copy Invite Code
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowAddMemberModal(true)}
                  style={{
                    fontWeight: 800,
                    padding: '0.65rem 1.3rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%) !important',
                    color: '#ffffff !important',
                    borderRadius: '999px'
                  }}
                >
                  <UserPlus size={16} color="#ffffff" /> Invite by Email
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(group.members || []).map((m, i) => {
                const isSelf = m.user?._id === user?._id;
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1.25rem 1.5rem',
                      background: 'var(--gray-50)',
                      borderRadius: '16px',
                      border: '1px solid var(--gray-200)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1.1rem'
                        }}
                      >
                        {m.user?.name?.charAt(0) || 'M'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {m.user?.name || 'Member'}
                          {isSelf && (
                            <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>
                              You
                            </span>
                          )}
                          {m.role === 'admin' && (
                            <span style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>
                              Organizer
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                          {m.user?.email} • Joined {new Date(m.joinedAt || Date.now()).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div>
                      {isSelf ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleRemoveMember(m.user?._id, m.user?.name)}
                          style={{ color: '#dc2626', borderColor: '#fca5a5', fontWeight: 700 }}
                        >
                          <LogOut size={14} /> Leave Group
                        </button>
                      ) : isUserAdmin ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleRemoveMember(m.user?._id, m.user?.name)}
                          style={{ color: '#dc2626', fontWeight: 700 }}
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {isUserAdmin && (
              <div style={{ marginTop: '2.5rem', borderTop: '2px dashed #fecdd3', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h4 style={{ margin: 0, color: '#dc2626', fontWeight: 900, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={18} /> Danger Zone: Delete Group
                  </h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                    Permanently removes this group, all expense history, settlements, and uploaded vault bills.
                  </p>
                </div>
                <button
                  onClick={handleDeleteGroup}
                  className="btn btn-sm"
                  style={{
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: '1.5px solid #fca5a5',
                    borderRadius: '999px',
                    fontWeight: 800,
                    padding: '0.65rem 1.4rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={16} /> Delete Group Permanently
                </button>
              </div>
            )}
          </div>
        )}

        {/* MODAL: Record Trip Expense */}
        {showAddExpenseModal && (
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
                maxWidth: '560px',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: 'white',
                borderRadius: '26px',
                padding: '2.25rem',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>
                  Record Expense
                </h3>
                <button
                  className="btn btn-tertiary"
                  onClick={() => setShowAddExpenseModal(false)}
                  style={{ padding: '6px', borderRadius: '50%' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveExpense}>
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block' }}>What was this for? *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="e.g. Seafood dinner, Goa Resort stay, Taxi fare, Scuba diving"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block' }}>Total Bill (₹) *</label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="any"
                      className="input"
                      placeholder="0.00"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block' }}>Category</label>
                    <select
                      className="select"
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    >
                      {(group.categoryBudgets && group.categoryBudgets.length > 0) && (
                        <optgroup label="Group Budgeted Categories">
                          {group.categoryBudgets.map((cb, idx) => (
                            <option key={`budgeted-${idx}`} value={cb.category}>
                              {cb.category} (Budget: ₹{Number(cb.amount || 0).toLocaleString()})
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="Standard Categories">
                        {PRESET_CATEGORIES.map((cat, idx) => (
                          <option key={`std-${idx}`} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block' }}>Who paid the bill?</label>
                    <select
                      className="select"
                      value={expenseForm.paidBy}
                      onChange={(e) => setExpenseForm({ ...expenseForm, paidBy: e.target.value })}
                    >
                      {(group.members || []).map(m => (
                        <option key={m.user?._id} value={m.user?._id}>
                          {m.user?.name} {m.user?._id === user?._id ? '(You)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block' }}>Date</label>
                    <input
                      type="date"
                      className="input"
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    />
                  </div>
                </div>

                {/* Split Selection with Live Math */}
                <div style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '18px', border: '1.5px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <label style={{ fontWeight: 800, margin: 0, fontSize: '0.9rem' }}>
                      Split Among ({selectedCount} Friends)
                    </label>
                    {splitAmountPerPerson > 0 && (
                      <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.875rem' }}>
                        ₹{splitAmountPerPerson.toLocaleString()} / person
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {(group.members || []).map(m => {
                      const isChecked = expenseForm.selectedMembers.includes(m.user?._id);
                      return (
                        <label
                          key={m.user?._id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            margin: 0,
                            padding: '8px 10px',
                            borderRadius: '10px',
                            background: isChecked ? '#dcfce7' : 'white',
                            border: `1.5px solid ${isChecked ? '#86efac' : '#e2e8f0'}`,
                            fontWeight: isChecked ? 700 : 500
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setExpenseForm({
                                  ...expenseForm,
                                  selectedMembers: [...expenseForm.selectedMembers, m.user?._id]
                                });
                              } else {
                                setExpenseForm({
                                  ...expenseForm,
                                  selectedMembers: expenseForm.selectedMembers.filter(id => id !== m.user?._id)
                                });
                              }
                            }}
                            style={{ accentColor: '#10b981', width: '16px', height: '16px' }}
                          />
                          <span>{m.user?.name} {m.user?._id === user?._id ? '(You)' : ''}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAddExpenseModal(false)}
                    style={{ fontWeight: 700 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={actionLoading}
                    style={{
                      fontWeight: 800,
                      padding: '0.75rem 1.6rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%) !important',
                      color: '#ffffff !important',
                      borderRadius: '999px',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                    }}
                  >
                    {actionLoading ? 'Saving...' : 'Record & Split Bill'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Settle Up */}
        {showSettleModal && (
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
                maxWidth: '500px',
                background: 'white',
                borderRadius: '24px',
                padding: '2.25rem',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900 }}>
                  Record Settlement Payment
                </h3>
                <button
                  className="btn btn-tertiary"
                  onClick={() => setShowSettleModal(false)}
                  style={{ padding: '6px', borderRadius: '50%' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleRecordSettlement}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block' }}>Who is paying?</label>
                    <select
                      className="select"
                      value={settleForm.fromUser}
                      onChange={(e) => setSettleForm({ ...settleForm, fromUser: e.target.value })}
                    >
                      {(group.members || []).map(m => (
                        <option key={m.user?._id} value={m.user?._id}>
                          {m.user?.name} {m.user?._id === user?._id ? '(You)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block' }}>Who is receiving?</label>
                    <select
                      className="select"
                      value={settleForm.toUser}
                      onChange={(e) => setSettleForm({ ...settleForm, toUser: e.target.value })}
                    >
                      {(group.members || []).map(m => (
                        <option key={m.user?._id} value={m.user?._id}>
                          {m.user?.name} {m.user?._id === user?._id ? '(You)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block' }}>Amount (₹) *</label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="any"
                      className="input"
                      placeholder="0.00"
                      value={settleForm.amount}
                      onChange={(e) => setSettleForm({ ...settleForm, amount: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block' }}>Payment Mode</label>
                    <select
                      className="select"
                      value={settleForm.paymentMethod}
                      onChange={(e) => setSettleForm({ ...settleForm, paymentMethod: e.target.value })}
                    >
                      <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer / IMPS</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowSettleModal(false)}
                    style={{ fontWeight: 700 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={actionLoading}
                    style={{
                      fontWeight: 800,
                      padding: '0.75rem 1.6rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%) !important',
                      color: '#ffffff !important',
                      borderRadius: '999px',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                    }}
                  >
                    {actionLoading ? 'Recording...' : 'Mark as Settled'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Add Member */}
        {showAddMemberModal && (
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
                maxWidth: '460px',
                background: 'white',
                borderRadius: '24px',
                padding: '2.25rem',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900 }}>
                  Invite Friend to Group
                </h3>
                <button
                  className="btn btn-tertiary"
                  onClick={() => setShowAddMemberModal(false)}
                  style={{ padding: '6px', borderRadius: '50%' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddMember}>
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontWeight: 800, marginBottom: '0.5rem', display: 'block' }}>Friend's Email Address *</label>
                  <input
                    type="email"
                    required
                    className="input"
                    placeholder="friend@example.com"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAddMemberModal(false)}
                    style={{ fontWeight: 700 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={actionLoading}
                    style={{
                      fontWeight: 800,
                      padding: '0.75rem 1.6rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%) !important',
                      color: '#ffffff !important',
                      borderRadius: '999px'
                    }}
                  >
                    {actionLoading ? 'Adding...' : 'Add to Group'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Dedicated Category Budgets Manager */}
        {showCategoryBudgetModal && (
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
                maxWidth: '640px',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: 'white',
                borderRadius: '26px',
                padding: '2.25rem',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <Target size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: 'var(--gray-900)' }}>
                      Manage Category Budgets
                    </h3>
                    <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>
                      Set individual spending caps for {group.name}
                    </p>
                  </div>
                </div>
                <button
                  className="btn btn-tertiary"
                  onClick={() => setShowCategoryBudgetModal(false)}
                  style={{ padding: '6px', borderRadius: '50%' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Quick Presets Bar */}
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--gray-600)', marginBottom: '8px' }}>
                  Quick Templates:
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('trip')}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.8rem', borderRadius: '999px', padding: '4px 12px', fontWeight: 750, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plane size={14} /> Trip / Vacation
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('flatmates')}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.8rem', borderRadius: '999px', padding: '4px 12px', fontWeight: 750, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Home size={14} /> Flatmates / Home
                  </button>
                </div>
              </div>

              {/* Live Allocation Summary */}
              {(() => {
                const totalAllocated = categoryBudgetsDraft.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
                const isExceeded = totalBudget > 0 && totalAllocated > totalBudget;
                return (
                  <div
                    style={{
                      background: isExceeded ? '#fff5f5' : '#f0fdf4',
                      border: `1.5px solid ${isExceeded ? '#fca5a5' : '#a7f3d0'}`,
                      padding: '12px 16px',
                      borderRadius: '16px',
                      marginBottom: '1.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div>
                      <span className="text-muted">Total Category Allocation: </span>
                      <strong style={{ color: isExceeded ? '#dc2626' : '#15803d', fontSize: '0.95rem' }}>
                        ₹{totalAllocated.toLocaleString()}
                      </strong>
                      {totalBudget > 0 && (
                        <span className="text-muted"> / ₹{totalBudget.toLocaleString()}</span>
                      )}
                    </div>
                    {totalBudget > 0 && (
                      <span style={{ fontWeight: 800, color: isExceeded ? '#dc2626' : '#15803d', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {isExceeded ? (
                          <>
                            <AlertTriangle size={13} /> Exceeds overall budget by ₹{(totalAllocated - totalBudget).toLocaleString()}
                          </>
                        ) : (
                          `₹${(totalBudget - totalAllocated).toLocaleString()} unallocated`
                        )}
                      </span>
                    )}
                  </div>
                );
              })()}

              <form onSubmit={handleSaveCategoryBudgets}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.5rem' }}>
                  {categoryBudgetsDraft.map((cb, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div style={{ flex: 3, position: 'relative' }}>
                        <input
                          type="text"
                          list={`categories-list-${idx}`}
                          className="input"
                          placeholder="Category name (e.g. Food & Dining)"
                          value={cb.category}
                          onChange={(e) => handleUpdateBudgetDraftRow(idx, 'category', e.target.value)}
                          style={{ padding: '0.6rem 0.85rem', fontSize: '0.9rem' }}
                        />
                        <datalist id={`categories-list-${idx}`}>
                          {PRESET_CATEGORIES.map((preset, pIdx) => (
                            <option key={pIdx} value={preset} />
                          ))}
                        </datalist>
                      </div>

                      <div style={{ flex: 2, display: 'flex', alignItems: 'center', position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '10px', color: 'var(--gray-500)', fontWeight: 700, fontSize: '0.9rem' }}>₹</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="input"
                          placeholder="Budget amount"
                          value={cb.amount}
                          onChange={(e) => handleUpdateBudgetDraftRow(idx, 'amount', e.target.value)}
                          style={{ paddingLeft: '1.75rem', paddingRight: '0.75rem', fontSize: '0.9rem' }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveBudgetDraftRow(idx)}
                        className="btn btn-tertiary"
                        style={{ padding: '8px', color: '#ef4444', borderRadius: '10px' }}
                        title="Remove category"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddBudgetDraftRow}
                    className="btn btn-secondary btn-sm"
                    style={{
                      marginTop: '6px',
                      alignSelf: 'flex-start',
                      borderRadius: '999px',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.85rem',
                      padding: '6px 14px'
                    }}
                  >
                    <Plus size={15} /> Add Another Category
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCategoryBudgetModal(false)}
                    style={{ fontWeight: 700 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={actionLoading}
                    style={{
                      fontWeight: 800,
                      padding: '0.75rem 1.6rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%) !important',
                      color: '#ffffff !important',
                      borderRadius: '999px',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                    }}
                  >
                    {actionLoading ? 'Saving...' : 'Save Category Budgets'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Edit Group Settings */}
        {showEditGroupModal && (
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900 }}>
                  Edit Group Settings & Budgets
                </h3>
                <button
                  className="btn btn-tertiary"
                  onClick={() => setShowEditGroupModal(false)}
                  style={{ padding: '6px', borderRadius: '50%' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveGroupSettings}>
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block' }}>Group Name</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={editGroupForm.name}
                    onChange={(e) => setEditGroupForm({ ...editGroupForm, name: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block' }}>Description (optional)</label>
                  <textarea
                    rows={2}
                    className="input"
                    value={editGroupForm.description}
                    onChange={(e) => setEditGroupForm({ ...editGroupForm, description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block' }}>Group Type</label>
                    <select
                      className="select"
                      value={editGroupForm.type}
                      onChange={(e) => setEditGroupForm({ ...editGroupForm, type: e.target.value })}
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
                    <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block' }}>Total Overall Budget (₹)</label>
                    <input
                      type="number"
                      min="0"
                      className="input"
                      value={editGroupForm.totalBudget}
                      onChange={(e) => setEditGroupForm({ ...editGroupForm, totalBudget: e.target.value })}
                    />
                  </div>
                </div>

                {/* Category Budgets Editor inside Edit Group Settings */}
                <div style={{ marginBottom: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <label style={{ fontWeight: 800, margin: 0, fontSize: '0.95rem' }}>
                      Category Budgets ({editGroupForm.categoryBudgets?.length || 0})
                    </label>
                    <button
                      type="button"
                      onClick={handleAddEditGroupCategoryRow}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.785rem', padding: '4px 10px', fontWeight: 800, borderRadius: '999px' }}
                    >
                      + Add Category
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(editGroupForm.categoryBudgets || []).map((cb, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          list={`edit-categories-list-${idx}`}
                          className="input"
                          placeholder="Category name"
                          value={cb.category}
                          onChange={(e) => handleUpdateEditGroupCategoryRow(idx, 'category', e.target.value)}
                          style={{ flex: 3, padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}
                        />
                        <datalist id={`edit-categories-list-${idx}`}>
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
                            onChange={(e) => handleUpdateEditGroupCategoryRow(idx, 'amount', e.target.value)}
                            style={{ paddingLeft: '1.5rem', paddingRight: '0.5rem', fontSize: '0.875rem' }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveEditGroupCategoryRow(idx)}
                          className="btn btn-tertiary btn-sm"
                          style={{ padding: '6px', color: '#ef4444' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginBottom: isUserAdmin ? '1.5rem' : '0' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowEditGroupModal(false)}
                    style={{ fontWeight: 700 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={actionLoading}
                    style={{
                      fontWeight: 800,
                      padding: '0.75rem 1.6rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%) !important',
                      color: '#ffffff !important',
                      borderRadius: '999px'
                    }}
                  >
                    {actionLoading ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>

                {isUserAdmin && (
                  <div style={{ borderTop: '2px dashed #fecdd3', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h4 style={{ margin: 0, color: '#dc2626', fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertCircle size={16} /> Danger Zone: Delete Group
                        </h4>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--gray-600)' }}>
                          Permanently delete this group and all its records.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleDeleteGroup}
                        className="btn btn-sm"
                        style={{
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: '1.5px solid #fca5a5',
                          borderRadius: '999px',
                          fontWeight: 800,
                          padding: '6px 14px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={14} /> Delete Group
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Send Group Email Report */}
        {showEmailModal && (
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
                maxWidth: '540px',
                background: 'white',
                borderRadius: '24px',
                padding: '2.25rem',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                    }}
                  >
                    <Mail size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--gray-900)' }}>
                      Email Group Report
                    </h3>
                    <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>
                      Send an expense, budget & settlement summary for {group.name}
                    </p>
                  </div>
                </div>
                <button
                  className="btn btn-tertiary"
                  onClick={() => setShowEmailModal(false)}
                  style={{ padding: '6px', borderRadius: '50%' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSendGroupEmail}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontWeight: 800, marginBottom: '0.5rem', display: 'block', fontSize: '0.9rem' }}>
                    Choose Recipients
                  </label>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        borderRadius: '14px',
                        border: `1.5px solid ${emailTarget === 'all' ? '#6366f1' : '#e2e8f0'}`,
                        background: emailTarget === 'all' ? '#f5f3ff' : '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <input
                        type="radio"
                        name="emailTarget"
                        value="all"
                        checked={emailTarget === 'all'}
                        onChange={() => setEmailTarget('all')}
                        style={{ accentColor: '#6366f1' }}
                      />
                      <div>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--gray-900)' }}>
                          Send to All Group Members ({group.members?.length || 0})
                        </strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                          Every member with an email address will receive this summary.
                        </div>
                      </div>
                    </label>

                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        borderRadius: '14px',
                        border: `1.5px solid ${emailTarget === 'me' ? '#6366f1' : '#e2e8f0'}`,
                        background: emailTarget === 'me' ? '#f5f3ff' : '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <input
                        type="radio"
                        name="emailTarget"
                        value="me"
                        checked={emailTarget === 'me'}
                        onChange={() => setEmailTarget('me')}
                        style={{ accentColor: '#6366f1' }}
                      />
                      <div>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--gray-900)' }}>
                          Send to My Email Only
                        </strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                          {user?.email}
                        </div>
                      </div>
                    </label>

                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        borderRadius: '14px',
                        border: `1.5px solid ${emailTarget === 'custom' ? '#6366f1' : '#e2e8f0'}`,
                        background: emailTarget === 'custom' ? '#f5f3ff' : '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <input
                        type="radio"
                        name="emailTarget"
                        value="custom"
                        checked={emailTarget === 'custom'}
                        onChange={() => setEmailTarget('custom')}
                        style={{ accentColor: '#6366f1' }}
                      />
                      <div>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--gray-900)' }}>
                          Send to a Specific Email Address
                        </strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                          Enter any custom recipient email.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {emailTarget === 'custom' && (
                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block', fontSize: '0.85rem' }}>
                      Recipient Email
                    </label>
                    <input
                      type="email"
                      required
                      className="input"
                      placeholder="recipient@example.com"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                    />
                  </div>
                )}

                <div
                  style={{
                    background: '#eef2ff',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    marginBottom: '1.5rem',
                    fontSize: '0.8rem',
                    color: '#3730a3',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Sparkles size={16} />
                  <span>The report includes recent group expenses, category progress, and "Who Owes Who" settlements.</span>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowEmailModal(false)}
                    style={{ fontWeight: 700 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={emailSending}
                    style={{
                      fontWeight: 800,
                      padding: '0.75rem 1.6rem',
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important',
                      color: '#ffffff !important',
                      borderRadius: '999px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {emailSending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Sending Report...
                      </>
                    ) : (
                      <>
                        <Send size={16} /> Send Email Report
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Upload Group Bill */}
        {showUploadBillModal && (
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
                maxWidth: '560px',
                background: 'white',
                borderRadius: '24px',
                padding: '2.25rem',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d' }}>
                    <FileText size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900 }}>
                      Upload Group Bill / Voucher
                    </h3>
                    <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>
                      Shared with all members in {group.name}
                    </p>
                  </div>
                </div>
                <button
                  className="btn btn-tertiary"
                  onClick={() => setShowUploadBillModal(false)}
                  style={{ padding: '6px', borderRadius: '50%' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveGroupBill}>
                {/* File Drop Area */}
                <div
                  onClick={() => billFileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #10b981',
                    background: billForm.fileData ? '#f0fdf4' : '#f8fafc',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    marginBottom: '1.25rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <input
                    type="file"
                    ref={billFileInputRef}
                    onChange={handleBillFileChange}
                    accept="image/*,application/pdf"
                    style={{ display: 'none' }}
                  />

                  {billForm.fileData ? (
                    <div>
                      <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontWeight: 800, color: 'var(--gray-900)' }}>{billForm.fileName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '2px' }}>
                        {formatFileSize(billForm.fileSize)} • Click to choose a different file
                      </div>
                    </div>
                  ) : (
                    <div>
                      <UploadCloud size={40} color="#10b981" style={{ margin: '0 auto 8px' }} />
                      <div style={{ fontWeight: 800, color: 'var(--gray-900)', fontSize: '0.95rem' }}>
                        Click to browse or drag & drop ticket / bill image / PDF
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '4px' }}>
                        Supports JPG, PNG, WEBP, PDF (Up to 8 MB)
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block', fontSize: '0.875rem' }}>
                    Document / Bill Title *
                  </label>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="e.g. Flight Tickets to Goa, Resort Booking Voucher"
                    value={billForm.title}
                    onChange={(e) => setBillForm({ ...billForm, title: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block', fontSize: '0.875rem' }}>
                      Category
                    </label>
                    <select
                      className="input"
                      value={billForm.category}
                      onChange={(e) => setBillForm({ ...billForm, category: e.target.value })}
                    >
                      <option value="Travel & Tickets">Travel & Tickets</option>
                      <option value="Hotel & Accommodation">Hotel & Accommodation</option>
                      <option value="Food & Dining">Food & Dining</option>
                      <option value="Utilities & Bills">Utilities & Bills</option>
                      <option value="Shopping & Electronics">Shopping & Electronics</option>
                      <option value="Healthcare & Medical">Healthcare & Medical</option>
                      <option value="Entertainment & Passes">Entertainment & Passes</option>
                      <option value="General & Others">General & Others</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block', fontSize: '0.875rem' }}>
                      Amount (₹, optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input"
                      placeholder="0.00"
                      value={billForm.amount}
                      onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block', fontSize: '0.875rem' }}>
                    Date
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={billForm.date}
                    onChange={(e) => setBillForm({ ...billForm, date: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block', fontSize: '0.875rem' }}>
                    Notes (optional)
                  </label>
                  <textarea
                    rows={2}
                    className="input"
                    placeholder="e.g. Booking confirmation code, check-in instructions"
                    value={billForm.notes}
                    onChange={(e) => setBillForm({ ...billForm, notes: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowUploadBillModal(false)}
                    style={{ fontWeight: 700 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={uploadingBill}
                    style={{
                      fontWeight: 800,
                      padding: '0.75rem 1.6rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%) !important',
                      color: '#ffffff !important',
                      borderRadius: '999px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {uploadingBill ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Uploading...
                      </>
                    ) : (
                      <>
                        <UploadCloud size={16} /> Save to Group Vault
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Full Screen Preview Group Bill */}
        {previewGroupBill && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(8px)',
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
                maxWidth: '850px',
                background: 'white',
                borderRadius: '24px',
                padding: '2rem',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900 }}>{previewGroupBill.title}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '2px' }}>
                    {previewGroupBill.category} • Uploaded by {previewGroupBill.uploadedBy?.name || 'Member'} • {new Date(previewGroupBill.date).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}
                    {previewGroupBill.amount && ` • ₹${Number(previewGroupBill.amount).toLocaleString()}`}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => downloadGroupBill(previewGroupBill.fileData, previewGroupBill.fileName)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  >
                    <Download size={15} /> Download
                  </button>
                  <button
                    className="btn btn-tertiary"
                    onClick={() => setPreviewGroupBill(null)}
                    style={{ padding: '6px', borderRadius: '50%' }}
                  >
                    <X size={22} />
                  </button>
                </div>
              </div>

              {/* Preview Body */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  borderRadius: '16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1rem',
                  minHeight: '350px'
                }}
              >
                {previewGroupBill.fileType?.includes('pdf') || previewGroupBill.fileName?.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={previewGroupBill.fileData}
                    title={previewGroupBill.title}
                    style={{ width: '100%', height: '550px', border: 'none', borderRadius: '12px' }}
                  />
                ) : (
                  <img
                    src={previewGroupBill.fileData}
                    alt={previewGroupBill.title}
                    style={{ maxWidth: '100%', maxHeight: '550px', objectFit: 'contain', borderRadius: '12px' }}
                  />
                )}
              </div>

              {previewGroupBill.notes && (
                <div style={{ marginTop: '1rem', background: '#f1f5f9', padding: '10px 14px', borderRadius: '12px', fontSize: '0.85rem' }}>
                  <strong>Notes:</strong> {previewGroupBill.notes}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: Sync Spends to Personal Dashboard */}
        {showSyncModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.7)',
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
                background: '#ffffff',
                borderRadius: '26px',
                padding: '2rem',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                      color: '#15803d',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <RefreshCw size={22} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: 'var(--gray-900)' }}>
                      Sync Spends to Personal Dashboard
                    </h3>
                    <p className="text-muted" style={{ margin: '2px 0 0 0', fontSize: '0.85rem' }}>
                      Import expenses from <strong>{group.name}</strong> directly into your personal expense tracker.
                    </p>
                  </div>
                </div>

                <button
                  className="btn btn-tertiary"
                  onClick={() => setShowSyncModal(false)}
                  style={{ padding: '6px', borderRadius: '50%' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Mode Switcher */}
              <div
                style={{
                  background: 'var(--gray-100)',
                  padding: '4px',
                  borderRadius: '16px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '4px',
                  marginBottom: '1.25rem'
                }}
              >
                <button
                  type="button"
                  onClick={() => handleModeChange('my_share')}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '12px',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: syncMode === 'my_share' ? '#ffffff' : 'transparent',
                    color: syncMode === 'my_share' ? '#047857' : 'var(--gray-600)',
                    boxShadow: syncMode === 'my_share' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
                  }}
                >
                  My Consumed Shares
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('paid_by_me')}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '12px',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: syncMode === 'paid_by_me' ? '#ffffff' : 'transparent',
                    color: syncMode === 'paid_by_me' ? '#047857' : 'var(--gray-600)',
                    boxShadow: syncMode === 'paid_by_me' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
                  }}
                >
                  Bills Paid by Me
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('settled_by_me')}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '12px',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: syncMode === 'settled_by_me' ? '#ffffff' : 'transparent',
                    color: syncMode === 'settled_by_me' ? '#047857' : 'var(--gray-600)',
                    boxShadow: syncMode === 'settled_by_me' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
                  }}
                >
                  Settled by Me
                </button>
              </div>

              {/* Select All & Status Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', padding: '0 4px' }}>
                <button
                  type="button"
                  onClick={toggleSelectAllSync}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#059669',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {selectedSyncIds.length > 0 ? 'Deselect All' : 'Select All Eligible'}
                </button>

                <span style={{ fontSize: '0.825rem', color: 'var(--gray-500)', fontWeight: 700 }}>
                  {selectedSyncIds.length} selected
                </span>
              </div>

              {/* Expense Checklist Scroll Area */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  border: '1.5px solid var(--gray-200)',
                  borderRadius: '18px',
                  background: '#fafbfc',
                  padding: '8px',
                  maxHeight: '340px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                {fetchingSyncStatus ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                    <Loader2 size={32} className="animate-spin" style={{ color: '#10b981', margin: '0 auto 8px' }} />
                    <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>Checking sync status...</p>
                  </div>
                ) : (
                  (() => {
                    const filteredItems = syncExpensesList.filter(item => {
                      if (syncMode === 'my_share') {
                        return item.itemType === 'expense' && (item.myShareAmount || 0) > 0;
                      }
                      if (syncMode === 'paid_by_me') {
                        return item.itemType === 'expense' && item.isPayer;
                      }
                      if (syncMode === 'settled_by_me') {
                        return item.itemType === 'settlement' && item.isPayer;
                      }
                      return false;
                    });

                    if (filteredItems.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                          <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>
                            {syncMode === 'my_share'
                              ? 'No consumed split shares found for you in this group.'
                              : syncMode === 'paid_by_me'
                              ? 'No group expenses were paid by you in this group.'
                              : 'No settlement debt payments were made by you in this group.'}
                          </p>
                        </div>
                      );
                    }

                    return filteredItems.map((item) => {
                      const isSelected = selectedSyncIds.includes(item._id);
                      let amountToShow = 0;
                      let subtitleInfo = '';

                      if (syncMode === 'my_share') {
                        amountToShow = item.myShareAmount || 0;
                        subtitleInfo = `Total bill: ₹${(item.amount || 0).toLocaleString()} • Paid by ${item.paidBy?.name || 'Member'}`;
                      } else if (syncMode === 'paid_by_me') {
                        amountToShow = item.paidAmount || item.amount || 0;
                        subtitleInfo = `Full bill paid out-of-pocket by you`;
                      } else {
                        amountToShow = item.paidAmount || item.amount || 0;
                        subtitleInfo = `Settlement paid to ${item.toUser?.name || 'Member'} via ${item.paymentMethod || 'UPI'}`;
                      }

                      const isApplicable = amountToShow > 0;

                      return (
                        <div
                          key={item._id}
                          onClick={() => isApplicable && toggleSelectSyncItem(item._id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 14px',
                            borderRadius: '14px',
                            background: isSelected ? '#f0fdf4' : '#ffffff',
                            border: `1.5px solid ${isSelected ? '#86efac' : '#e2e8f0'}`,
                            cursor: isApplicable ? 'pointer' : 'default',
                            opacity: isApplicable ? 1 : 0.6,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!isApplicable}
                              onChange={() => {}}
                              style={{
                                width: '18px',
                                height: '18px',
                                accentColor: '#10b981',
                                cursor: isApplicable ? 'pointer' : 'default'
                              }}
                            />

                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 800, fontSize: '0.925rem', color: 'var(--gray-900)' }}>
                                  {item.description}
                                </span>
                                {item.isAlreadySynced && (
                                  <span
                                    style={{
                                      background: '#dcfce7',
                                      color: '#15803d',
                                      padding: '2px 8px',
                                      borderRadius: '999px',
                                      fontSize: '0.7rem',
                                      fontWeight: 800,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px'
                                    }}
                                  >
                                    <CheckCircle2 size={11} /> Already Synced
                                  </span>
                                )}
                              </div>

                              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'flex', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                                <span>{new Date(item.date || item.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                                <span>•</span>
                                <span style={{ fontWeight: 700, color: '#059669' }}>{item.category || 'General'}</span>
                                <span>•</span>
                                <span>{subtitleInfo}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right', marginLeft: '12px' }}>
                            <div style={{ fontWeight: 900, fontSize: '1rem', color: '#047857' }}>
                              ₹{amountToShow.toLocaleString()}
                            </div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>
                              {syncMode === 'my_share'
                                ? 'Your share'
                                : syncMode === 'paid_by_me'
                                ? 'Paid by you'
                                : 'Settled by you'}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()
                )}
              </div>

              {/* Bottom Summary Bar & Actions */}
              <div
                style={{
                  marginTop: '1.25rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--gray-200)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Total to import:</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--gray-900)' }}>
                    ₹{syncExpensesList
                      .filter(e => selectedSyncIds.includes(e._id))
                      .reduce((acc, curr) => {
                        let amt = 0;
                        if (syncMode === 'my_share') {
                          amt = curr.myShareAmount || 0;
                        } else {
                          amt = curr.paidAmount || curr.amount || 0;
                        }
                        return acc + amt;
                      }, 0)
                      .toLocaleString()}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowSyncModal(false)}
                    style={{ fontWeight: 700 }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={syncLoading || selectedSyncIds.length === 0}
                    onClick={handleExecuteSync}
                    style={{
                      fontWeight: 800,
                      padding: '0.75rem 1.6rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%) !important',
                      color: '#ffffff !important',
                      borderRadius: '999px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                    }}
                  >
                    {syncLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={16} /> Sync {selectedSyncIds.length} Items
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};
