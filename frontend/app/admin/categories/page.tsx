'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Plus, Edit3, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    imageUrl: '',
    parentId: '',
    displayOrder: '0',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/marketplace/admin/categories');
      setCategories((res?.data || res)?.categories || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: '', description: '', imageUrl: '', parentId: '', displayOrder: '0', isActive: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        imageUrl: form.imageUrl,
        parentId: form.parentId || null,
        displayOrder: Number(form.displayOrder || 0),
        isActive: form.isActive,
      };
      if (editingId) {
        await fetchApi(`/marketplace/admin/categories/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        showToast('success', 'Category updated');
      } else {
        await fetchApi('/marketplace/admin/categories', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('success', 'Category created');
      }
      resetForm();
      await loadCategories();
    } catch (err: any) {
      showToast('error', err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"?`)) return;
    try {
      await fetchApi(`/marketplace/admin/categories/${id}`, { method: 'DELETE' });
      showToast('success', `Deleted "${name}"`);
      await loadCategories();
    } catch (err: any) {
      showToast('error', err.message || 'Delete failed');
    }
  };

  const topCategories = categories.filter((c) => !c.parent_id);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {toast && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.text}
        </div>
      )}

      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
          <Layers className="w-6 h-6 text-[#FF5500]" />
          Dynamic Merchant Categories
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage marketplace categories, subcategories, images, and display order dynamically.
        </p>
      </div>

      {/* Create / Edit Category Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900">
          {editingId ? 'Edit Category' : 'Add Category or Subcategory'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Category Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Parent Category (optional)</label>
            <select
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs bg-white"
            >
              <option value="">Top-Level Category</option>
              {topCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Display Order</label>
            <input
              type="number"
              value={form.displayOrder}
              onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Image URL (optional)</label>
            <input
              type="text"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="w-4 h-4 accent-[#FF5500]"
            />
            Active in Public Marketplace
          </label>
          <div className="flex items-center gap-2">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-bold hover:bg-slate-800"
            >
              <Plus className="w-4 h-4" />
              {saving ? 'Saving...' : editingId ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </div>
      </form>

      {/* Categories Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm overflow-x-auto">
        {loading ? (
          <p className="text-xs text-slate-500 py-6 text-center">Loading categories...</p>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-bold text-slate-500 uppercase text-[11px]">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Merchants</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-900">{cat.name}</td>
                  <td className="px-4 py-3 text-slate-600">{cat.parent?.name || '—'}</td>
                  <td className="px-4 py-3">{cat.display_order}</td>
                  <td className="px-4 py-3">{cat._count?.merchants || 0}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        cat.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {cat.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(cat.id);
                        setForm({
                          name: cat.name,
                          description: cat.description || '',
                          imageUrl: cat.image_url || '',
                          parentId: cat.parent_id || '',
                          displayOrder: String(cat.display_order || 0),
                          isActive: Boolean(cat.is_active),
                        });
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-semibold mr-1.5"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat.id, cat.name)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-semibold"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

