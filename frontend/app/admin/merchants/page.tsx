'use client';


import { useLanguage, T } from '@/components/LanguageProvider';
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
  const { t, label: uiLabel, locale } = useLanguage();

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
      setErrorMsg(err.message || t("admin.failed_to_load_merchants_please_check_admin_credentials"));
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
      targetStatus === 'SUSPENDED' ? t("admin.suspend") : targetStatus === 'ARCHIVED' ? t("admin.archive") : t("admin.reactivate");

    const confirm = await Swal.fire({
      title: t("admin.are_you_sure"),
      text: t("interactions.do_you_want_to_value0_merchant_value1", { value0: uiLabel(String(actionText ?? '')), value1: (merchant.business_name) ?? '' }),
      icon: targetStatus === 'SUSPENDED' ? 'warning' : 'info',
      showCancelButton: true,
      confirmButtonColor: targetStatus === 'SUSPENDED' ? '#EF4444' : '#F59E0B',
      cancelButtonColor: '#334155',
      confirmButtonText: t("interactions.yes_value0_merchant", { value0: uiLabel(String(actionText ?? '')) }),
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
          title: t("admin.updated"),
          text: t("interactions.merchant_status_changed_to_value0", { value0: uiLabel(String(targetStatus ?? '')) }),
          icon: 'success',
          background: '#0F172A',
          color: '#FFFFFF',
          timer: 2000,
          showConfirmButton: false,
        });

        loadMerchants();
      } catch (err: any) {
        Swal.fire({
          title: t("admin.error_2"),
          text: err.message || t("admin.failed_to_update_merchant_status"),
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
        title: t("admin.merchant_created"),
        text: t("interactions.merchant_value0_created_successfully_with_temporary_password", { value0: (formData.businessName) ?? '' }),
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
        title: t("admin.error_2"),
        text: err.message || t("admin.failed_to_create_merchant"),
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
        title: t("admin.merchant_updated"),
        text: t("interactions.merchant_value0_details_updated_successfully", { value0: (formData.businessName) ?? '' }),
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
        title: t("admin.error_2"),
        text: err.message || t("admin.failed_to_update_merchant"),
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
      title: t("admin.permanently_delete_merchant_2"),
      text: t("interactions.are_you_sure_you_want_to_delete_value0_this_action_cannot_be_undone_and_will_delete_all_as", { value0: (merchant.business_name) ?? '' }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DC2626',
      cancelButtonColor: '#334155',
      confirmButtonText: t("admin.yes_delete_permanently"),
      cancelButtonText: t("common.cancel"),
      background: '#0F172A',
      color: '#FFFFFF',
    });

    if (confirm.isConfirmed) {
      try {
        await fetchApi(`/admin/merchants/${merchant.id}`, {
          method: 'DELETE',
        });

        Swal.fire({
          title: t("admin.deleted"),
          text: t("interactions.merchant_value0_has_been_permanently_deleted", { value0: (merchant.business_name) ?? '' }),
          icon: 'success',
          background: '#0F172A',
          color: '#FFFFFF',
          timer: 2000,
          showConfirmButton: false,
        });

        loadMerchants();
      } catch (err: any) {
        Swal.fire({
          title: t("admin.deletion_failed"),
          text: err.message || t("admin.failed_to_delete_merchant"),
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
            <Users className="w-6 h-6 text-amber-400" />{' '}<T k="admin.merchant_control_directory" />{' '}</h1>
          <p className="text-xs text-slate-400 mt-1">{' '}<T k="admin.create_manage_suspend_reactivate_and_inspect_complete_360_merchant_profiles" />{' '}</p>
        </div>

        <button
          onClick={() => {
            handleGeneratePassword();
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span><T k="admin.add_new_merchant" /></span>
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
            placeholder={t("admin.search_by_name_phone_email_id")}
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
                <th className="p-4"><T k="admin.merchant_business" /></th>
                <th className="p-4"><T k="admin.primary_contact" /></th>
                <th className="p-4"><T k="admin.metrics_orders_sales" /></th>
                <th className="p-4"><T k="admin.drivers_customers" /></th>
                <th className="p-4"><T k="common.status" /></th>
                <th className="p-4"><T k="admin.joined_date" /></th>
                <th className="p-4 text-right"><T k="common.actions" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />{' '}<T k="admin.loading_merchants_directory" />{' '}</td>
                </tr>
              ) : errorMsg ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 px-4">
                    <div className="max-w-md mx-auto p-4 rounded-2xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-center space-y-2">
                      <p className="font-bold text-sm text-rose-400"><T k="admin.access_restricted_api_error" /></p>
                      <p className="text-xs text-slate-300">{errorMsg}</p>
                      <p className="text-[11px] text-slate-400">{' '}<T k="admin.please_ensure_you_are_logged_in_as_an" />{' '}<strong><T k="admin.admin_user" /></strong> (e.g. <code>+255600000000</code> / <code>admin@lumo.co.tz</code>).
                      </p>
                    </div>
                  </td>
                </tr>
              ) : merchants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">{' '}<T k="admin.no_merchants_match_the_selected_criteria" />{' '}</td>
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
                        <p className="text-[10px] text-slate-400 font-mono">{owner?.email || m.email || t("admin.no_email")}</p>
                      </td>

                      <td className="p-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-white text-xs block">{m.ordersCount || 0}{' '}<T k="common.orders" /></span>
                          <span className="text-[10px] text-emerald-400 font-mono font-bold">
                            TZS {(m.totalSales || 0).toLocaleString(locale)}
                          </span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="text-[11px] text-slate-300">
                          <span className="font-bold">{m.driversCount || 0}</span>{' '}<T k="admin.drivers" />{' '}
                          <span className="font-bold">{m.customersCount || 0}</span>{' '}<T k="common.customers" />{' '}</div>
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
                          {uiLabel(m.status)}
                        </span>
                      </td>

                      <td className="p-4 text-slate-400 font-mono text-[11px]">
                        {new Date(m.created_at).toLocaleDateString(locale)}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/admin/merchants/${m.id}`}
                            title={t("admin.view_360_profile")}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                          </Link>

                          <button
                            onClick={() => handleOpenEditModal(m)}
                            title={t("admin.edit_merchant_details")}
                            className="p-1.5 rounded-lg bg-blue-950/40 border border-blue-900/60 text-blue-400 hover:bg-blue-900/60 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {m.status === 'ACTIVE' ? (
                            <button
                              onClick={() => handleStatusToggle(m, 'SUSPENDED')}
                              title={t("admin.suspend_merchant")}
                              className="p-1.5 rounded-lg bg-amber-950/40 border border-amber-900/60 text-amber-400 hover:bg-amber-900/60 transition-colors"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusToggle(m, 'ACTIVE')}
                              title={t("admin.reactivate_merchant")}
                              className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-900/60 text-emerald-400 hover:bg-emerald-900/60 transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleStatusToggle(m, 'ARCHIVED')}
                            title={t("admin.archive_merchant")}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteMerchant(m)}
                            title={t("admin.permanently_delete_merchant")}
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
                <h3 className="text-lg font-black text-white"><T k="admin.add_new_platform_merchant" /></h3>
                <p className="text-xs text-slate-400">{' '}<T k="admin.register_a_merchant_business_with_auto_generated_temporary_admin_credentials" />{' '}</p>
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
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">{' '}<T k="admin.business_information" />{' '}</span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1"><T k="auth.business_name" /></label>
                    <input
                      type="text"
                      required
                      placeholder={t("admin.e_g_kariakoo_electronics")}
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1"><T k="admin.business_phone" /></label>
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
                    <label className="block text-xs font-semibold text-slate-300 mb-1"><T k="admin.business_email" /></label>
                    <input
                      type="email"
                      placeholder="info@business.co.tz"
                      value={formData.businessEmail}
                      onChange={(e) => setFormData({ ...formData, businessEmail: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1"><T k="admin.location_address" /></label>
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
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">{' '}<T k="admin.primary_user_access_credentials" />{' '}</span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1"><T k="admin.full_name" /></label>
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
                    <label className="block text-xs font-semibold text-slate-300 mb-1"><T k="admin.user_phone" /></label>
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
                    <label className="block text-xs font-semibold text-slate-300 mb-1"><T k="admin.temporary_password" /></label>
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
                          {showTempPassword ? t("admin.hide") : t("admin.show")}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleGeneratePassword}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700"
                      >{' '}<T k="admin.auto_generate" />{' '}</button>
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
                >{' '}<T k="common.cancel" />{' '}</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20"
                >
                  {submitting ? t("admin.creating_merchant") : t("admin.create_merchant_account")}
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
                <h3 className="text-lg font-black text-white"><T k="admin.edit_merchant_profile" /></h3>
                <p className="text-xs text-slate-400">{' '}<T k="admin.update_merchant_business_details_contact_information_status_or_credentials" />{' '}</p>
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
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">{' '}<T k="admin.business_details" />{' '}</span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1"><T k="auth.business_name" /></label>
                    <input
                      type="text"
                      required
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1"><T k="admin.business_phone" /></label>
                    <input
                      type="text"
                      required
                      value={formData.businessPhone}
                      onChange={(e) => setFormData({ ...formData, businessPhone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1"><T k="admin.business_email" /></label>
                    <input
                      type="email"
                      value={formData.businessEmail}
                      onChange={(e) => setFormData({ ...formData, businessEmail: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1"><T k="admin.location_address" /></label>
                    <input
                      type="text"
                      placeholder={t("admin.e_g_ubungo_dar_es_salaam")}
                      value={formData.businessLocation}
                      onChange={(e) => setFormData({ ...formData, businessLocation: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Primary User Section */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">{' '}<T k="admin.primary_owner_account_credentials" />{' '}</span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1"><T k="admin.owner_full_name" /></label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1"><T k="admin.owner_phone" /></label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1"><T k="admin.new_password_optional" /></label>
                    <input
                      type="password"
                      placeholder={t("admin.leave_blank_to_keep_unchanged")}
                      value={formData.temporaryPassword}
                      onChange={(e) => setFormData({ ...formData, temporaryPassword: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1"><T k="admin.new_pin_code_optional" /></label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder={t("admin.leave_blank_to_keep_unchanged")}
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
                >{' '}<T k="common.cancel" />{' '}</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20"
                >
                  {submitting ? t("admin.saving_changes") : t("admin.save_merchant_changes")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
