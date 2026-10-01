'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import {
  Truck, Plus, Search, Filter, RefreshCw, Clock, CheckCircle2, MapPin, XCircle,
  ExternalLink, User, Phone, Package, ChevronRight, AlertCircle, Send, ArrowRight, Eye
} from 'lucide-react';
import { LumoLogo } from '@/components/landing/LumoLogo';

interface UnifiedDispatch {
  id: string;
  tracking_token: string;
  order_number?: string;
  customer_phone: string;
  customer_name?: string;
  delivery_address: string;
  product_description: string;
  driver_name: string | null;
  driver_phone: string | null;
  status: string;
  created_at: string;
  is_order: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  CREATED: { label: 'Created', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock },
  PENDING: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock },
  CONFIRMED: { label: 'Confirmed', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: CheckCircle2 },
  DRIVER_ASSIGNED: { label: 'Driver Assigned', color: 'text-slate-800', bg: 'bg-slate-100 border-slate-300', icon: User },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'text-[#FF5500]', bg: 'bg-orange-50 border-orange-200', icon: Truck },
  STARTED: { label: 'Out for Delivery', color: 'text-[#FF5500]', bg: 'bg-orange-50 border-orange-200', icon: Truck },
  ON_THE_WAY: { label: 'Out for Delivery', color: 'text-[#FF5500]', bg: 'bg-orange-50 border-orange-200', icon: Truck },
  ARRIVED: { label: 'Driver Arrived', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: MapPin },
  DRIVER_NEARBY: { label: 'Driver Nearby', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: MapPin },
  DELIVERED: { label: 'Delivered', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200', icon: XCircle },
};

