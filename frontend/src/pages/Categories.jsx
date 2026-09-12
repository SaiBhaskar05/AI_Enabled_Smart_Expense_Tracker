import React, { useState, useEffect } from 'react';
import { categoriesAPI } from '../services/api';
import { Layout } from '../components/Layout';
import { Plus, Edit2, Trash2, Tag, Layers, CheckCircle, XCircle, X } from 'lucide-react';

export const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    color: '#7c5cfc'
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await categoriesAPI.getAll();
      setCategories(res.data?.data?.categories || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', color: '#7c5cfc' });
    setShowModal(true);
  };

  const handleOpenEditModal = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      color: cat.color || '#7c5cfc'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await categoriesAPI.update(editingCategory._id, formData);
      } else {
        await categoriesAPI.create(formData);
      }
      setShowModal(false);
      loadCategories();
    } catch (error) {
      console.error('Failed to save category:', error);
      alert(error.response?.data?.message || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (cat) => {
    if (cat.isDefault) {
      alert('System default categories cannot be deleted.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${cat.name}"?`)) return;
    try {
      await categoriesAPI.delete(cat._id);
      loadCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert(error.response?.data?.message || 'Failed to delete category');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
          <p className="text-muted">Loading categories...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-container" style={{ padding: 'var(--spacing-lg)' }}>
        <div className="flex-between mb-lg">
          <div>
            <h1>Categories</h1>
            <p className="text-muted">Organize and classify your spending habits</p>
          </div>
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={20} />
            Add Category
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-state-icon">
              <Tag size={48} color="#7c5cfc" />
            </div>
            <h3>No categories found</h3>
            <p>Create categories to organize your expenses.</p>
            <button className="btn btn-primary" onClick={handleOpenAddModal}>
              <Plus size={18} /> Add Category
            </button>
          </div>
        ) : (
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Theme Color</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '10px',
                          background: `${cat.color || '#7c5cfc'}18`,
                          border: `1px solid ${cat.color || '#7c5cfc'}40`
                        }}>
                          <Tag size={18} color={cat.color || '#7c5cfc'} />
                        </div>
                        <span style={{ fontWeight: 600 }}>{cat.name}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: cat.color || '#7c5cfc',
                          display: 'inline-block',
                          boxShadow: `0 2px 6px ${cat.color || '#7c5cfc'}60`
                        }} />
                        <code style={{ fontSize: '0.85rem' }}>{cat.color || '#7c5cfc'}</code>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${cat.isDefault ? 'badge-secondary' : 'badge-primary'}`}>
                        {cat.isDefault ? 'System Default' : 'Custom'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleOpenEditModal(cat)}
                        >
                          <Edit2 size={16} /> Edit
                        </button>
                        {!cat.isDefault && (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteCategory(cat)}
                          >
                            <Trash2 size={16} /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add / Edit Category Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
                <button className="btn btn-tertiary" onClick={() => setShowModal(false)} aria-label="Close modal">
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>Category Name</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Subscriptions"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Color Theme</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        style={{ border: 'none', background: 'none', width: '44px', height: '44px', cursor: 'pointer' }}
                      />
                      <input
                        type="text"
                        className="input"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        style={{ width: '140px' }}
                      />
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {editingCategory ? 'Save Changes' : 'Create Category'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};


