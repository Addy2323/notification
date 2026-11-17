'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BadgeCheck,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { VerifiedBadge } from '@/components/common/VerifiedBadge';

export default function AdminVerifiedMerchantsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    durationDays: '30',
    priceTzs: '15000',
    isActive: true,
  });
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : '';
      const res = await fetchApi(`/verification/admin/overview${qs}`);
      setData(res?.data || res);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load verification overview');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: planForm.name,
        description: planForm.description,
        durationDays: Number(planForm.durationDays),
        priceTzs: Number(planForm.priceTzs),
        isActive: planForm.isActive,
      };
      if (editingPlan?.id) {
        await fetchApi(`/verification/admin/plans/${editingPlan.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        showToast('success', 'Subscription plan updated');
      } else {
        await fetchApi('/verification/admin/plans', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('success', 'Subscription plan created');
      }
      setEditingPlan(null);
      setPlanForm({ name: '', description: '', durationDays: '30', priceTzs: '15000', isActive: true });
      await loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save plan');
    }
  };

  const handleApproveApp = async (id: string) => {
    try {
      await fetchApi(`/verification/admin/applications/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Payment verified & approved by admin' }),
      });
      showToast('success', 'Verified Merchant Blue Badge activated!');
      await loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Approval failed');
    }
  };

  const handleRejectApp = async (id: string) => {
    const notes = prompt('Reason for rejection:');
    if (!notes) return;
    try {
      await fetchApi(`/verification/admin/applications/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      });
      showToast('success', 'Application rejected');
      await loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Rejection failed');
    }
  };

  const handleManualGrant = async (merchantId: string, name: string) => {
    const days = prompt(`Grant Blue Verification Badge to ${name} for how many days?`, '365');
    if (!days) return;
    try {
      await fetchApi(`/verification/admin/merchants/${merchantId}/grant`, {
        method: 'POST',
        body: JSON.stringify({ durationDays: Number(days), notes: 'Admin manual grant' }),
      });
      showToast('success', `Granted Verified Badge to ${name}`);
      await loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Manual grant failed');
    }
  };

  const handleMerchantAction = async (merchantId: string, action: 'EXTEND' | 'SUSPEND' | 'REVOKE') => {
    const extraDays = action === 'EXTEND' ? Number(prompt('Extend by how many days?', '30') || 30) : undefined;
    try {
      await fetchApi(`/verification/admin/merchants/${merchantId}/status`, {
        method: 'POST',
        body: JSON.stringify({ action, extraDays, reason: `Admin ${action.toLowerCase()}` }),
      });
      showToast('success', `Verification ${action.toLowerCase()} completed`);
      await loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Action failed');
    }
  };

  const stats = data?.stats || {};
  const plans = data?.plans || [];
  const applications = data?.applications || [];
  const merchants = data?.merchants || [];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <BadgeCheck className="w-6 h-6 text-[#0095F6]" />
            Verified Merchant Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure dynamic verification plan pricing, review Snippe payments, and grant or manage Blue Badges.
          </p>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Verified Merchants', value: stats.totalVerifiedMerchants || 0 },
          { label: 'Paid Apps', value: stats.paidVerificationApplications || 0 },
          { label: 'Pending Approval', value: stats.pendingApproval || 0 },
          { label: 'Active Subs', value: stats.activeSubscriptions || 0 },
          { label: 'Expired', value: stats.expiredSubscriptions || 0 },
          { label: 'Rejected', value: stats.rejectedApplications || 0 },
          { label: 'Revenue', value: `TZS ${Number(stats.totalRevenueTzs || 0).toLocaleString()}` },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500">{k.label}</p>
            <p className="text-base font-black text-slate-900 mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Dynamic Plan Pricing Management */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900">Verification Subscription Plans & Dynamic Pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {plans.map((p: any) => (
            <div key={p.id} className="p-4 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">{p.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                    {p.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{p.duration_days} days • {p.description}</p>
                <p className="text-lg font-black text-[#0F172A] mt-2">
                  TZS {Number(p.price_tzs || 0).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingPlan(p);
                  setPlanForm({
                    name: p.name,
                    description: p.description || '',
                    durationDays: String(p.duration_days),
                    priceTzs: String(p.price_tzs),
                    isActive: Boolean(p.is_active),
                  });
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800"
              >
                Edit Price / Duration
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={handleSavePlan} className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Plan Name *</label>
            <input
              type="text"
              required
              value={planForm.name}
              onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
              placeholder="e.g. Monthly Verification"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Duration (Days) *</label>
            <input
              type="number"
              required
              min="1"
              value={planForm.durationDays}
              onChange={(e) => setPlanForm({ ...planForm, durationDays: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Price (TZS) *</label>
            <input
              type="number"
              required
              min="0"
              value={planForm.priceTzs}
              onChange={(e) => setPlanForm({ ...planForm, priceTzs: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 pb-2">
            <input
              type="checkbox"
              checked={planForm.isActive}
              onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
              className="w-4 h-4 accent-[#0095F6]"
            />
            Active Plan
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-bold hover:bg-slate-800"
          >
            <Plus className="w-3.5 h-3.5" />
            {editingPlan ? 'Save Plan Changes' : 'Add Plan'}
          </button>
        </form>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search merchants or transaction references..."
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
        />
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3 overflow-x-auto">
        <h2 className="text-sm font-extrabold text-slate-900">Verification Applications & Payments</h2>
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50 font-bold text-slate-500 uppercase text-[11px]">
            <tr>
              <th className="px-3 py-2.5">Merchant</th>
              <th className="px-3 py-2.5">Plan</th>
              <th className="px-3 py-2.5">Payment</th>
              <th className="px-3 py-2.5">Ref</th>
              <th className="px-3 py-2.5">App Status</th>
              <th className="px-3 py-2.5">Expires</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {applications.map((app: any) => (
              <tr key={app.id} className="hover:bg-slate-50">
                <td className="px-3 py-2.5 font-bold text-slate-900">
                  {app.merchant?.business_name}
                </td>
                <td className="px-3 py-2.5">{app.plan?.name || app.method}</td>
                <td className="px-3 py-2.5">
                  TZS {Number(app.payment_amount_tzs || 0).toLocaleString()} ({app.payment_status})
                </td>
                <td className="px-3 py-2.5 font-mono text-[11px]">{app.transaction_reference}</td>
                <td className="px-3 py-2.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                    {app.status}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-slate-500">
                  {app.expires_at ? new Date(app.expires_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap space-x-1.5">
                  {app.status === 'PAID_PENDING_REVIEW' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApproveApp(app.id)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold"
                      >
                        Approve & Activate
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectApp(app.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-semibold"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Merchant Verification Directory */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3 overflow-x-auto">
        <h2 className="text-sm font-extrabold text-slate-900">All Merchants — Manual Badge Control</h2>
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50 font-bold text-slate-500 uppercase text-[11px]">
            <tr>
              <th className="px-3 py-2.5">Business Name</th>
              <th className="px-3 py-2.5">Category</th>
              <th className="px-3 py-2.5">Verification Status</th>
              <th className="px-3 py-2.5">Expires</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {merchants.map((m: any) => (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className="px-3 py-2.5 font-bold text-slate-900 flex items-center gap-1.5">
                  {m.business_name}
                  {m.is_verified && <VerifiedBadge size="xs" />}
                </td>
                <td className="px-3 py-2.5 text-slate-600">
                  {m.category_mappings?.[0]?.category?.name || '—'}
                </td>
                <td className="px-3 py-2.5">{m.verification_status}</td>
                <td className="px-3 py-2.5 text-slate-500">
                  {m.verification_expires_at ? new Date(m.verification_expires_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap space-x-1.5">
                  {!m.is_verified ? (
                    <button
                      type="button"
                      onClick={() => handleManualGrant(m.id, m.business_name)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0095F6] text-white font-semibold"
                    >
                      <ShieldCheck className="w-3 h-3" /> Grant Badge
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleMerchantAction(m.id, 'EXTEND')}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-semibold"
                      >
                        Extend
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMerchantAction(m.id, 'SUSPEND')}
                        className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-semibold"
                      >
                        Suspend
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMerchantAction(m.id, 'REVOKE')}
                        className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-semibold"
                      >
                        Revoke
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

