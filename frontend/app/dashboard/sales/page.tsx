'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { DollarSign, Search, Calendar, Filter, ArrowUpRight, TrendingUp, TrendingDown, Layers, ChevronDown, ChevronUp, Download, RefreshCw, ShoppingBag, Truck } from 'lucide-react';

export default function SalesLedgerPage() {
  const [salesData, setSalesData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('TODAY');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const loadSales = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (range) params.append('range', range);
      if (searchQuery) params.append('q', searchQuery);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetchApi(`/sales?${params.toString()}`);
      setSalesData(res);
    } catch (err) {
      console.error('Failed to load sales ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, [range, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadSales();
  };

  const summary = salesData?.summary || {
    totalOrders: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    deliveredCount: 0,
    pendingCount: 0,
  };

  const orders = salesData?.orders || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF5500] to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Digital Sales Ledger</h1>
              <p className="text-sm text-slate-400">Real-time revenue, product cost & profit calculations</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadSales}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-sm transition flex items-center gap-2 border border-slate-700"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider uppercase text-slate-500">Total Sales Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            TZS {summary.totalRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">{summary.totalOrders} total recorded orders</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider uppercase text-slate-500">Product Cost</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            TZS {summary.totalCost.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">Cost of goods sold</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider uppercase text-slate-500">Gross Profit</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">
            TZS {summary.totalProfit.toLocaleString()}
          </p>
          <p className="text-xs text-emerald-700 font-medium mt-1">Net profit after item cost</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider uppercase text-slate-500">Delivery Status</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-900">{summary.deliveredCount}</span>
            <span className="text-xs font-semibold text-emerald-600 uppercase">Delivered</span>
            <span className="text-slate-300">/</span>
            <span className="text-lg font-bold text-amber-600">{summary.pendingCount}</span>
            <span className="text-xs font-medium text-slate-500">Pending</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Fulfillment efficiency</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Period Selector Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'TODAY', label: 'Today' },
            { id: 'YESTERDAY', label: 'Yesterday' },
            { id: 'THIS_WEEK', label: 'This Week' },
            { id: 'THIS_MONTH', label: 'This Month' },
            { id: 'THIS_YEAR', label: 'This Year' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setRange(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                range === p.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Search & Status Filter */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search order #, customer, product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5500] focus:border-transparent transition"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
          >
            <option value="">All Statuses</option>
            <option value="DELIVERED">Delivered</option>
            <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
            <option value="DRIVER_ASSIGNED">Driver Assigned</option>
            <option value="PENDING">Pending</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </form>
      </div>

      {/* Digital Sales Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Order ID</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Product / Line Items</th>
                <th className="py-3.5 px-4 text-right">Revenue (TZS)</th>
                <th className="py-3.5 px-4 text-right">Cost (TZS)</th>
                <th className="py-3.5 px-4 text-right">Profit (TZS)</th>
                <th className="py-3.5 px-4">Driver</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Details</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#FF5500]" />
                    Loading sales records...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    No sales records found for the selected criteria.
                  </td>
                </tr>
              ) : (
                orders.map((ord: any) => {
                  const rev = Number(ord.total_revenue || ord.amount || 0);
                  const cost = Number(ord.total_cost || 0);
                  const profit = ord.gross_profit !== null && ord.gross_profit !== undefined ? Number(ord.gross_profit) : 0;
                  const isExpanded = expandedOrderId === ord.id;

                  return (
                    <React.Fragment key={ord.id}>
                      <tr className="hover:bg-slate-50 transition cursor-pointer" onClick={() => setExpandedOrderId(isExpanded ? null : ord.id)}>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{ord.order_number}</td>
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(ord.created_at).toLocaleDateString()} {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800">{ord.customer_name}</p>
                          <p className="text-[11px] text-slate-400">{ord.customer_phone}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-slate-800 max-w-xs truncate">{ord.product_name}</p>
                          {ord.items && ord.items.length > 0 && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                              {ord.items.length} item{ord.items.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                          {rev.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-500">
                          {cost > 0 ? cost.toLocaleString() : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                          {profit > 0 ? profit.toLocaleString() : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {ord.driver_name || <span className="text-slate-300 italic">Unassigned</span>}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ord.status === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.status === 'CANCELLED' || ord.status === 'FAILED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ord.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4 mx-auto" /> : <ChevronDown className="w-4 h-4 mx-auto" />}
                        </td>
                      </tr>

                      {/* Expanded Order Items Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50 border-t border-b border-slate-200">
                          <td colSpan={10} className="p-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                                <ShoppingBag className="w-4 h-4 text-[#FF5500]" />
                                Immutable Order Line Items (Snapshot at Time of Sale)
                              </h4>

                              {ord.items && ord.items.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                  {ord.items.map((it: any) => (
                                    <div key={it.id} className="py-2 flex items-center justify-between text-xs">
                                      <div>
                                        <span className="font-bold text-slate-800">{it.product_name_snapshot}</span>
                                        {it.product_sku_snapshot && (
                                          <span className="ml-2 text-[10px] text-slate-400 font-mono">SKU: {it.product_sku_snapshot}</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-6 text-slate-600">
                                        <span>Qty: <strong>{it.quantity}</strong></span>
                                        <span>Selling Price: TZS <strong>{Number(it.unit_selling_price).toLocaleString()}</strong></span>
                                        <span>Unit Cost: TZS <strong>{it.unit_cost_price ? Number(it.unit_cost_price).toLocaleString() : '-'}</strong></span>
                                        <span className="font-bold text-slate-900">Subtotal: TZS {Number(it.subtotal).toLocaleString()}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-slate-400 italic text-xs">Single line item order: {ord.product_name}</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
