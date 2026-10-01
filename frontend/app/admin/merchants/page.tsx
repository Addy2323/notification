'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Swal from 'sweetalert2';
import {
  Users,
  Search,
  Filter,
  Plus,
  Eye,
  Ban,
  CheckCircle2,
  Archive,
  ShoppingBag,
  DollarSign,
  Truck,
  Phone,
  Mail,
  MapPin,
  X,
  Lock,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Pencil,
  Trash2,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function MerchantManagementPage() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMerchantId, setEditingMerchantId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State for Add Merchant Modal
  const [formData, setFormData] = useState({
    businessName: '',
    businessPhone: '',
    businessEmail: '',
    businessLocation: '',
    fullName: '',
    phone: '',
    email: '',
    username: '',
    temporaryPassword: '',
    pinCode: '1234',
    logoUrl: '',
    brandColor: '#1E40AF',
    status: 'ACTIVE',
  });

  const [showTempPassword, setShowTempPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadMerchants = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchApi(
        `/admin/merchants?search=${encodeURIComponent(searchQuery)}&status=${statusFilter}`
      );
      setMerchants(res || []);
    } catch (err: any) {
      console.error('Failed to load merchants:', err);
      setErrorMsg(err.message || 'Failed to load merchants. Please check Admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMerchants();
  }, [statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadMerchants();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleStatusToggle = async (merchant: any, targetStatus: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED') => {
    const actionText =
      targetStatus === 'SUSPENDED' ? 'suspend' : targetStatus === 'ARCHIVED' ? 'archive' : 'reactivate';

    const confirm = await Swal.fire({
      title: `Are you sure?`,
      text: `Do you want to ${actionText} merchant "${merchant.business_name}"?`,
      icon: targetStatus === 'SUSPENDED' ? 'warning' : 'info',
      showCancelButton: true,
      confirmButtonColor: targetStatus === 'SUSPENDED' ? '#EF4444' : '#F59E0B',
      cancelButtonColor: '#334155',
      confirmButtonText: `Yes, ${actionText} merchant`,
      background: '#0F172A',
      color: '#FFFFFF',
    });

    if (confirm.isConfirmed) {
      try {
        await fetchApi(`/admin/merchants/${merchant.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: targetStatus }),
        });

        Swal.fire({
          title: 'Updated!',
          text: `Merchant status changed to ${targetStatus}`,
          icon: 'success',
          background: '#0F172A',
          color: '#FFFFFF',
          timer: 2000,
          showConfirmButton: false,
        });

        loadMerchants();
      } catch (err: any) {
        Swal.fire({
          title: 'Error!',
          text: err.message || 'Failed to update merchant status',
          icon: 'error',
          background: '#0F172A',
          color: '#FFFFFF',
        });
      }
    }
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, temporaryPassword: pass });
  };

  const handleCreateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetchApi('/admin/merchants', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      Swal.fire({
        title: 'Merchant Created!',
        text: `Merchant ${formData.businessName} created successfully with temporary password.`,
        icon: 'success',
        background: '#0F172A',
        color: '#FFFFFF',
      });

      setShowAddModal(false);
      setFormData({
        businessName: '',
        businessPhone: '',
        businessEmail: '',
        businessLocation: '',
        fullName: '',
        phone: '',
        email: '',
        username: '',
        temporaryPassword: '',
        pinCode: '1234',
        logoUrl: '',
        brandColor: '#1E40AF',
        status: 'ACTIVE',
      });
      loadMerchants();
    } catch (err: any) {
      Swal.fire({
        title: 'Error!',
        text: err.message || 'Failed to create merchant',
        icon: 'error',
        background: '#0F172A',
        color: '#FFFFFF',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (merchant: any) => {
    const owner = merchant.users?.[0];
    setEditingMerchantId(merchant.id);
    setFormData({
      businessName: merchant.business_name || '',
      businessPhone: merchant.business_phone || '',
      businessEmail: merchant.email || '',
      businessLocation: merchant.location || '',
      fullName: owner?.name || '',
      phone: owner?.phone || merchant.business_phone || '',
      email: owner?.email || merchant.email || '',
      username: '',
      temporaryPassword: '',
      pinCode: '',
      logoUrl: merchant.logo_url || '',
      brandColor: merchant.brand_color || '#1E40AF',
      status: merchant.status || 'ACTIVE',
    });
    setShowEditModal(true);
  };

  const handleUpdateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMerchantId) return;
    setSubmitting(true);
    try {
      await fetchApi(`/admin/merchants/${editingMerchantId}`, {
        method: 'PUT',
        body: JSON.stringify({
          businessName: formData.businessName,
          businessPhone: formData.businessPhone,
          businessEmail: formData.businessEmail,
          location: formData.businessLocation,
          fullName: formData.fullName,
          phone: formData.phone,
          email: formData.email,
          password: formData.temporaryPassword || undefined,
          pinCode: formData.pinCode || undefined,
          logoUrl: formData.logoUrl,
          brandColor: formData.brandColor,
          status: formData.status,
        }),
      });

      Swal.fire({
        title: 'Merchant Updated!',
        text: `Merchant "${formData.businessName}" details updated successfully.`,
        icon: 'success',
        background: '#0F172A',
        color: '#FFFFFF',
        timer: 2000,
        showConfirmButton: false,
      });

      setShowEditModal(false);
      setEditingMerchantId(null);
      loadMerchants();
    } catch (err: any) {
      Swal.fire({
        title: 'Error!',
        text: err.message || 'Failed to update merchant',
        icon: 'error',
        background: '#0F172A',
        color: '#FFFFFF',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMerchant = async (merchant: any) => {
    const confirm = await Swal.fire({
      title: 'Permanently Delete Merchant?',
      text: `Are you sure you want to delete "${merchant.business_name}"? This action CANNOT be undone and will delete all associated orders, deliveries, and drivers.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DC2626',
      cancelButtonColor: '#334155',
      confirmButtonText: 'Yes, Delete Permanently',
      cancelButtonText: 'Cancel',
      background: '#0F172A',
      color: '#FFFFFF',
    });

    if (confirm.isConfirmed) {
      try {
        await fetchApi(`/admin/merchants/${merchant.id}`, {
          method: 'DELETE',
        });

        Swal.fire({
          title: 'Deleted!',
          text: `Merchant "${merchant.business_name}" has been permanently deleted.`,
          icon: 'success',
          background: '#0F172A',
          color: '#FFFFFF',
          timer: 2000,
          showConfirmButton: false,
        });

        loadMerchants();
      } catch (err: any) {
        Swal.fire({
          title: 'Deletion Failed!',
          text: err.message || 'Failed to delete merchant',
          icon: 'error',
          background: '#0F172A',
          color: '#FFFFFF',
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-400" />
            Merchant Control & Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create, manage, suspend, reactivate, and inspect complete 360° merchant profiles.
          </p>
        </div>

        <button
          onClick={() => {
            handleGeneratePassword();
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Merchant</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full md:w-auto overflow-x-auto">
          {['ALL', 'ACTIVE', 'SUSPENDED', 'ARCHIVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === st
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, phone, email, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
          />
        </div>
      </div>

      {/* Merchants Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-4">Merchant / Business</th>
                <th className="p-4">Primary Contact</th>
                <th className="p-4">Metrics (Orders / Sales)</th>
                <th className="p-4">Drivers & Customers</th>
                <th className="p-4">Status</th>
                <th className="p-4">Joined Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                    Loading merchants directory...
                  </td>
                </tr>
              ) : errorMsg ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 px-4">
                    <div className="max-w-md mx-auto p-4 rounded-2xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-center space-y-2">
                      <p className="font-bold text-sm text-rose-400">Access Restricted / API Error</p>
                      <p className="text-xs text-slate-300">{errorMsg}</p>
                      <p className="text-[11px] text-slate-400">
                        Please ensure you are logged in as an <strong>Admin User</strong> (e.g. <code>+255600000000</code> / <code>admin@lumo.co.tz</code>).
                      </p>
                    </div>
                  </td>
                </tr>
              ) : merchants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No merchants match the selected criteria.
                  </td>
                </tr>
              ) : (
                merchants.map((m) => {
                  const owner = m.users?.[0];
                  return (
                    <tr key={m.id} className="hover:bg-slate-850/50 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-md text-sm"
                            style={{ backgroundColor: m.brand_color || '#1E40AF' }}
                          >
                            {m.business_name[0]}
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm group-hover:text-amber-400 transition-colors">
                              {m.business_name}
                            </p>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-slate-500" /> {m.business_phone}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <p className="font-bold text-slate-200">{owner?.name || 'N/A'}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{owner?.email || m.email || 'No email'}</p>
                      </td>

                      <td className="p-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-white text-xs block">{m.ordersCount || 0} Orders</span>
                          <span className="text-[10px] text-emerald-400 font-mono font-bold">
                            TZS {(m.totalSales || 0).toLocaleString()}
                          </span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="text-[11px] text-slate-300">
                          <span className="font-bold">{m.driversCount || 0}</span> Drivers •{' '}
                          <span className="font-bold">{m.customersCount || 0}</span> Customers
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            m.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : m.status === 'SUSPENDED'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              m.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                          ></span>
                          {m.status}
                        </span>
                      </td>

                      <td className="p-4 text-slate-400 font-mono text-[11px]">
                        {new Date(m.created_at).toLocaleDateString()}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/admin/merchants/${m.id}`}
                            title="View 360° Profile"
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                          </Link>

                          <button
                            onClick={() => handleOpenEditModal(m)}
                            title="Edit Merchant Details"
                            className="p-1.5 rounded-lg bg-blue-950/40 border border-blue-900/60 text-blue-400 hover:bg-blue-900/60 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {m.status === 'ACTIVE' ? (
                            <button
                              onClick={() => handleStatusToggle(m, 'SUSPENDED')}
                              title="Suspend Merchant"
                              className="p-1.5 rounded-lg bg-amber-950/40 border border-amber-900/60 text-amber-400 hover:bg-amber-900/60 transition-colors"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusToggle(m, 'ACTIVE')}
                              title="Reactivate Merchant"
                              className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-900/60 text-emerald-400 hover:bg-emerald-900/60 transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleStatusToggle(m, 'ARCHIVED')}
                            title="Archive Merchant"
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteMerchant(m)}
                            title="Permanently Delete Merchant"
                            className="p-1.5 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-400 hover:bg-rose-900/60 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Merchant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white">Add New Platform Merchant</h3>
                <p className="text-xs text-slate-400">
                  Register a merchant business with auto-generated temporary admin credentials.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMerchant} className="space-y-4">
              {/* Business Section */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Business Information
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Business Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kariakoo Electronics"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Business Phone *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 255712345678"
                      value={formData.businessPhone}
                      onChange={(e) => setFormData({ ...formData, businessPhone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Business Email</label>
                    <input
                      type="email"
                      placeholder="info@business.co.tz"
                      value={formData.businessEmail}
                      onChange={(e) => setFormData({ ...formData, businessEmail: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Location / Address</label>
                    <input
                      type="text"
                      placeholder="Dar es Salaam, Tanzania"
                      value={formData.businessLocation}
                      onChange={(e) => setFormData({ ...formData, businessLocation: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Owner Account Section */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Primary User & Access Credentials
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">User Phone *</label>
                    <input
                      type="text"
                      required
                      placeholder="255712345678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Temporary Password *</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showTempPassword ? 'text' : 'password'}
                          required
                          value={formData.temporaryPassword}
                          onChange={(e) => setFormData({ ...formData, temporaryPassword: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-10 py-2 text-xs font-mono text-amber-400 focus:border-amber-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowTempPassword(!showTempPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-[10px]"
                        >
                          {showTempPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleGeneratePassword}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700"
                      >
                        Auto-Generate
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20"
                >
                  {submitting ? 'Creating Merchant...' : 'Create Merchant Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Merchant Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white">Edit Merchant Profile</h3>
                <p className="text-xs text-slate-400">
                  Update merchant business details, contact information, status, or credentials.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMerchantId(null);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateMerchant} className="space-y-4">
              {/* Business Section */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  Business Details
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Business Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Business Phone *</label>
                    <input
                      type="text"
                      required
                      value={formData.businessPhone}
                      onChange={(e) => setFormData({ ...formData, businessPhone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Business Email</label>
                    <input
                      type="email"
                      value={formData.businessEmail}
                      onChange={(e) => setFormData({ ...formData, businessEmail: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Location / Address</label>
                    <input
                      type="text"
                      placeholder="e.g. Ubungo, Dar es Salaam"
                      value={formData.businessLocation}
                      onChange={(e) => setFormData({ ...formData, businessLocation: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Primary User Section */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Primary Owner / Account Credentials
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Owner Full Name</label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Owner Phone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">New Password (Optional)</label>
                    <input
                      type="password"
                      placeholder="Leave blank to keep unchanged"
                      value={formData.temporaryPassword}
                      onChange={(e) => setFormData({ ...formData, temporaryPassword: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">New PIN Code (Optional)</label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="Leave blank to keep unchanged"
                      value={formData.pinCode}
                      onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingMerchantId(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20"
                >
                  {submitting ? 'Saving Changes...' : 'Save Merchant Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
