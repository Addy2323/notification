'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Send,
  Smartphone,
  ShieldCheck,
  MessageSquare,
  Repeat,
  RotateCcw,
} from 'lucide-react';
import { useLanguage, T } from '@/components/LanguageProvider';
import { fetchApi } from '@/lib/api';

interface NotificationItem {
  id: string;
  order_id?: string;
  event_type: string;
  recipient_type: string;
  recipient_phone: string;
  message_body: string;
  channel: string;
  status: string;
  provider_message_id?: string | null;
  failure_reason?: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
  order?: {
    id: string;
    order_number: string;
    customer_name: string;
    merchant?: { id: string; business_name: string };
  } | null;
}

export default function AdminNotificationsPage() {
  const { t, locale } = useLanguage();
  const isSwahili = locale === 'sw';

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [kpis, setKpis] = useState({
    total: 0,
    delivered: 0,
    queued: 0,
    failed: 0,
    automatic_confirmations: 0,
    resent_confirmations: 0,
  });

  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
      });
      if (search) params.set('search', search);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (categoryFilter !== 'ALL') params.set('event_type', categoryFilter);

      const res = await fetchApi(`/admin/notifications?${params.toString()}`);
      setNotifications(res?.notifications || []);
      setKpis(res?.kpis || { total: 0, delivered: 0, queued: 0, failed: 0, automatic_confirmations: 0, resent_confirmations: 0 });
      setTotalPages(res?.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load notifications metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, categoryFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      await fetchApi(`/admin/notifications/${id}/retry`, { method: 'POST' });
      alert(isSwahili ? 'SMS imejaribiwa kutumwa tena!' : 'SMS retry dispatched successfully!');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Retry failed');
    } finally {
      setRetryingId(null);
    }
  };

  const getCategoryBadge = (eventType: string) => {
    if (eventType === 'RECEIPT_CONFIRMATION_REQUEST') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#16794B]/20 text-emerald-400 border border-[#16794B]/30">
          <CheckCircle2 className="w-2.5 h-2.5" />
          {isSwahili ? 'Uthibitisho Kiotomatiki' : 'Auto Confirmation'}
        </span>
      );
    }
    if (eventType === 'RECEIPT_CONFIRMATION_RESENT') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <Repeat className="w-2.5 h-2.5" />
          {isSwahili ? 'Uthibitisho Uliorudiwa' : 'Resent Confirmation'}
        </span>
      );
    }
    if (eventType === 'RECEIPT_CONFIRMATION_THANK_YOU') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-400 border border-teal-500/30">
          <MessageSquare className="w-2.5 h-2.5" />
          {isSwahili ? 'Shukrani (YES)' : 'Thank-You (YES)'}
        </span>
      );
    }
    if (eventType === 'RECEIPT_CONFIRMATION_INVESTIGATION') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
          <AlertCircle className="w-2.5 h-2.5" />
          {isSwahili ? 'Uchunguzi (NO)' : 'Investigation (NO)'}
        </span>
      );
    }
    if (eventType === 'STAFF_FOLLOWUP_SMS') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
          <Smartphone className="w-2.5 h-2.5" />
          {isSwahili ? 'Ujumbe wa Mhudumu' : 'Staff Follow-up'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
        {eventType.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-amber-400" />
            <span>{isSwahili ? 'Ufuatiliaji wa Bulk SMS & Arifa' : 'Bulk SMS & Notification Telemetry'}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isSwahili
              ? 'Tofautisha SMS za uthibitisho wa kupokea oda, ujumbe uliorudiwa, arifa za uchunguzi, na ufuatilie hali halisi ya mtandao wa Meseji SMS.'
              : 'Audit automated receipt confirmations, resent messages, follow-up dispatches, delivery receipts, and provider telemetry.'}
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block truncate">
            {isSwahili ? 'Jumla ya SMS Zilizotumwa' : 'Total SMS Sent'}
          </span>
          <p className="text-2xl font-black text-white mt-1 font-mono">{kpis.total}</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block truncate">
            {isSwahili ? 'SMS Zilizofika (Delivered)' : 'Delivered SMS'}
          </span>
          <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">{kpis.delivered}</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block truncate">
            {isSwahili ? 'Zilizoko Foleni (Queued)' : 'Queued SMS'}
          </span>
          <p className="text-2xl font-black text-amber-400 mt-1 font-mono">{kpis.queued}</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block truncate">
            {isSwahili ? 'Zilizofeli (Failed)' : 'Failed SMS'}
          </span>
          <p className="text-2xl font-black text-rose-400 mt-1 font-mono">{kpis.failed}</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block truncate">
            {isSwahili ? 'Uthibitisho Kiotomatiki' : 'Auto Confirm SMS'}
          </span>
          <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">{kpis.automatic_confirmations}</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block truncate">
            {isSwahili ? 'Uthibitisho Uliorudiwa' : 'Resent Confirmations'}
          </span>
          <p className="text-2xl font-black text-amber-400 mt-1 font-mono">{kpis.resent_confirmations}</p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                isSwahili
                  ? 'Tafuta kwa nambari ya simu, ujumbe, oda #, au provider message ID...'
                  : 'Search by recipient phone, message text, order #, or provider ID...'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category distinction */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-medium focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">{isSwahili ? 'Aina Zote za SMS' : 'All Message Categories'}</option>
              <option value="RECEIPT_AUTOMATIC">{isSwahili ? 'SMS ya Uthibitisho (Kiotomatiki)' : 'Automatic Confirmation SMS'}</option>
              <option value="RECEIPT_RESENT">{isSwahili ? 'SMS ya Uthibitisho (Iliorudiwa)' : 'Resent Confirmation SMS'}</option>
              <option value="RECEIPT_FOLLOWUP">{isSwahili ? 'Ujumbe wa Shukrani / Uchunguzi' : 'Thank-You & Follow-up SMS'}</option>
              <option value="ORDER_EVENTS">{isSwahili ? 'Arifa Nyingine za Oda' : 'Standard Delivery Alerts'}</option>
            </select>

            {/* Status distinction */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-medium focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">{isSwahili ? 'Hali Zote' : 'All Delivery Statuses'}</option>
              <option value="DELIVERED">DELIVERED (Imefika)</option>
              <option value="SENT">SENT (Imetumwa)</option>
              <option value="QUEUED">QUEUED (Iko Foleni)</option>
              <option value="FAILED">FAILED (Imefeli)</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
            >
              {isSwahili ? 'Chuja' : 'Filter'}
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-4 px-4">{isSwahili ? 'Muda' : 'Timestamp'}</th>
                <th className="py-4 px-4">{isSwahili ? 'Namba ya Simu' : 'Recipient Phone'}</th>
                <th className="py-4 px-4">{isSwahili ? 'Aina ya Ujumbe' : 'Category'}</th>
                <th className="py-4 px-4">{isSwahili ? 'Oda' : 'Order'}</th>
                <th className="py-4 px-4">{isSwahili ? 'Ujumbe' : 'Message Body'}</th>
                <th className="py-4 px-4">{isSwahili ? 'Hali' : 'Status'}</th>
                <th className="py-4 px-4 text-right">{isSwahili ? 'Kitendo' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                    <span>{isSwahili ? 'Inapakia SMS...' : 'Loading notifications...'}</span>
                  </td>
                </tr>
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-bold text-white text-sm">
                      {isSwahili ? 'Hakuna SMS zilizopatikana' : 'No notifications matched your filters'}
                    </p>
                  </td>
                </tr>
              ) : (
                notifications.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString(locale, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                      {item.recipient_phone}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getCategoryBadge(item.event_type)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {item.order ? `#${item.order.order_number}` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate" title={item.message_body}>
                      {item.message_body}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          item.status === 'DELIVERED' || item.status === 'SENT'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : item.status === 'FAILED'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {item.status}
                      </span>
                      {item.failure_reason && (
                        <span className="block text-[9px] text-rose-400 truncate max-w-[120px] mt-0.5">
                          {item.failure_reason}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {item.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetry(item.id)}
                          disabled={retryingId === item.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold text-[10px] border border-rose-500/30 transition-colors"
                          title="Retry dispatching this SMS"
                        >
                          <RotateCcw className={`w-3 h-3 ${retryingId === item.id ? 'animate-spin' : ''}`} />
                          <span>{isSwahili ? 'Rudia' : 'Retry'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              {isSwahili ? 'Ukurasa: ' : 'Page: '} {page} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold"
              >
                {isSwahili ? 'Iliyopita' : 'Previous'}
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold"
              >
                {isSwahili ? 'Inayofuata' : 'Next'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
