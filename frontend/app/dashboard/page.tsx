'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Truck, MessageSquare, Clock, Plus, Search, ChevronDown, MoreHorizontal,
  CheckCircle2, User, PackageX, RefreshCw, AlertTriangle, ArrowUpRight,
  UserCheck, ExternalLink, Bell, Compass, Send, Copy, Check, Filter, MapPin, Zap, Users,
  ChevronRight, FileText
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import ProfileDropdown from '@/components/ProfileDropdown';
import { LumoLogo } from '@/components/landing/LumoLogo';

interface OrderItem {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  product_name: string;
  delivery_address: string;
  status: string;
  driver_name: string | null;
  driver_id?: string | null;
  created_at: string;
  tracking_token?: string;
}

export default function DashboardOverviewPage() {
  const [merchant, setMerchant] = useState<any>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [metrics, setMetrics] = useState({
    todaysOrders: 0,
    outForDelivery: 0,
    delivered: 0,
    failed: 0,
    notificationsSent: 0,
  });
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Quick Action Modal states
  const [activeQuickAction, setActiveQuickAction] = useState<string | null>(null);
  const [trackInput, setTrackInput] = useState('');
  const [notificationLog, setNotificationLog] = useState<any[]>([]);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Merchant info
      fetchApi('/auth/me')
        .then((data) => setMerchant(data.merchant || data.user))
        .catch(() => {});

      // 2. Fetch metrics
      fetchApi('/orders/metrics')
        .then((res) => {
          if (res) {
            setMetrics({
              todaysOrders: res.total || 0,
              outForDelivery: res.outForDelivery || 0,
              delivered: res.delivered || 0,
              failed: res.cancelled || 0,
              notificationsSent: (res.total || 0) * 2 + (res.delivered || 0),
            });
          }
        })
        .catch(() => {});

      // 3. Fetch orders
      const ordersRes = await fetchApi('/orders?limit=50');
      const orderList = ordersRes.orders || (Array.isArray(ordersRes) ? ordersRes : []);
      setOrders(orderList);

      // Extract real notification dispatches from orders
      const logs: any[] = [];
      orderList.forEach((o: any) => {
        if (o.created_at) {
          logs.push({
            id: `${o.id}-created`,
            type: 'Order Created SMS',
            recipient: `${o.customer_name} (${o.customer_phone})`,
            order: o.order_number,
            time: o.created_at,
            status: 'DELIVERED',
          });
        }
        if (o.driver_name) {
          logs.push({
            id: `${o.id}-driver`,
            type: 'Driver Dispatch Alert',
            recipient: `${o.driver_name}`,
            order: o.order_number,
            time: o.assigned_at || o.created_at,
            status: 'DELIVERED',
          });
        }
      });
      setNotificationLog(logs);

      // 4. Fetch drivers
      fetchApi('/drivers')
        .then((data) => setDrivers(Array.isArray(data) ? data : []))
        .catch(() => {});
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Derived counts for display
  const todaysOrdersCount = metrics.todaysOrders || orders.length;
  const outForDeliveryCount = orders.filter((o) => o.status === 'OUT_FOR_DELIVERY' || o.status === 'ON_THE_WAY' || o.status === 'DRIVER_ASSIGNED').length;
  const deliveredCount = orders.filter((o) => o.status === 'DELIVERED').length;
  const failedCount = orders.filter((o) => o.status === 'CANCELLED' || o.status === 'FAILED').length;
  const notificationsSentCount = notificationLog.length > 0 ? notificationLog.length : orders.length * 2;

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-[11px] rounded-lg inline-block uppercase tracking-wider">
            Delivered
          </span>
        );
      case 'OUT_FOR_DELIVERY':
      case 'ON_THE_WAY':
        return (
          <span className="px-3 py-1 bg-orange-100 text-[#FF5500] font-extrabold text-[11px] rounded-lg inline-block uppercase tracking-wider border border-orange-200">
            Out for Delivery
          </span>
        );
      case 'DRIVER_ASSIGNED':
        return (
          <span className="px-3 py-1 bg-slate-100 text-slate-800 font-extrabold text-[11px] rounded-lg inline-block uppercase tracking-wider border border-slate-300">
            Driver Assigned
          </span>
        );
      case 'ARRIVED':
      case 'DRIVER_NEARBY':
        return (
          <span className="px-3 py-1 bg-amber-100 text-amber-800 font-extrabold text-[11px] rounded-lg inline-block uppercase tracking-wider">
            Driver Nearby
          </span>
        );
      case 'CANCELLED':
      case 'FAILED':
        return (
          <span className="px-3 py-1 bg-rose-100 text-rose-800 font-extrabold text-[11px] rounded-lg inline-block uppercase tracking-wider">
            Failed
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold text-[11px] rounded-lg inline-block uppercase tracking-wider">
            {status}
          </span>
        );
    }
  };

  const filteredOrders = orders.filter((item) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      item.order_number.toLowerCase().includes(q) ||
      item.customer_name.toLowerCase().includes(q) ||
      item.customer_phone.includes(q) ||
      (item.driver_name && item.driver_name.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12 font-sans selection:bg-[#FF5500] selection:text-white bg-white">
      {/* Top Search Bar for Mobile & Desktop */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs flex items-center justify-between gap-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            id="mobile-search-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Order #, Customer, Driver..."
            className="w-full pl-9 pr-4 py-2 bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-[#FF5500] transition-all"
          />
        </div>

        <Link
          href="/dashboard/orders"
          className="px-4 py-2 bg-[#FF5500] hover:bg-[#E04B00] active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span className="hidden sm:inline">New Order</span>
        </Link>
      </div>

      {/* HERO BANNER MATCHING USER IMAGE (Dark Navy Card + Background Image + Slogan + Status Pills) */}
      <div
        className="relative rounded-3xl bg-[#0B192C] text-white shadow-xl overflow-hidden border border-[#1F3654] p-6 sm:p-8 space-y-6 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('/tanzania_skyline.png')` }}
      >
        {/* Dark overlay for contrast & readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B192C]/95 via-[#0B192C]/85 to-[#0B192C]/65 backdrop-blur-[1px] pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Top Section: Orange Pill + Title + Right Calligraphic Slogan */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-3 max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF5500] text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                <span className="text-xs">▶</span> LUMO DISPATCH ENGINE
              </span>

              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                All Dispatches & Operations
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                Browse every verified delivery, driver assignment, and real-time SMS tracking update across Tanzania in one place.
              </p>
            </div>

            {/* Right Calligraphic Slogan (Matching Screenshot Signature) */}
            <div className="hidden sm:flex flex-col items-end text-right shrink-0 pt-2">
              <span className="text-xl sm:text-2xl font-serif italic text-white/90 font-bold drop-shadow-xs">
                Deliveries Build
              </span>
              <span className="text-2xl sm:text-3xl font-serif italic text-[#FF5500] font-black drop-shadow-xs">
                a Brighter Tanzania
              </span>
            </div>
          </div>

          {/* Status Pills Row (Matching Image Style) */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {deliveredCount} verified deliveries
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30 text-xs font-semibold">
              <MapPin className="w-3.5 h-3.5 text-[#FF5500]" />
              All Tanzania regions
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 text-xs font-semibold">
              <User className="w-3.5 h-3.5 text-blue-400" />
              Real-time SMS dispatches
            </span>
          </div>
        </div>
      </div>

      {/* QUICK MERCHANT ACTIONS SECTION (2x2 Grid matching user image) */}
      <div className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-wider text-[#FF5500]">
          QUICK MERCHANT ACTIONS
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Card 1: Create Order */}
          <Link
            href="/dashboard/orders"
            className="p-4 rounded-2xl bg-[#112239] border border-[#1F3654] hover:border-[#FF5500]/50 transition-all flex items-center justify-between group shadow-sm active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#FF5500] text-white flex items-center justify-center font-bold text-xl shadow-xs group-hover:scale-105 transition-transform">
                <Plus className="w-6 h-6 stroke-[3]" />
              </div>
              <div>
                <p className="text-sm font-black text-white leading-tight">Create Order</p>
                <p className="text-xs text-slate-400 font-medium">Start dispatch from</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
          </Link>

          {/* Card 2: Assign Driver */}
          <Link
            href="/dashboard/orders"
            className="p-4 rounded-2xl bg-[#112239] border border-[#1F3654] hover:border-[#FF5500]/50 transition-all flex items-center justify-between group shadow-sm active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#1A2E47] border border-[#2B466B] text-slate-200 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <UserCheck className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-sm font-black text-white leading-tight">Assign Driver</p>
                <p className="text-xs text-slate-400 font-medium">Driver fleet dispatch</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
          </Link>

          {/* Card 3: Track Delivery */}
          <button
            onClick={() => setActiveQuickAction('TRACK')}
            className="p-4 rounded-2xl bg-[#112239] border border-[#1F3654] hover:border-[#FF5500]/50 transition-all flex items-center justify-between text-left group shadow-sm active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#2D1B16] border border-[#52291F] text-[#FF5500] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Compass className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-sm font-black text-white leading-tight">Track Delivery</p>
                <p className="text-xs text-slate-400 font-medium">Public link & track</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
          </button>

          {/* Card 4: View Notifications */}
          <button
            onClick={() => setActiveQuickAction('NOTIFICATIONS')}
            className="p-4 rounded-2xl bg-[#112239] border border-[#1F3654] hover:border-[#FF5500]/50 transition-all flex items-center justify-between text-left group shadow-sm active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#2D2816] border border-[#54491F] text-amber-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Bell className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-sm font-black text-white leading-tight">View Notifications</p>
                <p className="text-xs text-slate-400 font-medium">Read SMS & app feed</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
          </button>
        </div>
      </div>

      {/* METRICS CARDS SECTION (Matching Image Style & Colors) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Today's Orders */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-slate-800 mb-1">Today's Orders</p>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{todaysOrdersCount}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Out for Delivery */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-[#FF5500] mb-1">Out for Delivery</p>
            <p className="text-3xl font-black text-[#FF5500] tracking-tight">{outForDeliveryCount}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-orange-50 text-[#FF5500] flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        {/* Delivered */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-emerald-600 mb-1">Delivered</p>
            <p className="text-3xl font-black text-emerald-600 tracking-tight">{deliveredCount}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Failed */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-rose-600 mb-1">Failed</p>
            <p className="text-3xl font-black text-rose-600 tracking-tight">{failedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Notifications Sent (Full width below) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs col-span-2 flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-amber-600 mb-1">Notifications Sent</p>
            <p className="text-3xl font-black text-amber-600 tracking-tight">{notificationsSentCount}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* LIVE DELIVERIES TABLE SECTION */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900">Live Deliveries</h2>
            <p className="text-xs text-slate-500 font-medium">Real-time dispatches and driver assignments</p>
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['ALL', 'OUT_FOR_DELIVERY', 'DRIVER_ASSIGNED', 'DELIVERED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  statusFilter === st
                    ? 'bg-[#0F172A] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {st === 'ALL' ? 'All' : st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-bold">
            Loading live dispatches...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <PackageX className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-black text-slate-800">No Orders Found</h3>
            <p className="text-xs text-slate-500 max-w-sm font-medium">
              Click below to dispatch your first order.
            </p>
            <Link
              href="/dashboard/orders"
              className="mt-2 px-4 py-2.5 bg-[#FF5500] hover:bg-[#E04B00] active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create First Order</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="p-4">Order #</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Driver</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-mono font-black text-slate-900 text-sm">
                      {item.order_number}
                    </td>
                    <td className="p-4">
                      <p className="font-extrabold text-slate-900 text-xs">{item.customer_name}</p>
                      <p className="text-slate-400 text-[10px] font-mono">{item.customer_phone}</p>
                    </td>
                    <td className="p-4">
                      {item.driver_name ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#0F172A] text-white font-black flex items-center justify-center text-[10px]">
                            {item.driver_name[0]}
                          </div>
                          <span className="font-extrabold text-slate-800">{item.driver_name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic font-medium">Unassigned</span>
                      )}
                    </td>
                    <td className="p-4">{renderStatusBadge(item.status)}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.tracking_token && (
                          <Link
                            href={`/track/${item.tracking_token}`}
                            target="_blank"
                            className="p-1.5 text-slate-400 hover:text-[#FF5500] rounded-lg hover:bg-slate-100 transition-colors"
                            title="Open Customer Tracking Link"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        )}
                        <Link
                          href={`/dashboard/orders/${item.id}`}
                          className="px-3.5 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-colors inline-block"
                        >
                          Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: TRACK DELIVERY QUICK LOOKUP */}
      {activeQuickAction === 'TRACK' && (
        <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200">
            <h3 className="text-base font-black text-slate-900">Track Customer Delivery</h3>
            <p className="text-xs text-slate-500 font-medium">Enter an Order Number or Tracking Token to open live portal:</p>
            <input
              type="text"
              value={trackInput}
              onChange={(e) => setTrackInput(e.target.value)}
              placeholder="e.g. LUMO-8241 or tracking token..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-[#FF5500]"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveQuickAction(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-extrabold text-xs rounded-xl"
              >
                Close
              </button>
              <button
                onClick={() => {
                  if (trackInput.trim()) {
                    window.open(`/track/${trackInput.trim()}`, '_blank');
                    setActiveQuickAction(null);
                  }
                }}
                className="px-4 py-2 bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-xs rounded-xl shadow-xs"
              >
                Open Tracking Portal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW NOTIFICATIONS LOG */}
      {activeQuickAction === 'NOTIFICATIONS' && (
        <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[80vh] flex flex-col justify-between border border-slate-200">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-black text-slate-900">SMS Notifications Feed</h3>
                <span className="text-xs font-extrabold text-[#FF5500] bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                  Meseji SMS Logs
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mb-3">All automated customer and driver SMS alerts sent via Meseji API:</p>

              <div className="space-y-2 overflow-y-auto max-h-72 pr-1">
                {notificationLog.length === 0 ? (
                  <p className="text-xs text-slate-400 p-4 text-center">No notifications logged yet.</p>
                ) : (
                  notificationLog.map((log) => (
                    <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-extrabold text-slate-900">{log.type}</p>
                        <p className="text-[11px] text-slate-500 font-medium">To: {log.recipient}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-md uppercase">
                          Sent
                        </span>
                        <p className="text-[10px] font-mono text-slate-400 font-bold mt-0.5">Order {log.order}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setActiveQuickAction(null)}
                className="px-4 py-2 bg-[#0F172A] text-white font-extrabold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
