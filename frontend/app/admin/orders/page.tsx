'use client';

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
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function GlobalOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>({ total: 0, totalPages: 0 });
  const [error, setError] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const listRequest = useRef(0);
  const detailRequest = useRef(0);
  const money = (value: any) => value === null || value === undefined ? 'Not recorded' : `TZS ${Number(value).toLocaleString()}`;
  const loadOrders = async () => {
    const id = ++listRequest.current;
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ search: searchQuery, status: statusFilter, page: String(page), limit: '25' });
      const result = await fetchApi(`/admin/orders?${params}`);
      if (id !== listRequest.current) return;
      setOrders(result.orders); setPagination(result.pagination);
    } catch (err: any) {
      if (id === listRequest.current) { setError(err.message || 'Failed to load orders'); setOrders([]); }
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
            <ShoppingBag className="w-6 h-6 text-amber-400" />
            Global Platform Orders
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitor orders across all platform merchants, track status timelines, and inspect fulfillment details.
          </p>
        </div>
      </div>

      {error && <p role="alert" className="p-4 border border-rose-700 rounded-xl text-rose-300">{error}</p>}
      {detailLoading && <p role="status" className="text-amber-300">Loading order details...</p>}
      <div className="flex justify-between text-sm text-slate-400"><span>{pagination.total} platform orders</span><button onClick={loadOrders} disabled={loading} className="text-amber-400">Refresh orders</button></div>
      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
          {['ALL', 'PENDING', 'CONFIRMED', 'DRIVER_ASSIGNED', 'OUT_FOR_DELIVERY', 'ARRIVED', 'DELIVERED', 'FAILED', 'CANCELLED', 'REFUNDED'].map((st) => (
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
            placeholder="Search order #, customer, phone, product..."
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
                <th className="p-4">Order #</th>
                <th className="p-4">Merchant</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Product</th>
                <th className="p-4">Revenue (TZS)</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                    Loading platform orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No orders match the search criteria.
                  </td>
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
                          o.status === 'DELIVERED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : o.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {o.payment_status === 'REFUNDED' ? 'REFUNDED' : o.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        aria-label={`View order ${o.order_number}`} onClick={() => openOrder(o.id)}
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
        <button disabled={loading || page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
        <span>Page {page} of {Math.max(1, pagination.totalPages)}</span>
        <button disabled={loading || page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
      </div>
      {/* Order Detail Timeline Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div role="dialog" aria-modal="true" aria-label="Order details" className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">Order #{selectedOrder.order_number}</h3>
                <p className="text-xs text-amber-400 font-bold">{selectedOrder.merchant?.business_name}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <section className="text-slate-300 space-y-2">
                <h4 className="font-bold text-white">Products</h4>
                {selectedOrder.items?.length ? selectedOrder.items.map((item: any) => <p key={item.id}>{item.product_name_snapshot} ? Qty {item.quantity} ? Buying/unit: {money(item.unit_cost_price)} ? Selling/unit: {money(item.unit_selling_price)} ? Discount: {money(item.discount)}</p>) : <p>No line-item prices recorded for this order.</p>}
              </section>
              <section className="text-slate-300 space-y-2">
                <h4 className="font-bold text-white">Order timeline</h4>
                {selectedOrder.events?.length ? selectedOrder.events.map((event: any) => {
                  let refund: any = {}; if (event.event_type === 'ORDER_REFUNDED') { try { refund = JSON.parse(event.metadata || '{}'); } catch {} }
                  return <div key={event.id}><p>{event.event_type.replaceAll('_', ' ')} ? {new Date(event.timestamp).toLocaleString()} ? {event.actor_type}</p>{event.event_type === 'ORDER_REFUNDED' && <p>Reason: {refund.reason} ? {refund.restocked ? 'Returned to stock' : 'Cost retained'}</p>}</div>;
                }) : <p>No timeline events recorded.</p>}
              </section>
              <section className="text-slate-300 space-y-2">
                <h4 className="font-bold text-white">Notifications</h4>
                {selectedOrder.notifications?.length ? selectedOrder.notifications.map((notification: any) => <p key={notification.id}>{notification.event_type} ? {notification.recipient_type} ? {notification.status} ? {new Date(notification.created_at).toLocaleString()}{notification.failure_reason ? ` ? ${notification.failure_reason}` : ''}</p>) : <p>No notifications recorded.</p>}
              </section>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Customer Details</p>
                <p className="font-bold text-white mt-1">{selectedOrder.customer_name}</p>
                <p className="text-[10px] text-slate-400 font-mono">{selectedOrder.customer_phone}</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Product & Financials</p>
                <p className="font-bold text-white mt-1">{selectedOrder.product_name}</p>
                <p className="text-amber-400 font-mono font-bold mt-0.5">
                  Net revenue: {money(selectedOrder.net_revenue)}
                </p>
                <p className="text-slate-300 mt-1">Buying cost: {money(selectedOrder.net_cost)} ? Gross profit: {money(selectedOrder.net_profit)}</p>
                <p className="text-slate-300 mt-1">Refund: {money(selectedOrder.refund_amount)} ? Payment: {selectedOrder.payment_status}</p>
                <p className="text-slate-300 mt-1">Delivery: {selectedOrder.delivery_address}</p>
                <p className="text-slate-300 mt-1">Driver: {selectedOrder.driver_name || 'Unassigned'} {selectedOrder.driver_phone}</p>
                <p className="text-slate-300 mt-1">Created: {new Date(selectedOrder.created_at).toLocaleString()} ? {selectedOrder.status}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
