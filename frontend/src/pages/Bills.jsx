import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../components/Layout';
import { billsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Receipt, Plus, Search, Filter, Trash2, Eye, Download, FileText,
  Calendar, DollarSign, Tag, UploadCloud, X, CheckCircle2, AlertCircle,
  FileSpreadsheet, Shield, ArrowUpRight, Sparkles, Loader2
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import '../styles/claymorphism.css';

const CATEGORIES = [
  'All',
  'Utilities & Bills',
  'Travel & Tickets',
  'Hotel & Accommodation',
  'Food & Dining',
  'Shopping & Electronics',
  'Healthcare & Medical',
  'Vehicle & Fuel',
  'Entertainment & Passes',
  'General & Others'
];

export const Bills = () => {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewBill, setPreviewBill] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'Utilities & Bills',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    fileData: null,
    fileName: '',
    fileType: '',
    fileSize: 0
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    loadBills();
  }, [selectedCategory, searchQuery]);

  const loadBills = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await billsAPI.getPersonal(params);
      setBills(res.data?.data?.bills || []);
    } catch (err) {
      console.error('Failed to load bills:', err);
      toast.error('Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size < 8MB
    if (file.size > 8 * 1024 * 1024) {
      toast.error('File size exceeds 8MB limit');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({
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

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fileData) {
      toast.error('Please attach a bill image or PDF file');
      return;
    }
    if (!formData.title.trim()) {
      toast.error('Please provide a title for the bill');
      return;
    }

    setUploading(true);
    try {
      await billsAPI.upload({
        title: formData.title.trim(),
        category: formData.category,
        amount: formData.amount ? Number(formData.amount) : null,
        date: formData.date || new Date(),
        fileData: formData.fileData,
        fileName: formData.fileName,
        fileType: formData.fileType,
        fileSize: formData.fileSize,
        notes: formData.notes
      });

      toast.success('Bill stored in your vault!');
      setShowUploadModal(false);
      setFormData({
        title: '',
        category: 'Utilities & Bills',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        fileData: null,
        fileName: '',
        fileType: '',
        fileSize: 0
      });
      await loadBills();
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(err.response?.data?.message || 'Failed to upload bill');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteBill = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await billsAPI.delete(id);
      toast.success('Bill removed from vault');
      setBills(prev => prev.filter(b => b._id !== id));
      if (previewBill?._id === id) setPreviewBill(null);
    } catch (err) {
      toast.error('Failed to delete bill');
    }
  };

  const downloadFile = (fileData, fileName) => {
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

  // Summary Metrics
  const totalAmount = bills.reduce((sum, b) => sum + (b.amount || 0), 0);

  return (
    <Layout>
      <Toaster position="top-right" />
      <div className="page-container" style={{ padding: '2rem 1.5rem', maxWidth: '1240px', margin: '0 auto' }}>

        {/* 1. Header Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 60%, #f5f3ff 100%)',
            padding: '2.25rem',
            borderRadius: '26px',
            boxShadow: '0 10px 36px rgba(99, 102, 241, 0.1)',
            border: '1.5px solid rgba(99, 102, 241, 0.2)',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.4rem' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white',
                  padding: '10px',
                  borderRadius: '16px',
                  display: 'inline-flex',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
                }}
              >
                <Receipt size={28} />
              </div>
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: 0, color: 'var(--gray-900)' }}>
                  Important Bills & Receipts Vault
                </h1>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>
                  Securely store utility bills, travel tickets, invoices, and warranties.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowUploadModal(true)}
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0.85rem 1.6rem',
              fontSize: '1rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important',
              color: '#ffffff !important',
              borderRadius: '999px',
              boxShadow: '0 6px 20px rgba(99, 102, 241, 0.35)',
              cursor: 'pointer'
            }}
          >
            <Plus size={20} strokeWidth={2.5} color="#ffffff" /> Upload New Bill
          </button>
        </div>

        {/* 2. Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          <div className="card" style={{ padding: '1.5rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4338ca' }}>
              <Receipt size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--gray-900)' }}>{bills.length}</div>
              <div className="text-muted" style={{ fontSize: '0.85rem' }}>Total Stored Bills</div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#16a34a' }}>₹{totalAmount.toLocaleString()}</div>
              <div className="text-muted" style={{ fontSize: '0.85rem' }}>Total Amount Recorded</div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309' }}>
              <Shield size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--gray-900)' }}>Encrypted</div>
              <div className="text-muted" style={{ fontSize: '0.85rem' }}>Private Vault</div>
            </div>
          </div>
        </div>

        {/* 3. Search and Category Filters */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '24px', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input
                type="text"
                placeholder="Search bills by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input"
                style={{ paddingLeft: '40px', width: '100%' }}
              />
            </div>
          </div>

          {/* Category Pill Filters */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  border: `1.5px solid ${selectedCategory === cat ? '#6366f1' : '#e2e8f0'}`,
                  background: selectedCategory === cat ? '#6366f1' : '#ffffff',
                  color: selectedCategory === cat ? '#ffffff' : 'var(--gray-700)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Bills Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Loader2 size={36} className="animate-spin" color="#6366f1" style={{ margin: '0 auto 1rem' }} />
            <p className="text-muted">Loading your vault bills...</p>
          </div>
        ) : bills.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1.5rem', background: '#f8fafc', borderRadius: '24px', border: '2px dashed #cbd5e1' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#4f46e5' }}>
              <Receipt size={32} />
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 900 }}>No bills uploaded yet</h3>
            <p className="text-muted" style={{ margin: '0 0 1.5rem 0', maxWidth: '400px', marginInline: 'auto', fontSize: '0.9rem' }}>
              Save your important electricity bills, flight tickets, grocery receipts, or warranty cards here for instant access.
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn btn-primary btn-sm"
              style={{ borderRadius: '999px', fontWeight: 800, padding: '0.65rem 1.4rem' }}
            >
              + Upload First Bill
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {bills.map((bill) => {
              const isPdf = bill.fileType?.includes('pdf') || bill.fileName?.toLowerCase().endsWith('.pdf');
              return (
                <div
                  key={bill._id}
                  className="clay-card-interactive"
                  style={{
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    position: 'relative'
                  }}
                >
                  {/* Thumbnail / Header */}
                  <div>
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
                      onClick={() => setPreviewBill(bill)}
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: '#e0e7ff',
                          color: '#4338ca'
                        }}
                      >
                        {bill.category}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                        {new Date(bill.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
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
                      onClick={() => setPreviewBill(bill)}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 700 }}
                    >
                      <Eye size={14} /> View
                    </button>
                    <button
                      onClick={() => downloadFile(bill.fileData, bill.fileName)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '6px 10px' }}
                      title="Download file"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteBill(bill._id, bill.title)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '6px 10px', color: '#dc2626', borderColor: '#fecdd3' }}
                      title="Delete bill"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 5. UPLOAD BILL MODAL */}
        {showUploadModal && (
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
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                    <Receipt size={22} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900 }}>
                    Upload Important Bill
                  </h3>
                </div>
                <button
                  className="btn btn-tertiary"
                  onClick={() => setShowUploadModal(false)}
                  style={{ padding: '6px', borderRadius: '50%' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit}>
                {/* File Drop Area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #818cf8',
                    background: formData.fileData ? '#f5f3ff' : '#f8fafc',
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
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,application/pdf"
                    style={{ display: 'none' }}
                  />

                  {formData.fileData ? (
                    <div>
                      <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontWeight: 800, color: 'var(--gray-900)' }}>{formData.fileName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '2px' }}>
                        {formatFileSize(formData.fileSize)} • Click to choose a different file
                      </div>
                    </div>
                  ) : (
                    <div>
                      <UploadCloud size={40} color="#6366f1" style={{ margin: '0 auto 8px' }} />
                      <div style={{ fontWeight: 800, color: 'var(--gray-900)', fontSize: '0.95rem' }}>
                        Click to browse or drag & drop bill image / PDF
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '4px' }}>
                        Supports JPG, PNG, WEBP, PDF (Up to 8 MB)
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block', fontSize: '0.875rem' }}>
                    Bill / Document Title *
                  </label>
                  <input
                    type="text"
                    required
                    className="input"
                    placeholder="e.g. Flight Tickets to Goa, Electricity Bill Aug"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block', fontSize: '0.875rem' }}>
                      Category
                    </label>
                    <select
                      className="input"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {CATEGORIES.filter(c => c !== 'All').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
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
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontWeight: 800, marginBottom: '0.4rem', display: 'block', fontSize: '0.875rem' }}>
                    Notes / Description (optional)
                  </label>
                  <textarea
                    rows={2}
                    className="input"
                    placeholder="e.g. Booking ref #AB1234, Warranty expires Dec 2026"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowUploadModal(false)}
                    style={{ fontWeight: 700 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={uploading}
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
                    {uploading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Storing...
                      </>
                    ) : (
                      <>
                        <UploadCloud size={16} /> Save to Vault
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 6. FULL SCREEN PREVIEW MODAL */}
        {previewBill && (
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
                  <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900 }}>{previewBill.title}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '2px' }}>
                    {previewBill.category} • {new Date(previewBill.date).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}
                    {previewBill.amount && ` • ₹${Number(previewBill.amount).toLocaleString()}`}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => downloadFile(previewBill.fileData, previewBill.fileName)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  >
                    <Download size={15} /> Download
                  </button>
                  <button
                    className="btn btn-tertiary"
                    onClick={() => setPreviewBill(null)}
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
                {previewBill.fileType?.includes('pdf') || previewBill.fileName?.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={previewBill.fileData}
                    title={previewBill.title}
                    style={{ width: '100%', height: '550px', border: 'none', borderRadius: '12px' }}
                  />
                ) : (
                  <img
                    src={previewBill.fileData}
                    alt={previewBill.title}
                    style={{ maxWidth: '100%', maxHeight: '550px', objectFit: 'contain', borderRadius: '12px' }}
                  />
                )}
              </div>

              {previewBill.notes && (
                <div style={{ marginTop: '1rem', background: '#f1f5f9', padding: '10px 14px', borderRadius: '12px', fontSize: '0.85rem' }}>
                  <strong>Notes:</strong> {previewBill.notes}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};
