'use client';


import { useLanguage, T } from '@/components/LanguageProvider';
import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import {
  ShoppingBag,
  Search,
  Filter,
  Eye,
  Phone,
  User,
  Package,
  Clock,
  CheckCircle2,
  X,
  AlertCircle,
  Truck,
  RefreshCw,
  FileText,
  Download,
  Send,
} from 'lucide-react';
import { fetchApi, API_BASE } from '@/lib/api';

export default function GlobalOrdersPage() {
  const { t, label: uiLabel, locale } = useLanguage();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>({ total: 0, totalPages: 0 });
  const [error, setError] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [orderActionBusy, setOrderActionBusy] = useState(false);
  const listRequest = useRef(0);
  const detailRequest = useRef(0);
  const money = (value: any) => value === null || value === undefined ? t("common.not_recorded") : `TZS ${Number(value).toLocaleString(locale)}`;
  const handleCompleteAdminOrder = async (orderId: string) => {
    setOrderActionBusy(true);
    try {
      await fetchApi(`/admin/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      await openOrder(orderId);
      await loadOrders();
      Swal.fire({ icon: 'success', title: 'Order Completed', text: 'Confirmation receipt & SMS workflow triggered.' });
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Action Failed', text: err.message || 'Could not complete order' });
    } finally {
      setOrderActionBusy(false);
    }
  };
  const handleResendAdminReceiptSms = async (orderId: string) => {
    setOrderActionBusy(true);
    try {
      const res = await fetchApi(`/orders/${encodeURIComponent(orderId)}/receipt/resend-sms`, {
        method: 'POST',
      });
      await openOrder(orderId);
      Swal.fire({
        icon: res?.smsSent ? 'success' : 'warning',
        title: res?.smsSent ? 'SMS Resent' : 'SMS Failed',
        text: res?.message || 'Receipt SMS request processed.',
      });
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Resend Failed', text: err.message || 'Failed to resend receipt SMS' });
    } finally {
      setOrderActionBusy(false);
    }
  };
  const handleOpenAdminReceiptPdf = async (orderId: string, receiptNumber?: string, inline = true) => {
    setOrderActionBusy(true);
    try {
      const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderId)}/receipt/pdf${inline ? '?inline=1' : ''}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load receipt PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (inline) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `Confirmation-Receipt-${receiptNumber || orderId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'PDF Unavailable', text: err.message || 'Failed to load PDF receipt' });
    } finally {
      setOrderActionBusy(false);
    }
  };
  const loadOrders = async () => {
    const id = ++listRequest.current;
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ search: searchQuery, status: statusFilter, page: String(page), limit: '25' });
      const result = await fetchApi(`/admin/orders?${params}`);
      if (id !== listRequest.current) return;
      setOrders(result.orders); setPagination(result.pagination);
    } catch (err: any) {
      if (id === listRequest.current) { setError(err.message || t("admin.failed_to_load_orders")); setOrders([]); }
    } finally { if (id === listRequest.current) setLoading(false); }
  };
  useEffect(() => {
    const timer = setTimeout(loadOrders, 250);
    return () => { clearTimeout(timer); listRequest.current++; };
  }, [statusFilter, searchQuery, page]);
  const openOrder = async (id: string) => {
    const request = ++detailRequest.current;
    setDetailLoading(true); setError(''); setSelectedOrder(null);
    try {
      const detail = await fetchApi(`/admin/orders/${encodeURIComponent(id)}`);
      if (request === detailRequest.current) setSelectedOrder(detail);
    } catch (err: any) { if (request === detailRequest.current) setError(err.message); }
    finally { if (request === detailRequest.current) setDetailLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-amber-400" />{' '}<T k="admin.global_platform_orders" />{' '}</h1>
          <p className="text-xs text-slate-400 mt-1">{' '}<T k="admin.monitor_orders_across_all_platform_merchants_track_status_timelines_and_inspect_fulfi" />{' '}</p>
        </div>
      </div>

      {error && <p role="alert" className="p-4 border border-rose-700 rounded-xl text-rose-300">{error}</p>}
      {detailLoading && <p role="status" className="text-amber-300"><T k="admin.loading_order_details" /></p>}
      <div className="flex justify-between text-sm text-slate-400"><span>{pagination.total}{' '}<T k="admin.platform_orders" /></span><button onClick={loadOrders} disabled={loading} className="text-amber-400"><T k="admin.refresh_orders" /></button></div>
      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
          {['ALL', 'PENDING', 'CONFIRMED', 'DRIVER_ASSIGNED', 'OUT_FOR_DELIVERY', 'ARRIVED', 'DELIVERED', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'].map((st) => (
            <button
              key={st}
              onClick={() => { setPage(1); setStatusFilter(st); }}
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

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t("admin.search_order_customer_phone_product")}
            value={searchQuery}
            onChange={(e) => { setPage(1); setSearchQuery(e.target.value); }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-4"><T k="common.order_2" /></th>
                <th className="p-4"><T k="common.merchant" /></th>
                <th className="p-4"><T k="common.customer" /></th>
                <th className="p-4"><T k="common.product" /></th>
                <th className="p-4"><T k="admin.revenue_tzs" /></th>
                <th className="p-4"><T k="common.status" /></th>
                <th className="p-4 text-right"><T k="common.actions" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />{' '}<T k="admin.loading_platform_orders" />{' '}</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">{' '}<T k="admin.no_orders_match_the_search_criteria" />{' '}</td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-850 transition-colors">
                    <td className="p-4 font-mono font-bold text-white">#{o.order_number}</td>
                    <td className="p-4 font-bold text-amber-400">{o.merchant?.business_name}</td>
                    <td className="p-4">
                      <p className="font-bold text-white">{o.customer_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{o.customer_phone}</p>
                    </td>
                    <td className="p-4">{o.product_name}</td>
                    <td className="p-4 font-mono font-bold text-emerald-400">
                      {money(o.net_revenue)}
                    </td>
                    <td className="p-4 font-bold">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] ${
                          o.status === 'DELIVERED' || o.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : o.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {uiLabel(o.payment_status === 'REFUNDED' ? 'REFUNDED' : o.status)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        aria-label={t("interactions.view_order_value0", { value0: (o.order_number) ?? '' })} onClick={() => openOrder(o.id)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 text-sm text-slate-300">
        <button disabled={loading || page <= 1} onClick={() => setPage(p => p - 1)}><T k="common.previous" /></button>
        <span><T k="common.page" />{' '}{page}{' '}<T k="common.of" />{' '}{Math.max(1, pagination.totalPages)}</span>
        <button disabled={loading || page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}><T k="common.next" /></button>
      </div>
      {/* Order Detail Timeline Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div role="dialog" aria-modal="true" aria-label={t("admin.order_details")} className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white"><T k="common.order_2" />{selectedOrder.order_number}</h3>
                <p className="text-xs text-amber-400 font-bold">{selectedOrder.merchant?.business_name}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <section className="text-slate-300 space-y-2">
                <h4 className="font-bold text-white"><T k="admin.products" /></h4>
                {selectedOrder.items?.length ? selectedOrder.items.map((item: any) => <p key={item.id}>{item.product_name_snapshot}{' '}<T k="admin.qty" />{' '}{item.quantity}{' '}<T k="admin.buying_unit" />{' '}{money(item.unit_cost_price)}{' '}<T k="admin.selling_unit" />{' '}{money(item.unit_selling_price)}{' '}<T k="admin.discount" />{' '}{money(item.discount)}</p>) : <p><T k="admin.no_line_item_prices_recorded_for_this_order" /></p>}
              </section>
              <section className="text-slate-300 space-y-2">
                <h4 className="font-bold text-white"><T k="admin.order_timeline" /></h4>
                {selectedOrder.events?.length ? selectedOrder.events.map((event: any) => {
                  let refund: any = {}; if (event.event_type === 'ORDER_REFUNDED') { try { refund = JSON.parse(event.metadata || '{}'); } catch {} }
                  return <div key={event.id}><p>{uiLabel(event.event_type.replaceAll('_', ' '))} ? {new Date(event.timestamp).toLocaleString(locale)} ? {uiLabel(event.actor_type)}</p>{event.event_type === 'ORDER_REFUNDED' && <p><T k="admin.reason" />{' '}{refund.reason} ? {refund.restocked ? t("common.returned_to_stock") : t("admin.cost_retained")}</p>}</div>;
                }) : <p><T k="admin.no_timeline_events_recorded" /></p>}
              </section>
              <section className="text-slate-300 space-y-2">
                <h4 className="font-bold text-white"><T k="common.notifications" /></h4>
                {selectedOrder.notifications?.length ? selectedOrder.notifications.map((notification: any) => <p key={notification.id}>{uiLabel(notification.event_type)} ? {uiLabel(notification.recipient_type)} ? {uiLabel(notification.status)} ? {new Date(notification.created_at).toLocaleString(locale)}{notification.failure_reason ? ` ? ${notification.failure_reason}` : ''}</p>) : <p><T k="admin.no_notifications_recorded" /></p>}
              </section>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <p className="text-[10px] text-slate-400 font-bold uppercase"><T k="admin.customer_details" /></p>
                <p className="font-bold text-white mt-1">{selectedOrder.customer_name}</p>
                <p className="text-[10px] text-slate-400 font-mono">{selectedOrder.customer_phone}</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <p className="text-[10px] text-slate-400 font-bold uppercase"><T k="admin.product_financials" /></p>
                <p className="font-bold text-white mt-1">{selectedOrder.product_name}</p>
                <p className="text-amber-400 font-mono font-bold mt-0.5">{' '}<T k="admin.net_revenue" />{' '}{money(selectedOrder.net_revenue)}
                </p>
                <p className="text-slate-300 mt-1"><T k="admin.buying_cost" />{' '}{money(selectedOrder.net_cost)}{' '}<T k="admin.gross_profit" />{' '}{money(selectedOrder.net_profit)}</p>
                <p className="text-slate-300 mt-1"><T k="admin.refund" />{' '}{money(selectedOrder.refund_amount)}{' '}<T k="admin.payment" />{' '}{uiLabel(selectedOrder.payment_status)}</p>
                <p className="text-slate-300 mt-1"><T k="admin.delivery" />{' '}{selectedOrder.delivery_address}</p>
                <p className="text-slate-300 mt-1"><T k="common.driver_2" />{' '}{selectedOrder.driver_name || t("common.unassigned")} {selectedOrder.driver_phone}</p>
                <p className="text-slate-300 mt-1"><T k="admin.created" />{' '}{new Date(selectedOrder.created_at).toLocaleString(locale)} ? {uiLabel(selectedOrder.status)}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Confirmation Receipt & PDF Operations</span>
                  </p>
                  {selectedOrder.confirmation_receipt && (
                    <span className="text-[10px] font-mono font-bold text-amber-400">
                      {selectedOrder.confirmation_receipt.receipt_number}
                    </span>
                  )}
                </div>

                {selectedOrder.confirmation_receipt ? (
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                    <div>
                      <span className="text-slate-500">Receipt Status: </span>
                      <strong className="text-white">{selectedOrder.confirmation_receipt.status}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">SMS Status: </span>
                      <strong className="text-white">{selectedOrder.confirmation_receipt.sms_status}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Generated: </span>
                      <span>{selectedOrder.confirmation_receipt.generated_at ? new Date(selectedOrder.confirmation_receipt.generated_at).toLocaleString(locale) : '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">SMS Sent / Delivered: </span>
                      <span>
                        {selectedOrder.confirmation_receipt.sms_delivered_at
                          ? `Delivered ${new Date(selectedOrder.confirmation_receipt.sms_delivered_at).toLocaleString(locale)}`
                          : selectedOrder.confirmation_receipt.sms_sent_at
                          ? `Sent ${new Date(selectedOrder.confirmation_receipt.sms_sent_at).toLocaleString(locale)}`
                          : '—'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    No confirmation receipt generated yet.
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
                    <button
                      type="button"
                      disabled={orderActionBusy}
                      onClick={() => handleCompleteAdminOrder(selectedOrder.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Complete Order</span>
                    </button>
                  )}

                  {(selectedOrder.status === 'COMPLETED' || selectedOrder.status === 'DELIVERED') && (
                    <>
                      <button
                        type="button"
                        disabled={orderActionBusy}
                        onClick={() =>
                          handleOpenAdminReceiptPdf(
                            selectedOrder.id,
                            selectedOrder.confirmation_receipt?.receipt_number,
                            true
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] disabled:opacity-50"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>Preview Receipt PDF</span>
                      </button>
                      <button
                        type="button"
                        disabled={orderActionBusy}
                        onClick={() =>
                          handleOpenAdminReceiptPdf(
                            selectedOrder.id,
                            selectedOrder.confirmation_receipt?.receipt_number,
                            false
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </button>
                      <button
                        type="button"
                        disabled={orderActionBusy || selectedOrder.confirmation_receipt?.status === 'REVOKED'}
                        onClick={() => handleResendAdminReceiptSms(selectedOrder.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Resend Receipt SMS</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
