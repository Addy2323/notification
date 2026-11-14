'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Package,
  Plus,
  Search,
  Edit3,
  Trash2,
  Lock,
  Star,
  Store,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LayoutGrid,
  List,
  ArrowRight,
  X,
} from 'lucide-react';
import { fetchApi, API_BASE } from '@/lib/api';

const ASSET_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

function resolveAssetUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${ASSET_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

function getClientAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('lumo_token') ||
    localStorage.getItem('auth_token') ||
    null
  );
}

function formatTzs(amount?: number | null, currency = 'TZS'): string {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return `${currency} 0`;
  return `${currency} ${Number(amount).toLocaleString('en-US')}`;
}

interface ProductVariantForm {
  id: string;
  name: string;
  type: string;
  value: string;
  price?: string;
  stockQuantity?: string;
  sku?: string;
}

export default function MerchantProductsCrudPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    sku: '',
    description: '',
    category: '',
    brand: '',
    currency: 'TZS',
    unitPrice: '',
    costPrice: '',
    promotionalPrice: '',
    promotionStartAt: '',
    promotionEndAt: '',
    availableQuantity: '10',
    trackInventory: true,
    stockStatus: 'IN_STOCK' as 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK',
    lowStockThreshold: '5',
    publicationStatus: 'PUBLISHED' as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
    isFeatured: false,
    primaryImageUrl: '',
    images: [] as string[],
    variants: [] as ProductVariantForm[],
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        fetchApi('/store/my/products'),
        fetchApi('/store/my/categories').catch(() => ({ categories: [] })),
      ]);
      setProducts(prodRes?.products || prodRes?.data?.products || []);
      setCategories(catRes?.categories || catRes?.data?.categories || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleImageUpload = async (file: File): Promise<string | null> => {
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const token = getClientAuthToken();
      const res = await fetch(`${API_BASE}/store/my/upload-image`, {
        method: 'POST',
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || 'Image upload failed');
      }
      showToast('success', 'Product image uploaded');
      return json.data.url as string;
    } catch (err: any) {
      showToast('error', err.message || 'Could not upload image');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      name: '',
      sku: '',
      description: '',
      category: categories[0]?.name || '',
      brand: '',
      currency: 'TZS',
      unitPrice: '',
      costPrice: '',
      promotionalPrice: '',
      promotionStartAt: '',
      promotionEndAt: '',
      availableQuantity: '10',
      trackInventory: true,
      stockStatus: 'IN_STOCK',
      lowStockThreshold: '5',
      publicationStatus: 'PUBLISHED',
      isFeatured: false,
      primaryImageUrl: '',
      images: [],
      variants: [],
    });
    setModalOpen(true);
  };

  const openEditModal = (prod: any) => {
    setEditingId(prod.id);
    setForm({
      name: prod.name || '',
      sku: prod.sku || '',
      description: prod.description || '',
      category: prod.category || '',
      brand: prod.brand || '',
      currency: prod.currency || 'TZS',
      unitPrice: prod.unitPrice !== undefined && prod.unitPrice !== null ? String(prod.unitPrice) : '',
      costPrice: prod.costPrice !== undefined && prod.costPrice !== null ? String(prod.costPrice) : '',
      promotionalPrice:
        prod.promotionalPrice !== undefined && prod.promotionalPrice !== null ? String(prod.promotionalPrice) : '',
      promotionStartAt: prod.promotionStartAt ? String(prod.promotionStartAt).slice(0, 16) : '',
      promotionEndAt: prod.promotionEndAt ? String(prod.promotionEndAt).slice(0, 16) : '',
      availableQuantity: String(prod.availableQuantityRaw ?? prod.availableQuantity ?? 0),
      trackInventory: Boolean(prod.trackInventory),
      stockStatus: prod.stockStatus || 'IN_STOCK',
      lowStockThreshold: String(prod.lowStockThreshold ?? 5),
      publicationStatus: prod.publicationStatus || 'DRAFT',
      isFeatured: Boolean(prod.isFeatured),
      primaryImageUrl: prod.primaryImageUrl || '',
      images: Array.isArray(prod.images) ? prod.images : [],
      variants: Array.isArray(prod.variants)
        ? prod.variants.map((v: any) => ({
            id: v.id,
            name: v.name || '',
            type: v.type || 'Option',
            value: v.value || v.name || '',
            price: v.price !== null && v.price !== undefined ? String(v.price) : '',
            stockQuantity: v.stockQuantity !== null && v.stockQuantity !== undefined ? String(v.stockQuantity) : '',
            sku: v.sku || '',
          }))
        : [],
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        description: form.description.trim() || null,
        category: form.category.trim() || null,
        brand: form.brand.trim() || null,
        currency: form.currency || 'TZS',
        unitPrice: Number(form.unitPrice || 0),
        costPrice: form.costPrice ? Number(form.costPrice) : null,
        promotionalPrice: form.promotionalPrice ? Number(form.promotionalPrice) : null,
        promotionStartAt: form.promotionStartAt || null,
        promotionEndAt: form.promotionEndAt || null,
        availableQuantity: Number(form.availableQuantity || 0),
        trackInventory: form.trackInventory,
        stockStatus: form.stockStatus,
        lowStockThreshold: Number(form.lowStockThreshold || 5),
        publicationStatus: form.publicationStatus,
        isFeatured: form.isFeatured,
        primaryImageUrl: form.primaryImageUrl || form.images[0] || null,
        images: form.images,
        variants: form.variants
          .filter((v) => v.name.trim())
          .map((v) => ({
            id: v.id,
            name: v.name.trim(),
            type: v.type.trim() || 'Option',
            value: (v.value || v.name).trim(),
            price: v.price ? Number(v.price) : null,
            stockQuantity: v.stockQuantity ? Number(v.stockQuantity) : null,
            sku: v.sku?.trim() || null,
          })),
      };

      if (editingId) {
        await fetchApi(`/store/my/products/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        showToast('success', 'Product updated successfully');
      } else {
        await fetchApi('/store/my/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('success', 'Product created successfully');
      }

      setModalOpen(false);
      await loadProducts();
    } catch (err: any) {
      showToast('error', err.message || 'Unable to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatus = async (productId: string, publicationStatus: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED') => {
    try {
      await fetchApi(`/store/my/products/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify({ publicationStatus }),
      });
      showToast('success', `Product status updated to ${publicationStatus}`);
      await loadProducts();
    } catch (err: any) {
      showToast('error', err.message || 'Unable to update product');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetchApi(`/store/my/products/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      showToast('success', `"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      await loadProducts();
    } catch (err: any) {
      showToast('error', err.message || 'Could not delete product');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = products.filter((p) => {
    if (statusFilter !== 'ALL' && p.publicationStatus !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && (p.category || 'General') !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        String(p.name || '').toLowerCase().includes(q) ||
        String(p.sku || '').toLowerCase().includes(q) ||
        String(p.category || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const publishedCount = products.filter((p) => p.publicationStatus === 'PUBLISHED').length;
  const draftCount = products.filter((p) => p.publicationStatus === 'DRAFT').length;
  const outOfStockCount = products.filter((p) => p.stockStatus === 'OUT_OF_STOCK').length;

  return (
    <div className="space-y-5 pb-12">
      {toast && (
        <div
          className={`fixed bottom-20 md:bottom-5 right-4 left-4 sm:left-auto z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-700'
              : 'bg-rose-950 text-rose-100 border-rose-700'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-[#FF5500]" />
            Products Catalogue
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, view, edit, publish, and delete products across your SmartTrack Store & orders.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2">
          <Link
            href="/dashboard/store"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
          >
            <Store className="w-4 h-4 text-[#0F172A]" />
            <span>My Store</span>
            <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
          </Link>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FF5500] text-white text-xs font-bold hover:bg-orange-600 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Products', value: products.length, tone: 'text-slate-900' },
          { label: 'Published', value: publishedCount, tone: 'text-emerald-700' },
          { label: 'Drafts', value: draftCount, tone: 'text-amber-700' },
          { label: 'Out of Stock', value: outOfStockCount, tone: 'text-rose-700' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-xs">
            <p className="text-[11px] font-medium text-slate-500">{kpi.label}</p>
            <p className={`text-xl sm:text-2xl font-bold mt-1 ${kpi.tone}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by name, SKU, or category..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:border-[#FF5500]"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
            >
              <option value="ALL">All Categories</option>
              {Array.from(new Set([...categories.map((c) => c.name), ...products.map((p) => p.category || 'General')])).map(
                (cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                )
              )}
            </select>
            <div className="inline-flex rounded-xl border border-slate-300 p-0.5 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-white shadow-xs text-[#0F172A]' : 'text-slate-400'}`}
                aria-label="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg ${viewMode === 'table' ? 'bg-white shadow-xs text-[#0F172A]' : 'text-slate-400'}`}
                aria-label="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Status pills (mobile-scrollable) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['ALL', 'PUBLISHED', 'DRAFT', 'ARCHIVED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-[#0F172A] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? `All (${products.length})` : st}
            </button>
          ))}
        </div>
      </div>

      {/* Product Listing */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-[#FF5500]" />
          Loading products...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
          <Package className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-800">No products found</p>
          <p className="text-xs text-slate-500">Add your first product to list it in your store and inventory.</p>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF5500] text-white text-xs font-bold hover:bg-orange-600"
          >
            <Plus className="w-4 h-4" />
            Create Product
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/70">
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-3">Price</th>
                <th className="py-3 px-3">Stock</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((prod) => (
                <tr key={prod.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {prod.primaryImageUrl ? (
                        <img
                          src={resolveAssetUrl(prod.primaryImageUrl)}
                          alt={prod.name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{prod.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {prod.category || 'General'} {prod.sku ? `• ${prod.sku}` : ''}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900">{formatTzs(prod.effectivePrice, prod.currency)}</span>
                    {prod.costPrice !== null && (
                      <p className="text-[10px] text-slate-500">Cost: {formatTzs(prod.costPrice, prod.currency)}</p>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        prod.stockStatus === 'OUT_OF_STOCK'
                          ? 'bg-rose-100 text-rose-700'
                          : prod.stockStatus === 'LOW_STOCK'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {prod.stockStatus}
                      {prod.trackInventory && prod.availableQuantity !== null ? ` (${prod.availableQuantity})` : ''}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <select
                      value={prod.publicationStatus}
                      onChange={(e) =>
                        handleQuickStatus(prod.id, e.target.value as 'PUBLISHED' | 'DRAFT' | 'ARCHIVED')
                      }
                      className="px-2 py-1 rounded-lg border border-slate-200 text-xs bg-white font-semibold"
                    >
                      <option value="PUBLISHED">PUBLISHED</option>
                      <option value="DRAFT">DRAFT</option>
                      <option value="ARCHIVED">ARCHIVED</option>
                    </select>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(prod)}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800"
                        title="Edit product"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(prod)}
                        className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700"
                        title="Delete product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((prod) => (
            <div key={prod.id} className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-xs flex flex-col">
              <div className="h-44 bg-slate-100 relative">
                {prod.primaryImageUrl ? (
                  <img
                    src={resolveAssetUrl(prod.primaryImageUrl)}
                    alt={prod.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Package className="w-10 h-10" />
                  </div>
                )}
                <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      prod.publicationStatus === 'PUBLISHED'
                        ? 'bg-emerald-600 text-white'
                        : prod.publicationStatus === 'ARCHIVED'
                        ? 'bg-slate-700 text-white'
                        : 'bg-amber-400 text-slate-950'
                    }`}
                  >
                    {prod.publicationStatus}
                  </span>
                  {prod.isFeatured && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FF5500] text-white inline-flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Featured
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{prod.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                        prod.stockStatus === 'OUT_OF_STOCK'
                          ? 'bg-rose-100 text-rose-700'
                          : prod.stockStatus === 'LOW_STOCK'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {prod.stockStatus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {prod.category || 'General'} {prod.sku ? `• SKU: ${prod.sku}` : ''}
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-base font-bold text-[#0F172A]">
                      {formatTzs(prod.effectivePrice, prod.currency)}
                    </span>
                    {prod.isPromotionActive && (
                      <span className="text-xs text-slate-400 line-through">
                        {formatTzs(prod.unitPrice, prod.currency)}
                      </span>
                    )}
                  </div>
                  {prod.costPrice !== null && (
                    <p className="text-[11px] text-slate-500 mt-1 inline-flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" />
                      Private Cost: {formatTzs(prod.costPrice, prod.currency)}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditModal(prod)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(prod)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                  <select
                    value={prod.publicationStatus}
                    onChange={(e) =>
                      handleQuickStatus(prod.id, e.target.value as 'PUBLISHED' | 'DRAFT' | 'ARCHIVED')
                    }
                    className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-medium bg-white"
                  >
                    <option value="PUBLISHED">Publish</option>
                    <option value="DRAFT">Draft</option>
                    <option value="ARCHIVED">Archive</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL (Mobile-friendly bottom sheet -> desktop modal) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
            <div className="sticky top-0 bg-white px-5 py-4 border-b border-slate-200 flex items-center justify-between z-10">
              <h2 className="text-base font-bold text-slate-900">
                {editingId ? 'Edit Product' : 'Create New Product'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    list="products-page-categories"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. Footwear, Electronics"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                  <datalist id="products-page-categories">
                    {categories.map((cat: any) => (
                      <option key={cat.id} value={cat.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SKU (Optional)</label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Selling Price (TZS) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.unitPrice}
                    onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Promotional Price (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.promotionalPrice}
                    onChange={(e) => setForm({ ...form, promotionalPrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 inline-flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-500" />
                    Private Cost Price (Merchant Only)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.costPrice}
                    onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Publication Status</label>
                  <select
                    value={form.publicationStatus}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        publicationStatus: e.target.value as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Available Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={form.availableQuantity}
                    onChange={(e) => setForm({ ...form, availableQuantity: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stock Status</label>
                  <select
                    value={form.stockStatus}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        stockStatus: e.target.value as 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK',
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="IN_STOCK">IN STOCK</option>
                    <option value="LOW_STOCK">LOW STOCK</option>
                    <option value="OUT_OF_STOCK">OUT OF STOCK</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.trackInventory}
                    onChange={(e) => setForm({ ...form, trackInventory: e.target.checked })}
                    className="accent-[#FF5500]"
                  />
                  Track stock automatically
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                    className="accent-[#FF5500]"
                  />
                  Featured product
                </label>
              </div>

              {/* Photo uploader */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Product Images</span>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F172A] text-white text-xs font-semibold cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingImage ? 'Uploading...' : 'Upload Photo'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        for (const f of files) {
                          const url = await handleImageUpload(f);
                          if (url) {
                            setForm((prev) => ({
                              ...prev,
                              primaryImageUrl: prev.primaryImageUrl || url,
                              images: Array.from(new Set([...prev.images, url])),
                            }));
                          }
                        }
                      }}
                    />
                  </label>
                </div>
                {form.images.length > 0 && (
                  <div className="flex flex-wrap gap-2.5">
                    {form.images.map((imgUrl) => {
                      const isPrimary = form.primaryImageUrl === imgUrl;
                      return (
                        <div key={imgUrl} className="w-20 rounded-xl overflow-hidden border border-slate-300 bg-white">
                          <img src={resolveAssetUrl(imgUrl)} alt="" className="w-20 h-16 object-cover" />
                          <div className="p-1 flex items-center justify-between text-[10px]">
                            <button
                              type="button"
                              onClick={() => setForm((p) => ({ ...p, primaryImageUrl: imgUrl }))}
                              className={`font-bold ${isPrimary ? 'text-[#FF5500]' : 'text-slate-600'}`}
                            >
                              {isPrimary ? 'Main' : 'Set'}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setForm((p) => {
                                  const next = p.images.filter((u) => u !== imgUrl);
                                  return {
                                    ...p,
                                    images: next,
                                    primaryImageUrl: p.primaryImageUrl === imgUrl ? next[0] || '' : p.primaryImageUrl,
                                  };
                                })
                              }
                              className="text-rose-600 font-bold"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-white pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-[#FF5500] text-white text-xs font-bold hover:bg-orange-600 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Product?</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Are you sure you want to delete <span className="font-bold text-slate-900">{deleteTarget.name}</span>? Existing past order history remains intact.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