export default function DeliveriesPage() {
  const router = useRouter();
  const [dispatches, setDispatches] = useState<UnifiedDispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [error, setError] = useState<string | null>(null);

  const loadAllDispatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const unifiedList: UnifiedDispatch[] = [];

      // 1. Fetch Orders from /orders
      try {
        const ordersRes = await fetchApi('/orders?limit=100');
        const orderList = ordersRes.orders || (Array.isArray(ordersRes) ? ordersRes : []);
        orderList.forEach((o: any) => {
          unifiedList.push({
            id: o.id,
            tracking_token: o.tracking_token || o.order_number,
            order_number: o.order_number,
            customer_name: o.customer_name,
            customer_phone: o.customer_phone,
            delivery_address: o.delivery_address,
            product_description: o.product_name,
            driver_name: o.driver_name,
            driver_phone: o.driver_phone,
            status: o.status,
            created_at: o.created_at,
            is_order: true,
          });
        });
      } catch (err) {
        console.warn('Orders fetch note:', err);
      }

      // 2. Fetch legacy deliveries from /deliveries if present
      try {
        const deliveriesRes = await fetchApi('/deliveries');
        const delList = deliveriesRes.deliveries || (Array.isArray(deliveriesRes) ? deliveriesRes : []);
        delList.forEach((d: any) => {
          if (!unifiedList.some((item) => item.id === d.id)) {
            unifiedList.push({
              id: d.id,
              tracking_token: d.tracking_token,
              order_number: d.tracking_token ? `#${d.tracking_token.slice(0, 8).toUpperCase()}` : 'DEL-101',
              customer_name: d.recipient_name || 'Customer',
              customer_phone: d.customer_phone || '—',
              delivery_address: d.delivery_address,
              product_description: d.product_description,
              driver_name: d.driver_name,
              driver_phone: d.driver_phone,
              status: d.status,
              created_at: d.created_at || new Date().toISOString(),
              is_order: false,
            });
          }
        });
      } catch (err) {
        console.warn('Deliveries fetch note:', err);
      }

      // Sort by creation time descending
      unifiedList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setDispatches(unifiedList);
    } catch (err: any) {
      setError(err.message || 'Failed to load dispatches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllDispatches();
  }, [loadAllDispatches]);

  const filteredDispatches = dispatches.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      d.product_description.toLowerCase().includes(q) ||
      d.customer_phone.includes(q) ||
      d.delivery_address.toLowerCase().includes(q) ||
      (d.customer_name && d.customer_name.toLowerCase().includes(q)) ||
      (d.driver_name && d.driver_name.toLowerCase().includes(q)) ||
      d.tracking_token.toLowerCase().includes(q) ||
      (d.order_number && d.order_number.toLowerCase().includes(q));

    const matchStatus =
      statusFilter === 'ALL' ||
      d.status === statusFilter ||
      (statusFilter === 'OUT_FOR_DELIVERY' && (d.status === 'STARTED' || d.status === 'ON_THE_WAY')) ||
      (statusFilter === 'CREATED' && d.status === 'PENDING');

    return matchSearch && matchStatus;
  });

  const totalCount = dispatches.length;
  const activeCount = dispatches.filter(
    (d) =>
      d.status === 'OUT_FOR_DELIVERY' ||
      d.status === 'ON_THE_WAY' ||
      d.status === 'STARTED' ||
      d.status === 'DRIVER_ASSIGNED' ||
      d.status === 'ARRIVED' ||
      d.status === 'DRIVER_NEARBY'
  ).length;
  const deliveredCount = dispatches.filter((d) => d.status === 'DELIVERED').length;

  return (
    <div className="space-y-6 font-sans bg-white">
      {/* Top Header with 3-Color Branding */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-[#FF5500]" />
            <span>Deliveries Management</span>
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Live dispatches, fleet drivers, and customer tracking link registry.
          </p>
        </div>
        <Link
          href="/dashboard/orders"
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#FF5500] hover:bg-[#E04B00] active:scale-95 text-white font-extrabold text-xs shadow-xs transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Delivery Order</span>
        </Link>
      </div>

      {/* Dynamic Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Dispatches</p>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#FF5500] font-black">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Active In-Transit</p>
            <p className="text-2xl font-black text-[#FF5500] tracking-tight">{activeCount}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-black">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Completed Deliveries</p>
            <p className="text-2xl font-black text-emerald-700 tracking-tight">{deliveredCount}</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search Order #, customer phone, driver, product, address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#FF5500] shadow-xs"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-extrabold text-slate-700 shadow-xs focus:outline-none focus:border-[#FF5500] min-w-[160px]"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending / Created</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="DRIVER_ASSIGNED">Driver Assigned</option>
          <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
          <option value="ARRIVED">Driver Arrived</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button
          onClick={loadAllDispatches}
          className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs transition-colors active:scale-90"
          title="Refresh List"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">✕</button>
        </div>
      )}

      {/* Live Dispatches Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 rounded-xl bg-orange-100 animate-pulse mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-400">Loading live dispatches...</p>
          </div>
        ) : filteredDispatches.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Truck className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-black text-slate-700">No deliveries found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
              Create a new order to dispatch drivers and send real-time customer tracking links.
            </p>
            <Link
              href="/dashboard/orders"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-xs shadow-xs"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create First Order</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-extrabold">
                  <th className="text-left px-4 py-3.5 font-extrabold">Order #</th>
                  <th className="text-left px-4 py-3.5 font-extrabold">Product</th>
                  <th className="text-left px-4 py-3.5 font-extrabold">Destination</th>
                  <th className="text-left px-4 py-3.5 font-extrabold">Status</th>
                  <th className="text-left px-4 py-3.5 font-extrabold">Driver</th>
                  <th className="text-left px-4 py-3.5 font-extrabold">Customer</th>
                  <th className="text-right px-4 py-3.5 font-extrabold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDispatches.map((d) => {
                  const statusCfg = STATUS_CONFIG[d.status] || STATUS_CONFIG.CREATED;
                  const StatusIcon = statusCfg.icon;
                  const displayRef = d.order_number || `#${d.tracking_token.slice(0, 8).toUpperCase()}`;

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-black text-slate-900 text-sm">
                        {displayRef}
                      </td>
                      <td className="px-4 py-3.5 font-extrabold text-slate-900">{d.product_description}</td>
                      <td className="px-4 py-3.5 text-slate-600 font-medium max-w-[180px] truncate">
                        {d.delivery_address}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-extrabold ${statusCfg.bg} ${statusCfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-extrabold text-slate-800">{d.driver_name || 'Unassigned'}</td>
                      <td className="px-4 py-3.5">
                        <p className="font-extrabold text-slate-900">{d.customer_name || 'Customer'}</p>
                        <p className="text-slate-400 font-mono text-[10px]">{d.customer_phone}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {d.is_order ? (
                            <Link
                              href={`/dashboard/orders/${d.id}`}
                              className="px-3.5 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl font-black text-[10px] transition-colors"
                            >
                              Manage Order
                            </Link>
                          ) : (
                            <a
                              href={`/track/${d.tracking_token}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-[#FF5500] hover:bg-orange-100 font-extrabold text-[10px] transition-colors"
                            >
                              <span>Track</span>
                              <ExternalLink className="w-3 h-3 text-[#FF5500]" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
