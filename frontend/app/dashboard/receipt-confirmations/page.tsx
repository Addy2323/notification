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
  Eye,
  FileText,
  Truck,
  Phone,
  Sparkles,
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
}

export default function MerchantReceiptConfirmationsPage() {
  const { t, locale } = useLanguage();
  const isSwahili = locale === 'sw';

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

      const [listRes, statsRes] = await Promise.all([
        fetchApi(`/receipt-confirmations/merchant/list?${queryParams.toString()}`),
        fetchApi('/receipt-confirmations/merchant/stats'),
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

  useEffect(() => {
    loadData();
  }, [pagination.page, responseFilter, caseFilter]);

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
        await fetchApi(`/receipt-confirmations/merchant/${selectedItem.id}/notes`, {
          method: 'POST',
          body: JSON.stringify({ note: newNote }),
        });
      }

      const updated = await fetchApi(`/receipt-confirmations/merchant/${selectedItem.id}/case`, {
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
      await fetchApi(`/receipt-confirmations/merchant/${item.id}/resend`, { method: 'POST' });
      alert(isSwahili ? 'SMS ya uthibitisho imetumwa upya!' : 'Confirmation SMS resent successfully!');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to resend SMS');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-[#16794B]" />
            <span>{isSwahili ? 'Uthibitisho wa Kupokea Mzigo' : 'Customer Receipt Confirmations'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isSwahili
              ? 'Fuatilia wateja waliothibitisha kupokea mizigo yao au waliotoa taarifa ya kutopokea oda.'
              : 'Track whether customers received their completed deliveries and manage resolution workflows.'}
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all shadow-sm active:scale-95 disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-500' : ''}`} />
          <span>{isSwahili ? 'Sasisha' : 'Refresh'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block truncate">
            {isSwahili ? 'Oda Zilizofikishwa' : 'Delivered Orders'}
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{kpis.total_eligible_orders}</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block truncate">
            {isSwahili ? 'SMS Zilizotumwa' : 'SMS Sent'}
          </span>
          <p className="text-2xl font-black text-orange-600 mt-1 font-mono">{kpis.confirmation_sms_sent}</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block truncate">
            {isSwahili ? 'Wamepokea (Ndiyo)' : 'Confirmed Received'}
          </span>
          <p className="text-2xl font-black text-emerald-600 mt-1 font-mono">{kpis.confirmed_received}</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block truncate">
            {isSwahili ? 'Hawajapokea (Hapana)' : 'Reported Non-Receipt'}
          </span>
          <p className="text-2xl font-black text-rose-600 mt-1 font-mono">{kpis.reported_not_received}</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block truncate">
            {isSwahili ? 'Inasubiri Majibu' : 'Awaiting Reply'}
          </span>
          <p className="text-2xl font-black text-slate-600 mt-1 font-mono">{kpis.awaiting_response}</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block truncate">
            {isSwahili ? 'Kesi za Uchunguzi' : 'Active Cases'}
          </span>
          <p className="text-2xl font-black text-amber-600 mt-1 font-mono">{kpis.open_followup_cases}</p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                isSwahili
                  ? 'Tafuta kwa nambari ya oda, jina la mteja, nambari ya simu, au bidhaa...'
                  : 'Search by order #, customer name, phone, or product...'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={responseFilter}
              onChange={(e) => setResponseFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium focus:outline-none focus:border-orange-500"
            >
              <option value="ALL">{isSwahili ? 'Majibu Yote' : 'All Responses'}</option>
              <option value="RECEIVED">{isSwahili ? '✓ Amepokea (RECEIVED)' : '✓ Confirmed Received'}</option>
              <option value="NOT_RECEIVED">{isSwahili ? '✕ Hajapokea (NOT_RECEIVED)' : '✕ Reported Non-Receipt'}</option>
              <option value="AWAITING">{isSwahili ? '⏳ Inasubiriwa (AWAITING)' : '⏳ Awaiting Response'}</option>
            </select>

            <select
              value={caseFilter}
              onChange={(e) => setCaseFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium focus:outline-none focus:border-orange-500"
            >
              <option value="ALL">{isSwahili ? 'Hali ya Kesi' : 'Case Status'}</option>
              <option value="OPEN">OPEN</option>
              <option value="INVESTIGATING">INVESTIGATING</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
            >
              {isSwahili ? 'Chuja' : 'Filter'}
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-4 px-4">{isSwahili ? 'Oda' : 'Order'}</th>
                <th className="py-4 px-4">{isSwahili ? 'Mteja' : 'Customer'}</th>
                <th className="py-4 px-4">{isSwahili ? 'Tarehe ya Kufikishwa' : 'Delivered Date'}</th>
                <th className="py-4 px-4">{isSwahili ? 'Hali ya SMS' : 'SMS Status'}</th>
                <th className="py-4 px-4">{isSwahili ? 'Jibu la Mteja' : 'Customer Answer'}</th>
                <th className="py-4 px-4">{isSwahili ? 'Kesi ya Uchunguzi' : 'Follow-up Case'}</th>
                <th className="py-4 px-4 text-right">{isSwahili ? 'Vitendo' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-orange-500 mb-2" />
                    <span>{isSwahili ? 'Inapakia rekodi...' : 'Loading confirmation records...'}</span>
                  </td>
                </tr>
              ) : confirmations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-800 text-sm">
                      {isSwahili ? 'Hakuna rekodi zilizopatikana' : 'No receipt confirmation records found'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {isSwahili
                        ? 'Oda zako zinapofikishwa, SMS ya uthibitisho hutumwa kiotomatiki kwa mteja.'
                        : 'When your orders are marked delivered, confirmation SMS is automatically sent to the customer.'}
                    </p>
                  </td>
                </tr>
              ) : (
                confirmations.map((item) => {
                  const isYes = item.customer_response === 'RECEIVED';
                  const isNo = item.customer_response === 'NOT_RECEIVED';
                  const isAwaiting = !item.customer_response;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        #{item.order.order_number}
                        <span className="block text-[10px] font-normal text-slate-500 truncate max-w-[130px]">
                          {item.order.product_name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">{item.order.customer_name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{item.order.customer_phone}</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
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
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.sms_status === 'FAILED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {item.sms_type === 'RESENT' && <RefreshCw className="w-2.5 h-2.5" />}
                          {item.sms_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {isYes && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#16794B]/10 text-[#16794B] border border-[#16794B]/20">
                            <CheckCircle2 className="w-3 h-3 text-[#16794B]" />
                            {isSwahili ? 'Amepokea' : 'Received'}
                          </span>
                        )}
                        {isNo && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#D64545]/10 text-[#C53030] border border-[#D64545]/20">
                            <XCircle className="w-3 h-3 text-[#C53030]" />
                            {isSwahili ? 'Hajapokea' : 'Not Received'}
                          </span>
                        )}
                        {isAwaiting && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            <Clock className="w-3 h-3 text-amber-500" />
                            {isSwahili ? 'Inasubiriwa' : 'Awaiting'}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {item.followup_status ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                              item.followup_status === 'OPEN'
                                ? 'bg-rose-100 text-rose-800 font-bold border border-rose-200'
                                : item.followup_status === 'INVESTIGATING'
                                ? 'bg-amber-100 text-amber-800 font-bold border border-amber-200'
                                : 'bg-teal-50 text-teal-800 font-bold border border-teal-200'
                            }`}
                          >
                            {item.followup_status}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => openInvestigationModal(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] transition-colors"
                        >
                          {item.followup_status ? (isSwahili ? 'Kesi' : 'Case') : (isSwahili ? 'Angalia' : 'View')}
                        </button>

                        {isAwaiting && (
                          <button
                            onClick={() => handleResendSMS(item)}
                            className="px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-[11px] border border-orange-200 transition-colors"
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
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              {isSwahili ? 'Jumla ya rekodi: ' : 'Total records: '} {pagination.total}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 font-bold"
              >
                {isSwahili ? 'Iliyopita' : 'Previous'}
              </button>
              <span className="font-mono text-slate-700">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 font-bold"
              >
                {isSwahili ? 'Inayofuata' : 'Next'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Investigation Modal */}
      {modalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-orange-500" />
                  <span>
                    {isSwahili ? 'Taarifa za Oda #' : 'Order Delivery Review: #'}
                    {selectedItem.order.order_number}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedItem.order.customer_name} • {selectedItem.order.customer_phone}
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800"
              >
                ✕
              </button>
            </div>

            {actionSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                {actionSuccess}
              </div>
            )}

            {/* Order snapshot */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{isSwahili ? 'Bidhaa' : 'Product'}</span>
                <p className="font-bold text-slate-800 truncate">{selectedItem.order.product_name}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{isSwahili ? 'Anwani' : 'Address'}</span>
                <p className="font-bold text-slate-800 truncate">{selectedItem.order.delivery_address}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{isSwahili ? 'Dereva' : 'Driver'}</span>
                <p className="font-bold text-slate-800">
                  {selectedItem.order.driver_name || '—'} {selectedItem.order.driver_phone ? `(${selectedItem.order.driver_phone})` : ''}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{isSwahili ? 'Jibu la Mteja' : 'Customer Response'}</span>
                <p className={`font-black ${selectedItem.customer_response === 'RECEIVED' ? 'text-emerald-600' : selectedItem.customer_response === 'NOT_RECEIVED' ? 'text-rose-600' : 'text-amber-600'}`}>
                  {selectedItem.customer_response || (isSwahili ? 'Inasubiri jibu' : 'Awaiting Reply')}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{isSwahili ? 'Muda wa Jibu' : 'Response Time'}</span>
                <p className="text-slate-600">
                  {selectedItem.responded_at ? new Date(selectedItem.responded_at).toLocaleString(locale) : '—'}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{isSwahili ? 'Hali ya SMS' : 'SMS Delivery'}</span>
                <p className="text-slate-600">{selectedItem.sms_status}</p>
              </div>
            </div>

            {/* Notes history */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {isSwahili ? 'Kumbukumbu za Uchunguzi (Notes History)' : 'Investigation Notes History'}
              </span>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 max-h-40 overflow-y-auto space-y-2.5">
                {(() => {
                  let notes: any[] = [];
                  try {
                    if (selectedItem.investigation_notes) {
                      notes = JSON.parse(selectedItem.investigation_notes);
                    }
                  } catch {}

                  if (notes.length === 0) {
                    return (
                      <p className="text-xs text-slate-400 italic text-center py-2">
                        {isSwahili ? 'Hakuna maelezo yaliyorekodiwa bado.' : 'No notes recorded yet.'}
                      </p>
                    );
                  }

                  return notes.map((n: any, idx: number) => (
                    <div key={n.id || idx} className="text-xs border-b border-slate-200/60 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span className="font-bold text-slate-800">{n.author} ({n.role})</span>
                        <span>{new Date(n.created_at).toLocaleString(locale)}</span>
                      </div>
                      <p className="text-slate-700 mt-1">{n.text}</p>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Update form */}
            <div className="space-y-3.5 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {isSwahili ? 'Hali ya Kesi' : 'Case Status'}
                  </label>
                  <select
                    value={caseStatus}
                    onChange={(e) => setCaseStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                  >
                    <option value="OPEN">OPEN (Wazi)</option>
                    <option value="INVESTIGATING">INVESTIGATING (Inachunguzwa)</option>
                    <option value="RESOLVED">RESOLVED (Imetatuliwa)</option>
                    <option value="CLOSED">CLOSED (Imefungwa)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {isSwahili ? 'Mhudumu' : 'Staff Assigned'}
                  </label>
                  <input
                    type="text"
                    value={assignedStaff}
                    placeholder="e.g. Sarah / Store Manager"
                    onChange={(e) => setAssignedStaff(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {isSwahili ? 'Ongeza Maelezo ya Uchunguzi' : 'Add Investigation Note'}
                </label>
                <input
                  type="text"
                  value={newNote}
                  placeholder={isSwahili ? 'Mfano: Nimepiga simu kwa mteja, mzigo uko ofisini...' : 'e.g. Spoke with customer, verified driver location...'}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                />
              </div>

              {(caseStatus === 'RESOLVED' || caseStatus === 'CLOSED') && (
                <div>
                  <label className="text-xs font-bold text-emerald-700 block mb-1">
                    {isSwahili ? 'Maelezo ya Utatuzi' : 'Resolution Notes'}
                  </label>
                  <textarea
                    rows={2}
                    value={resolutionNotes}
                    placeholder={isSwahili ? 'Eleza utatuzi uliopatikana...' : 'Document resolution...'}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {isSwahili ? 'Tuma Ujumbe wa SMS kwa Mteja (Hiari)' : 'Send Follow-Up SMS to Customer (Optional)'}
                </label>
                <input
                  type="text"
                  value={customerMessage}
                  placeholder={isSwahili ? 'Ujumbe utakaotumwa moja kwa moja kwa mteja...' : 'Direct message dispatched to customer...'}
                  onChange={(e) => setCustomerMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 transition-colors"
              >
                {isSwahili ? 'Funga' : 'Close'}
              </button>

              <button
                type="button"
                onClick={handleSaveCaseUpdate}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-black transition-colors"
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
