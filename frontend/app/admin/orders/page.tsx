'use client';

import React, { useState, useEffect } from 'react';
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

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/admin/reports/excel?reportType=SALES'); // We can fetch orders list
      // Or fetch from overview/orders API
      const overview = await fetchApi('/admin/overview?period=THIS_MONTH');
      // For global orders query, we fetch via search or merchant profile APIs
      const searchRes = await fetchApi(`/admin/search?q=${encodeURIComponent(searchQuery || 'a')}`);
      setOrders(searchRes?.orders || []);
    } catch (err) {
      console.error('Failed to load global orders:', err);
    } fontally: {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

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

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto">
          {['ALL', 'PENDING', 'ON_THE_WAY', 'DELIVERED', 'FAILED', 'CANCELLED'].map((st) => (
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

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search order #, customer, phone, product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
                      TZS {Number(o.total_revenue || o.amount || 0).toLocaleString()}
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
                        {o.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedOrder(o)}
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

      {/* Order Detail Timeline Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
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
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Customer Details</p>
                <p className="font-bold text-white mt-1">{selectedOrder.customer_name}</p>
                <p className="text-[10px] text-slate-400 font-mono">{selectedOrder.customer_phone}</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Product & Financials</p>
                <p className="font-bold text-white mt-1">{selectedOrder.product_name}</p>
                <p className="text-amber-400 font-mono font-bold mt-0.5">
                  Revenue: TZS {Number(selectedOrder.total_revenue || selectedOrder.amount || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
