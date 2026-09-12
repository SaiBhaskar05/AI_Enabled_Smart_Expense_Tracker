import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { importExportAPI, groupsAPI } from '../services/api';
import { Layout } from '../components/Layout';
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw, Users, ArrowRight } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export const ImportExport = () => {
  const navigate = useNavigate();
  const [csvData, setCsvData] = useState('');
  const [previewResult, setPreviewResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  useEffect(() => {
    fetchUserGroups();
  }, []);

  const fetchUserGroups = async () => {
    setLoadingGroups(true);
    try {
      const res = await groupsAPI.getAll();
      setGroups(res.data?.data?.groups || []);
    } catch (err) {
      console.error('Failed to load groups in Import/Export:', err);
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvData(event.target.result);
    };
    reader.readAsText(file);
  };

  const handlePreview = async () => {
    if (!csvData.trim()) {
      toast.error('Please paste CSV text or select a file first.');
      return;
    }
    setLoading(true);
    try {
      const res = await importExportAPI.preview(csvData);
      setPreviewResult(res.data?.data || null);
    } catch (error) {
      console.error('Preview error:', error);
      toast.error(error.response?.data?.message || 'Failed to parse CSV data');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewResult || !previewResult.validRows || previewResult.validRows.length === 0) {
      toast.error('No valid rows available to import.');
      return;
    }
    setImporting(true);
    try {
      const res = await importExportAPI.import(previewResult.validRows);
      toast.success(res.data?.message || 'Expenses imported successfully!');
      setPreviewResult(null);
      setCsvData('');
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error.response?.data?.message || 'Failed to import expenses');
    } finally {
      setImporting(false);
    }
  };

  const handleDownload = async (filter = {}) => {
    try {
      const res = await importExportAPI.export(filter);
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `expenses_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV ledger exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      // Fallback to direct window open with query token
      try {
        const url = importExportAPI.exportUrl(filter);
        window.open(url, '_blank');
      } catch (fallbackErr) {
        toast.error('Failed to trigger CSV download.');
      }
    }
  };

  const sampleCSV = `date,description,amount,category,paymentMethod,notes
2026-09-01,Grocery Shopping,1450,Food,UPI,Weekly veggies
2026-09-02,Fuel refill,800,Travel,Credit Card,Petrol station`;

  return (
    <Layout>
      <Toaster position="top-right" />
      <div className="page-container" style={{ padding: 'var(--spacing-lg)' }}>
        <div className="mb-lg">
          <h1>Import / Export & Sync</h1>
          <p className="text-muted">Batch import transactions from CSV, sync group spends into personal expenses, or export your ledger</p>
        </div>

        {/* 1. Group Spends Sync Banner */}
        {groups.length > 0 && (
          <div
            className="card"
            style={{
              marginBottom: '2rem',
              padding: '1.75rem',
              borderRadius: '22px',
              background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
              border: '1.5px solid rgba(16, 185, 129, 0.3)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RefreshCw size={22} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--gray-900)' }}>
                    Sync Group Spends to Personal Dashboard
                  </h3>
                  <p className="text-muted" style={{ margin: '2px 0 0 0', fontSize: '0.85rem' }}>
                    Select any group to import your consumed split shares directly into your Personal Expenses.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
              {groups.map((grp) => (
                <div
                  key={grp._id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--gray-900)' }}>{grp.name}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: '#e0f2fe', color: '#0369a1' }}>
                        {grp.type || 'Trip'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                      {grp.members?.length || 0} members • Total spent: ₹{(grp.totalSpent || 0).toLocaleString()}
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/groups/${grp._id}`)}
                    className="btn btn-secondary btn-sm"
                    style={{
                      fontWeight: 750,
                      borderRadius: '999px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      border: '1.5px solid #a7f3d0',
                      color: '#047857'
                    }}
                  >
                    Open Group & Sync Spends <ArrowRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 'var(--spacing-lg)' }}>
          {/* Import Section */}
          <div className="card">
            <h3><Upload size={20} style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />Import CSV</h3>
            <p className="text-sm text-muted mt-xs mb-md">
              Upload a .csv file or paste CSV text matching headers: <code>date, description, amount, category, paymentMethod, notes</code>.
            </p>
            <div style={{ marginTop: 'var(--spacing-md)' }}>
              <textarea
                className="textarea"
                placeholder={`Paste CSV content here...\n\nExample:\n${sampleCSV}`}
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                rows={8}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem' }}
              />
              <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)', flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="btn btn-primary" onClick={handlePreview} disabled={loading}>
                  {loading ? 'Processing...' : 'Preview Import'}
                </button>
                <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                  <FileSpreadsheet size={18} /> Select File
                  <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
          </div>

          {/* Export Section */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3><Download size={20} style={{ display: 'inline-block', marginRight: '0.5rem', verticalAlign: 'middle' }} />Export CSV</h3>
              <p className="text-muted mt-md">
                Export your transaction ledger into standard CSV format suitable for Excel, Google Sheets, or tax calculation tools.
              </p>
            </div>
            <div style={{ marginTop: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <button className="btn btn-primary" onClick={() => handleDownload()}>
                <Download size={18} /> Export All Expenses
              </button>
              <button className="btn btn-secondary" onClick={() => {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                handleDownload({ startDate: start });
              }}>
                Export This Month Only
              </button>
            </div>
          </div>
        </div>

        {/* Preview Results Table */}
        {previewResult && (
          <div className="card" style={{ marginTop: 'var(--spacing-xl)' }}>
            <div className="flex-between mb-md">
              <h3>Import Preview</h3>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span className="badge badge-primary">{previewResult.valid} Valid Rows</span>
                {previewResult.invalid > 0 && (
                  <span className="badge badge-danger">{previewResult.invalid} Invalid Rows</span>
                )}
              </div>
            </div>

            {previewResult.validRows.length > 0 && (
              <div style={{ overflowX: 'auto', marginTop: 'var(--spacing-md)' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Row #</th>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Payment Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewResult.validRows.map((row, i) => (
                      <tr key={i}>
                        <td>{row.rowNum}</td>
                        <td>{new Date(row.date).toLocaleDateString()}</td>
                        <td style={{ fontWeight: 500 }}>{row.description}</td>
                        <td><span className="badge badge-primary">{row.category}</span></td>
                        <td style={{ fontWeight: 600 }}>₹{row.amount}</td>
                        <td>{row.paymentMethod}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {previewResult.invalidRows.length > 0 && (
              <div style={{ marginTop: 'var(--spacing-md)' }}>
                <h4 style={{ color: 'var(--danger)' }}>Rows with Errors:</h4>
                <ul style={{ paddingLeft: '20px', color: 'var(--danger)', fontSize: '0.85rem' }}>
                  {previewResult.invalidRows.map((r, i) => (
                    <li key={i}>Row {r.rowNum} ({r.description || 'No desc'}): {r.errors.join(', ')}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ marginTop: 'var(--spacing-lg)', display: 'flex', gap: 'var(--spacing-md)' }}>
              <button
                className="btn btn-primary"
                onClick={handleConfirmImport}
                disabled={importing || previewResult.validRows.length === 0}
              >
                {importing ? 'Importing...' : `Confirm & Import ${previewResult.validRows.length} Expenses`}
              </button>
              <button className="btn btn-secondary" onClick={() => setPreviewResult(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

