'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Store,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Ban,
  RotateCcw,
  RefreshCw,
  Package,
  Eye,
  MessageSquare,
  Send,
  X,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function AdminSmartTrackStoresPage() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    totalStores: 0,
    publishedStores: 0,
    draftStores: 0,
    suspendedStores: 0,
  });
  const [stores, setStores] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Suspend reason dialog
  const [suspendTarget, setSuspendTarget] = useState<any>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [moderating, setModerating] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  const loadStores = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set('search', search.trim());
      if (statusFilter !== 'ALL') qs.set('status', statusFilter);

      const res = await fetchApi(`/store/admin/stores?${qs.toString()}`);
      const d = res?.data || res;
      if (d?.kpis) setKpis(d.kpis);
      setStores(d?.stores || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load SmartTrack Stores');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  const handleModeration = async (storeId: string, action: 'SUSPEND' | 'RESTORE', reason?: string) => {
    setModerating(true);
    try {
      await fetchApi(`/store/admin/stores/${storeId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ action, reason }),
      });
      showToast(
        'success',
        action === 'SUSPEND' ? 'Storefront suspended immediately.' : 'Storefront restored & published.'
      );
      setSuspendTarget(null);
      setSuspendReason('');
      await loadStores();
    } catch (err: any) {
      showToast('error', err.message || 'Moderation action failed');
    } finally {
      setModerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-700'
              : 'bg-rose-950 text-rose-100 border-rose-700'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Store className="w-6 h-6 text-[#FF5500]" />
            SmartTrack Stores Governance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor merchant storefronts, product catalogs, SMS store-link outreach, and policy compliance.
          </p>
        </div>
        <button
          type="button"
          onClick={loadStores}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Merchant Stores', value: kpis.totalStores, tone: 'text-slate-900' },
          { label: 'Published Live', value: kpis.publishedStores, tone: 'text-emerald-700' },
          { label: 'Draft Mode', value: kpis.draftStores, tone: 'text-amber-700' },
          { label: 'Suspended', value: kpis.suspendedStores, tone: 'text-rose-700' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{card.label}</p>
            <p className={`text-2xl font-bold mt-1 ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filters + Stores Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search store name, URL slug, or merchant..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold"
          >
            <option value="ALL">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>

        {loading ? (
          <div className="py-10 text-center text-xs text-slate-500">Loading merchant stores...</div>
        ) : stores.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">No merchant storefronts match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4">Storefront</th>
                  <th className="py-2.5 pr-4">Merchant</th>
                  <th className="py-2.5 pr-4">Status</th>
                  <th className="py-2.5 pr-4">Telemetry</th>
                  <th className="py-2.5 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stores.map((s) => (
                  <tr key={s.id}>
                    <td className="py-3.5 pr-4">
                      <p className="font-bold text-slate-900">{s.storeName}</p>
                      <a
                        href={`/store/${s.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[11px] text-[#FF5500] hover:underline inline-flex items-center gap-1 mt-0.5"
                      >
                        /store/{s.slug}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="py-3.5 pr-4">
                      <p className="font-semibold text-slate-800">{s.merchant?.business_name || '—'}</p>
                      <p className="text-slate-500 font-mono">{s.merchant?.business_phone || ''}</p>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          s.publicationStatus === 'PUBLISHED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : s.publicationStatus === 'SUSPENDED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {s.publicationStatus}
                      </span>
                      {s.suspensionReason && s.publicationStatus === 'SUSPENDED' && (
                        <p className="text-[11px] text-rose-600 mt-1 max-w-xs">{s.suspensionReason}</p>
                      )}
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <Package className="w-3.5 h-3.5 text-slate-400" />
                          {s.counts?.products ?? 0} prods
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          {s.counts?.analyticsEvents ?? 0} events
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                          {s.counts?.enquiries ?? 0} req
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Send className="w-3.5 h-3.5 text-slate-400" />
                          {s.counts?.smsSent ?? 0} SMS
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 text-right">
                      {s.publicationStatus === 'SUSPENDED' ? (
                        <button
                          type="button"
                          disabled={moderating}
                          onClick={() => handleModeration(s.id, 'RESTORE')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore Store
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={moderating}
                          onClick={() => {
                            setSuspendTarget(s);
                            setSuspendReason('');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 disabled:opacity-50"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Suspend Store
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Suspend Store Reason Modal */}
      {suspendTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Suspend {suspendTarget.storeName}</h2>
              <button
                type="button"
                onClick={() => setSuspendTarget(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Customers visiting /store/{suspendTarget.slug} will immediately see an unavailable notice until an administrator restores it.
            </p>
            <textarea
              rows={3}
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Enter moderation reason (recorded in platform audit logs)..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSuspendTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={moderating}
                onClick={() => handleModeration(suspendTarget.id, 'SUSPEND', suspendReason)}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50"
              >
                {moderating ? 'Suspending...' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

