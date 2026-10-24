'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Send,
  MessageSquare,
  ShieldAlert,
  UserCheck,
  Building,
  Calendar,
  Settings,
  ChevronRight,
  Eye,
  FileText,
  Truck,
  Phone,
  Sparkles,
  Save,
  Check,
} from 'lucide-react';
import { useLanguage, T } from '@/components/LanguageProvider';
import { fetchApi } from '@/lib/api';

interface ReceiptConfirmationItem {
  id: string;
  order_id: string;
  merchant_id: string;
  confirmation_token: string;
  sms_status: string;
  sms_sent_at?: string;
  sms_failure_reason?: string;
  sms_type: string;
  customer_response?: string | null;
  responded_at?: string;
  followup_status?: string | null;
  assigned_staff?: string | null;
  investigation_notes?: string | null;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  created_at: string;
  order: {
    id: string;
    order_number: string;
    customer_name: string;
    customer_phone: string;
    delivery_address: string;
    product_name: string;
    amount: number;
    total_revenue: number;
    delivered_at?: string;
    created_at: string;
    driver_name?: string;
    driver_phone?: string;
  };
  merchant: {
    id: string;
    business_name: string;
    business_phone: string;
  };
}

export default function AdminReceiptConfirmationsPage() {
  const { t, locale } = useLanguage();
  const isSwahili = locale === 'sw';

  const [activeTab, setActiveTab] = useState<'records' | 'settings'>('records');
  const [loading, setLoading] = useState(true);
  const [confirmations, setConfirmations] = useState<ReceiptConfirmationItem[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, totalPages: 1 });

  // KPIs
  const [kpis, setKpis] = useState({
    total_eligible_orders: 0,
    confirmation_sms_sent: 0,
    confirmed_received: 0,
    reported_not_received: 0,
    awaiting_response: 0,
    open_followup_cases: 0,
    resolved_cases: 0,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [responseFilter, setResponseFilter] = useState('ALL');
  const [caseFilter, setCaseFilter] = useState('ALL');
  const [smsStatusFilter, setSmsStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected item for modal
  const [selectedItem, setSelectedItem] = useState<ReceiptConfirmationItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Investigation form state
  const [newNote, setNewNote] = useState('');
  const [caseStatus, setCaseStatus] = useState<string>('OPEN');
  const [assignedStaff, setAssignedStaff] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [customerMessage, setCustomerMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Settings State
  const [settings, setSettings] = useState<any>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) queryParams.set('search', search);
      if (responseFilter !== 'ALL') queryParams.set('customer_response', responseFilter);
      if (caseFilter !== 'ALL') queryParams.set('followup_status', caseFilter);
      if (smsStatusFilter !== 'ALL') queryParams.set('sms_status', smsStatusFilter);
      if (startDate) queryParams.set('start_date', startDate);
      if (endDate) queryParams.set('end_date', endDate);

      const [listRes, statsRes] = await Promise.all([
        fetchApi(`/receipt-confirmations/admin/list?${queryParams.toString()}`),
        fetchApi('/receipt-confirmations/admin/stats'),
      ]);

      setConfirmations(listRes.confirmations || []);
      setPagination(listRes.pagination || { total: 0, page: 1, limit: 25, totalPages: 1 });
      setKpis(statsRes || {});
    } catch (err) {
      console.error('Failed to load confirmations:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    setSettingsLoading(true);
    try {
      const data = await fetchApi('/receipt-confirmations/admin/settings');
      setSettings(data);
    } catch (err) {
      console.error('Failed to load confirmation settings:', err);
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [pagination.page, responseFilter, caseFilter, smsStatusFilter, startDate, endDate]);

  useEffect(() => {
    if (activeTab === 'settings') {
      loadSettings();
    }
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((p) => ({ ...p, page: 1 }));
    loadData();
  };

  const openInvestigationModal = (item: ReceiptConfirmationItem) => {
    setSelectedItem(item);
    setCaseStatus(item.followup_status || 'OPEN');
    setAssignedStaff(item.assigned_staff || '');
    setResolutionNotes(item.resolution_notes || '');
    setNewNote('');
    setCustomerMessage('');
    setActionSuccess(null);
    setModalOpen(true);
  };

  const handleSaveCaseUpdate = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    setActionSuccess(null);
    try {
      if (newNote.trim()) {
        await fetchApi(`/receipt-confirmations/admin/${selectedItem.id}/notes`, {
          method: 'POST',
          body: JSON.stringify({ note: newNote }),
        });
      }

      const updated = await fetchApi(`/receipt-confirmations/admin/${selectedItem.id}/case`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: caseStatus,
          assigned_staff: assignedStaff,
          resolution_notes: resolutionNotes,
          customer_message: customerMessage,
        }),
      });

      setActionSuccess(isSwahili ? 'Kesi imesasishwa kikamilifu!' : 'Case updated successfully!');
      setSelectedItem(updated);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update case');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendSMS = async (item: ReceiptConfirmationItem) => {
    if (!confirm(isSwahili ? `Tuma tena SMS ya uthibitisho kwa oda #${item.order.order_number}?` : `Resend receipt confirmation SMS for order #${item.order.order_number}?`)) {
      return;
    }

    try {
      await fetchApi(`/receipt-confirmations/admin/${item.id}/resend`, { method: 'POST' });
      alert(isSwahili ? 'SMS ya uthibitisho imetumwa upya!' : 'Confirmation SMS resent successfully!');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to resend SMS');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    try {
      await fetchApi('/receipt-confirmations/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <span>{isSwahili ? 'Uthibitisho wa Kupokea Oda (SMS)' : 'Order Receipt Confirmations'}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isSwahili
              ? 'Fuatilia majibu ya wateja kuhusu kupokea mizigo, kesi za ufuatiliaji, na mipangilio ya Bulk SMS.'
              : 'Automated post-delivery customer confirmation workflow, investigation cases, and bulk SMS telemetry.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
            <button
              onClick={() => setActiveTab('records')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'records'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isSwahili ? 'Marekodi & Kesi' : 'Records & Cases'}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'settings'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5" />
                {isSwahili ? 'Mipangilio ya SMS' : 'SMS Config'}
              </span>
            </button>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block truncate">
            {isSwahili ? 'Oda Zilizofikishwa' : 'Eligible Delivered'}
          </span>
          <p className="text-2xl font-black text-white mt-1 font-mono">{kpis.total_eligible_orders}</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block truncate">
            {isSwahili ? 'SMS Zilizotumwa' : 'Confirmation SMS'}
          </span>
          <p className="text-2xl font-black text-amber-400 mt-1 font-mono">{kpis.confirmation_sms_sent}</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block truncate">
            {isSwahili ? 'Ndiyo (Wamepokea)' : 'Confirmed Received'}
          </span>
          <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">{kpis.confirmed_received}</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block truncate">
            {isSwahili ? 'Hapana (Hawajapokea)' : 'Reported Non-Receipt'}
          </span>
          <p className="text-2xl font-black text-rose-400 mt-1 font-mono">{kpis.reported_not_received}</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block truncate">
            {isSwahili ? 'Wanaosubiriwa' : 'Awaiting Reply'}
          </span>
          <p className="text-2xl font-black text-slate-300 mt-1 font-mono">{kpis.awaiting_response}</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block truncate">
            {isSwahili ? 'Kesi Zilizo Wazi' : 'Open Follow-ups'}
          </span>
          <p className="text-2xl font-black text-amber-400 mt-1 font-mono">{kpis.open_followup_cases}</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block truncate">
            {isSwahili ? 'Kesi Zilizotatuliwa' : 'Resolved Cases'}
          </span>
          <p className="text-2xl font-black text-teal-400 mt-1 font-mono">{kpis.resolved_cases}</p>
        </div>
      </div>

      {activeTab === 'records' ? (
        <>
          {/* Search & Filter Toolbar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={
                    isSwahili
                      ? 'Tafuta kwa nambari ya oda, mteja, simu, bidhaa, muuzaji au mhudumu...'
                      : 'Search order #, customer name, phone, product, vendor, or staff...'
                  }
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Response Filter */}
                <select
                  value={responseFilter}
                  onChange={(e) => setResponseFilter(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-medium focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">{isSwahili ? 'Majibu Yote' : 'All Responses'}</option>
                  <option value="RECEIVED">{isSwahili ? '✓ Amepokea (RECEIVED)' : '✓ Confirmed Received'}</option>
                  <option value="NOT_RECEIVED">{isSwahili ? '✕ Hajapokea (NOT_RECEIVED)' : '✕ Reported Non-Receipt'}</option>
                  <option value="AWAITING">{isSwahili ? '⏳ Inasubiriwa (AWAITING)' : '⏳ Awaiting Response'}</option>
                </select>

                {/* Case Status Filter */}
                <select
                  value={caseFilter}
                  onChange={(e) => setCaseFilter(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-medium focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">{isSwahili ? 'Kesi Zote' : 'All Cases'}</option>
                  <option value="OPEN">OPEN</option>
                  <option value="INVESTIGATING">INVESTIGATING</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>

                {/* SMS Status Filter */}
                <select
                  value={smsStatusFilter}
                  onChange={(e) => setSmsStatusFilter(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-medium focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">{isSwahili ? 'Hali ya SMS' : 'SMS Status'}</option>
                  <option value="SENT">SENT</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="FAILED">FAILED</option>
                  <option value="QUEUED">QUEUED</option>
                </select>

                {/* Date Filters */}
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-medium focus:outline-none focus:border-amber-500"
                  title="Start Date"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-medium focus:outline-none focus:border-amber-500"
                  title="End Date"
                />

                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
                >
                  {isSwahili ? 'Chuja' : 'Filter'}
                </button>
              </div>
            </form>
          </div>

          {/* Table Container */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-4 px-4">{isSwahili ? 'Oda' : 'Order'}</th>
                    <th className="py-4 px-4">{isSwahili ? 'Mteja' : 'Customer'}</th>
                    <th className="py-4 px-4">{isSwahili ? 'Muuzaji' : 'Merchant'}</th>
                    <th className="py-4 px-4">{isSwahili ? 'Tarehe ya Uwasilishaji' : 'Delivered At'}</th>
                    <th className="py-4 px-4">{isSwahili ? 'Hali ya SMS' : 'SMS Status'}</th>
                    <th className="py-4 px-4">{isSwahili ? 'Jibu la Mteja' : 'Customer Response'}</th>
                    <th className="py-4 px-4">{isSwahili ? 'Hali ya Kesi' : 'Follow-Up Case'}</th>
                    <th className="py-4 px-4">{isSwahili ? 'Mhudumu' : 'Assigned'}</th>
                    <th className="py-4 px-4 text-right">{isSwahili ? 'Vitendo' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                        <span>{isSwahili ? 'Inapakia rekodi...' : 'Loading confirmation records...'}</span>
                      </td>
                    </tr>
                  ) : confirmations.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="font-bold text-white text-sm">
                          {isSwahili ? 'Hakuna rekodi zilizopatikana' : 'No receipt confirmation records found'}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {isSwahili
                            ? 'Oda zilizofikishwa zitatokea hapa kiotomatiki pindi SMS inapopelekwa.'
                            : 'Delivered orders will automatically trigger confirmation SMS and display here.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    confirmations.map((item) => {
                      const isYes = item.customer_response === 'RECEIVED';
                      const isNo = item.customer_response === 'NOT_RECEIVED';
                      const isAwaiting = !item.customer_response;

                      return (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-white">
                            #{item.order.order_number}
                            <span className="block text-[10px] font-normal text-slate-400 truncate max-w-[120px]">
                              {item.order.product_name}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-200">{item.order.customer_name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{item.order.customer_phone}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-300">{item.merchant?.business_name}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                            {item.order.delivered_at
                              ? new Date(item.order.delivered_at).toLocaleDateString(locale, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                item.sms_status === 'SENT' || item.sms_status === 'DELIVERED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : item.sms_status === 'FAILED'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {item.sms_type === 'RESENT' && <RefreshCw className="w-2.5 h-2.5" />}
                              {item.sms_status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {isYes && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#16794B]/20 text-emerald-400 border border-[#16794B]/30">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                {isSwahili ? 'Amepokea' : 'Received'}
                              </span>
                            )}
                            {isNo && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#D64545]/20 text-rose-400 border border-[#D64545]/30">
                                <XCircle className="w-3 h-3 text-rose-400" />
                                {isSwahili ? 'Hajapokea' : 'Not Received'}
                              </span>
                            )}
                            {isAwaiting && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                                <Clock className="w-3 h-3 text-amber-400" />
                                {isSwahili ? 'Inasubiriwa' : 'Awaiting'}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {item.followup_status ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                  item.followup_status === 'OPEN'
                                    ? 'bg-rose-500 text-slate-950 font-black'
                                    : item.followup_status === 'INVESTIGATING'
                                    ? 'bg-amber-500 text-slate-950 font-black'
                                    : 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                                }`}
                              >
                                {item.followup_status}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                            {item.assigned_staff || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1.5">
                            <button
                              onClick={() => openInvestigationModal(item)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] transition-colors"
                            >
                              {item.followup_status ? (isSwahili ? 'Kesi' : 'Case') : (isSwahili ? 'Angalia' : 'View')}
                            </button>

                            {isAwaiting && (
                              <button
                                onClick={() => handleResendSMS(item)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold text-[11px] transition-colors"
                                title="Resend confirmation SMS"
                              >
                                {isSwahili ? 'Tuma Tena' : 'Resend'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>
                  {isSwahili ? 'Jumla ya rekodi: ' : 'Total records: '} {pagination.total}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold"
                  >
                    {isSwahili ? 'Iliyopita' : 'Previous'}
                  </button>
                  <span className="font-mono text-white">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    disabled={pagination.page >= 1 && pagination.page >= pagination.totalPages}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold"
                  >
                    {isSwahili ? 'Inayofuata' : 'Next'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Settings Tab */
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-4xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-400" />
              <span>{isSwahili ? 'Mipangilio ya Uthibitisho wa Kupokea Oda' : 'Receipt Confirmation & Bulk SMS Policies'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isSwahili
                ? 'Sanidi ujumbe unaotumwa kwa wateja, ucheleweshaji wa SMS baada ya mzigo kufikishwa, na uwezeshaji wa kiotomatiki.'
                : 'Configure automated confirmation trigger behavior, delivery delays, reminders, and multilingual message templates.'}
            </p>
          </div>

          {settingsLoading ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
              <span>{isSwahili ? 'Inapakia mipangilio...' : 'Loading settings...'}</span>
            </div>
          ) : settings ? (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              {settingsSaved && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{isSwahili ? 'Mipangilio imehifadhiwa kikamilifu!' : 'Settings updated and saved successfully!'}</span>
                </div>
              )}

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">
                      {isSwahili ? 'Uthibitisho wa Kiotomatiki' : 'Automatic Confirmation SMS'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {isSwahili
                        ? 'Tuma SMS pindi mzigo unapofikishwa'
                        : 'Send SMS immediately upon DELIVERED status'}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.auto_confirm_enabled}
                    onChange={(e) =>
                      setSettings({ ...settings, auto_confirm_enabled: e.target.checked })
                    }
                    className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <label className="text-xs font-bold text-white block">
                    {isSwahili ? 'Ucheleweshaji wa Kutuma (Sekunde)' : 'Sending Delay After Delivery (Seconds)'}
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isSwahili ? 'Muda wa kusubiri kabla ya kutuma SMS' : 'Grace period before SMS dispatch'}
                  </p>
                  <input
                    type="number"
                    min="0"
                    max="3600"
                    value={settings.send_delay_seconds || 0}
                    onChange={(e) =>
                      setSettings({ ...settings, send_delay_seconds: parseInt(e.target.value, 10) || 0 })
                    }
                    className="mt-2 w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              {/* Message Templates */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
                  {isSwahili ? 'Vielelezo vya SMS (Templates)' : 'Multilingual SMS Message Templates'}
                </h3>

                {/* Confirmation Prompt Template */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Confirmation SMS (English)
                    </label>
                    <textarea
                      rows={3}
                      value={settings.template_en || ''}
                      onChange={(e) => setSettings({ ...settings, template_en: e.target.value })}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-500">Variables: {'{{customerName}}'}, {'{{orderNumber}}'}, {'{{confirmationLink}}'}</span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Confirmation SMS (Kiswahili)
                    </label>
                    <textarea
                      rows={3}
                      value={settings.template_sw || ''}
                      onChange={(e) => setSettings({ ...settings, template_sw: e.target.value })}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-500">Variables: {'{{customerName}}'}, {'{{orderNumber}}'}, {'{{confirmationLink}}'}</span>
                  </div>
                </div>

                {/* Thank-you template */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-emerald-400 block mb-1">
                      Thank-You SMS on YES (English)
                    </label>
                    <textarea
                      rows={2}
                      value={settings.thank_you_en || ''}
                      onChange={(e) => setSettings({ ...settings, thank_you_en: e.target.value })}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-emerald-400 block mb-1">
                      Thank-You SMS on YES (Kiswahili)
                    </label>
                    <textarea
                      rows={2}
                      value={settings.thank_you_sw || ''}
                      onChange={(e) => setSettings({ ...settings, thank_you_sw: e.target.value })}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Investigation template */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-rose-400 block mb-1">
                      Investigation SMS on NO (English)
                    </label>
                    <textarea
                      rows={2}
                      value={settings.investigation_en || ''}
                      onChange={(e) => setSettings({ ...settings, investigation_en: e.target.value })}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-rose-400 block mb-1">
                      Investigation SMS on NO (Kiswahili)
                    </label>
                    <textarea
                      rows={2}
                      value={settings.investigation_sw || ''}
                      onChange={(e) => setSettings({ ...settings, investigation_sw: e.target.value })}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSwahili ? 'Hifadhi Mipangilio' : 'Save Configuration'}</span>
                </button>
              </div>
            </form>
          ) : null}
        </div>
      )}

      {/* Investigation & Case Workflow Modal */}
      {modalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                  <span>
                    {isSwahili ? 'Uchunguzi wa Oda #' : 'Delivery Investigation: Order #'}
                    {selectedItem.order.order_number}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedItem.merchant?.business_name} • {selectedItem.order.customer_name} ({selectedItem.order.customer_phone})
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {actionSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                {actionSuccess}
              </div>
            )}

            {/* Order & Delivery Details Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase">{isSwahili ? 'Bidhaa' : 'Product'}</span>
                <p className="font-bold text-white truncate">{selectedItem.order.product_name}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase">{isSwahili ? 'Anwani' : 'Address'}</span>
                <p className="font-bold text-white truncate">{selectedItem.order.delivery_address}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase">{isSwahili ? 'Dereva' : 'Driver'}</span>
                <p className="font-bold text-white">
                  {selectedItem.order.driver_name || '—'} {selectedItem.order.driver_phone ? `(${selectedItem.order.driver_phone})` : ''}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase">{isSwahili ? 'Jibu la Mteja' : 'Customer Answer'}</span>
                <p className={`font-black ${selectedItem.customer_response === 'RECEIVED' ? 'text-emerald-400' : selectedItem.customer_response === 'NOT_RECEIVED' ? 'text-rose-400' : 'text-amber-400'}`}>
                  {selectedItem.customer_response || (isSwahili ? 'Bado hajajibu' : 'Awaiting Reply')}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase">{isSwahili ? 'Muda wa Jibu' : 'Response Time'}</span>
                <p className="text-slate-300">
                  {selectedItem.responded_at ? new Date(selectedItem.responded_at).toLocaleString(locale) : '—'}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase">{isSwahili ? 'Hali ya SMS' : 'SMS Status'}</span>
                <p className="text-slate-300">{selectedItem.sms_status}</p>
              </div>
            </div>

            {/* Investigation Notes History */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {isSwahili ? 'Kumbukumbu za Uchunguzi (Notes History)' : 'Investigation Notes & Audit Trail'}
              </span>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 max-h-48 overflow-y-auto space-y-3">
                {(() => {
                  let notes: any[] = [];
                  try {
                    if (selectedItem.investigation_notes) {
                      notes = JSON.parse(selectedItem.investigation_notes);
                    }
                  } catch {}

                  if (notes.length === 0) {
                    return (
                      <p className="text-xs text-slate-500 italic text-center py-2">
                        {isSwahili ? 'Hakuna maelezo yaliyorekodiwa bado.' : 'No investigation notes recorded yet.'}
                      </p>
                    );
                  }

                  return notes.map((n: any, idx: number) => (
                    <div key={n.id || idx} className="text-xs border-b border-slate-800/80 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-bold text-amber-400">{n.author} ({n.role})</span>
                        <span>{new Date(n.created_at).toLocaleString(locale)}</span>
                      </div>
                      <p className="text-slate-200 mt-1">{n.text}</p>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Form to update case */}
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    {isSwahili ? 'Hali ya Kesi (Status)' : 'Case Status'}
                  </label>
                  <select
                    value={caseStatus}
                    onChange={(e) => setCaseStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="OPEN">OPEN (Wazi)</option>
                    <option value="INVESTIGATING">INVESTIGATING (Inachunguzwa)</option>
                    <option value="RESOLVED">RESOLVED (Imetatuliwa)</option>
                    <option value="CLOSED">CLOSED (Imefungwa)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    {isSwahili ? 'Mhudumu Aliyepangiwa' : 'Assign Staff Member'}
                  </label>
                  <input
                    type="text"
                    value={assignedStaff}
                    placeholder="e.g. Alex M., Support Team"
                    onChange={(e) => setAssignedStaff(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  {isSwahili ? 'Ongeza Maelezo ya Uchunguzi (New Note)' : 'Add Investigation Note'}
                </label>
                <input
                  type="text"
                  value={newNote}
                  placeholder={isSwahili ? 'Mfano: Nimeongea na dereva, ameacha mzigo kwa mlinzi...' : 'e.g. Called driver, packet dropped at gate reception...'}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              {(caseStatus === 'RESOLVED' || caseStatus === 'CLOSED') && (
                <div>
                  <label className="text-xs font-bold text-emerald-400 block mb-1">
                    {isSwahili ? 'Maelezo ya Utatuzi (Resolution Notes)' : 'Resolution Notes'}
                  </label>
                  <textarea
                    rows={2}
                    value={resolutionNotes}
                    placeholder={isSwahili ? 'Eleza jinsi suala lilivyotatuliwa...' : 'Document how the case was successfully resolved...'}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  {isSwahili ? 'Tuma SMS ya Ufuatiliaji kwa Mteja (Hiari)' : 'Send Follow-Up SMS to Customer (Optional)'}
                </label>
                <input
                  type="text"
                  value={customerMessage}
                  placeholder={isSwahili ? 'Ujumbe utakaotumwa moja kwa moja kwenye simu ya mteja...' : 'Optional message dispatched directly to customer phone...'}
                  onChange={(e) => setCustomerMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
              >
                {isSwahili ? 'Funga' : 'Close'}
              </button>

              <button
                type="button"
                onClick={handleSaveCaseUpdate}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-colors"
              >
                {actionLoading ? 'Saving...' : isSwahili ? 'Hifadhi Mabadiliko' : 'Save Updates'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
