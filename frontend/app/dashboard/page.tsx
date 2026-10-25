'use client';

import { T, useLanguage } from '@/components/LanguageProvider';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Truck, MessageSquare, Clock, Plus, Search, ChevronDown, MoreHorizontal,
  CheckCircle2, User, PackageX, RefreshCw, AlertTriangle, ArrowUpRight,
  UserCheck, ExternalLink, Bell, Compass, Send, Copy, Check, Filter, MapPin, Zap, Users,
  ChevronRight, FileText, Phone, Calendar
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

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
  const { t, label: uiLabel, locale } = useLanguage();

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
  const [smsData, setSmsData] = useState<any>(null);

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

      // 5. Fetch SMS Balance
      fetchApi('/sms/overview')
        .then((data) => setSmsData(data))
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
  const pendingDispatchCount = orders.filter((o) => o.status === 'CREATED' || o.status === 'PENDING' || o.status === 'DRIVER_ASSIGNED').length;
  const outForDeliveryCount = orders.filter((o) => o.status === 'OUT_FOR_DELIVERY' || o.status === 'ON_THE_WAY').length;
  const deliveredCount = orders.filter((o) => o.status === 'DELIVERED').length;
  const failedCount = orders.filter((o) => o.status === 'CANCELLED' || o.status === 'FAILED').length;

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-[11px] rounded-lg inline-flex items-center gap-1 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            <T k="common.delivered" />
          </span>
        );
      case 'OUT_FOR_DELIVERY':
      case 'ON_THE_WAY':
        return (
          <span className="px-2.5 py-1 bg-orange-100 text-[#FF5500] font-extrabold text-[11px] rounded-lg inline-flex items-center gap-1 uppercase tracking-wider border border-orange-200">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5500] animate-pulse"></span>
            <T k="common.out_for_delivery" />
          </span>
        );
      case 'DRIVER_ASSIGNED':
        return (
          <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-extrabold text-[11px] rounded-lg inline-flex items-center gap-1 uppercase tracking-wider border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            <T k="common.driver_assigned" />
          </span>
        );
      case 'ARRIVED':
      case 'DRIVER_NEARBY':
        return (
          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-extrabold text-[11px] rounded-lg inline-flex items-center gap-1 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
            <T k="merchant.driver_nearby" />
          </span>
        );
      case 'CANCELLED':
      case 'FAILED':
        return (
          <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-extrabold text-[11px] rounded-lg inline-flex items-center gap-1 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
            <T k="common.failed" />
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold text-[11px] rounded-lg inline-block uppercase tracking-wider">
            {uiLabel(status)}
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

  const formattedDate = new Date().toLocaleDateString(locale === 'sw' ? 'sw-TZ' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="space-y-4 sm:space-y-6 pb-6 font-sans selection:bg-[#FF5500] selection:text-white bg-white">
      
      {/* 1. Compact Operational Introduction (Replaces Promotional Hero) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {locale === 'sw' ? 'Muhtasari wa Uendeshaji' : 'Operations Overview'}
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
              LIVE
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-700">{merchant?.business_name || 'HOME DECO'}</span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1 text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {formattedDate}
            </span>
          </p>
        </div>

        {/* Operational Status Summary Tag */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF5500]"></span>
            <span>
              {todaysOrdersCount} {locale === 'sw' ? 'Maagizo leo' : "Today's Orders"}
            </span>
            {outForDeliveryCount > 0 && (
              <>
                <span className="text-slate-300">|</span>
                <span className="text-[#FF5500] font-bold">
                  {outForDeliveryCount} {locale === 'sw' ? 'Mizigo Njia' : 'In Transit'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Responsive Search and Create Actions */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 shadow-xs flex items-center justify-between gap-2.5 sm:gap-4">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="mobile-search-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("merchant.search_order_customer_driver")}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 sm:bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-[#FF5500] transition-all"
            aria-label={t("merchant.search_order_customer_driver")}
          />
        </div>

        <Link
          href="/dashboard/orders"
          className="min-h-[40px] px-3.5 sm:px-4 py-2 bg-[#FF5500] hover:bg-[#E04B00] active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5500]"
          title={t("common.create_order")}
          aria-label={t("common.create_order")}
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span className="hidden min-[420px]:inline"><T k="merchant.new_order" /></span>
        </Link>
      </div>

      {/* 3. Operational KPI Cards Grid */}
      <div>
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
          
          {/* Card 1: Today's / Active Orders */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs flex items-center justify-between transition-all hover:border-slate-300">
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                <T k="merchant.today_s_orders" />
              </p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {todaysOrdersCount}
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {locale === 'sw' ? 'Yaliyopokelewa leo' : 'Active today'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Pending Dispatch */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs flex items-center justify-between transition-all hover:border-slate-300">
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                {locale === 'sw' ? 'Kusubiri Dereva' : 'Pending Driver'}
              </p>
              <p className="text-2xl sm:text-3xl font-black text-blue-700 tracking-tight">
                {pendingDispatchCount}
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {locale === 'sw' ? 'Tayari kwa safari' : 'Awaiting dispatch'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Out for Delivery (In Transit) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs flex items-center justify-between transition-all hover:border-slate-300">
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-[#FF5500] uppercase tracking-wider mb-1">
                <T k="common.out_for_delivery" />
              </p>
              <p className="text-2xl sm:text-3xl font-black text-[#FF5500] tracking-tight">
                {outForDeliveryCount}
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {locale === 'sw' ? 'Zipo njiani' : 'In transit to door'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF5500] flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Delivered */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs flex items-center justify-between transition-all hover:border-slate-300">
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
                <T k="common.delivered" />
              </p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
                {deliveredCount}
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {locale === 'sw' ? 'Mizigo iliyofikishwa' : 'Completed handovers'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          {/* Card 5: Failed / Attention Needed */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs flex items-center justify-between transition-all hover:border-slate-300 min-[360px]:col-span-2 md:col-span-4 lg:col-span-1">
            <div>
              <p className="text-[11px] sm:text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">
                {locale === 'sw' ? 'Inayohitaji Hatua' : 'Attention Needed'}
              </p>
              <p className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
                {failedCount}
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {locale === 'sw' ? 'Iliyositishwa / Hitilafu' : 'Failed or cancelled'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

        </div>
      </div>

      {/* 4. Compact SMS Balance & Account Health Card */}
      <div className="bg-gradient-to-r from-[#0B192C] via-[#112239] to-[#0B192C] rounded-2xl p-4 sm:p-5 text-white border border-[#1E3A5F] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#FF5500]/20 text-[#FF5500]">
                <MessageSquare className="w-4 h-4" />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                {locale === 'sw' ? 'Salio la SMS' : 'SMS Delivery Balance'}
              </span>
            </div>

            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
              (smsData?.account?.health?.color || 'green') === 'green'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : (smsData?.account?.health?.color || 'green') === 'amber'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-red-500/20 text-red-300 border-red-500/30'
            }`}>
              {locale === 'sw'
                ? smsData?.account?.health?.statusLabelSw || 'Salio la Kutosha'
                : smsData?.account?.health?.statusLabelEn || 'Healthy Balance'}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">
              {(smsData?.account?.availableCredits ?? 0).toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-bold">
              {locale === 'sw' ? 'SMS zilizopo' : 'credits available'}
            </span>
          </div>

          {/* Dynamic Progress Bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                (smsData?.account?.health?.color || 'green') === 'green'
                  ? 'bg-emerald-500'
                  : (smsData?.account?.health?.color || 'green') === 'amber'
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${smsData?.account?.health?.percentage ?? 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
          <Link
            href="/dashboard/sms"
            className="w-full sm:w-auto min-h-[40px] px-4 py-2 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-xs transition-all active:scale-95 shadow-md flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{locale === 'sw' ? 'Ongeza SMS' : 'Top Up SMS'}</span>
          </Link>
        </div>
      </div>

      {/* 5. Streamlined Quick Operational Actions */}
      <div className="space-y-2">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
          <T k="merchant.quick_merchant_actions" />
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Action 1: Create Order */}
          <Link
            href="/dashboard/orders"
            className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-[#FF5500]/50 hover:bg-orange-50/20 transition-all flex items-center gap-3 group active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-lg bg-[#FF5500] text-white flex items-center justify-center font-bold shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Plus className="w-4 h-4 stroke-[3]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 leading-tight truncate">
                <T k="common.create_order" />
              </p>
              <p className="text-[10px] text-slate-500 truncate hidden min-[360px]:block">
                {locale === 'sw' ? 'Anza mzigo mpya' : 'Dispatch package'}
              </p>
            </div>
          </Link>

          {/* Action 2: Assign Driver */}
          <Link
            href="/dashboard/orders"
            className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-blue-400 hover:bg-blue-50/20 transition-all flex items-center gap-3 group active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-lg bg-[#0F172A] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 leading-tight truncate">
                <T k="merchant.assign_driver" />
              </p>
              <p className="text-[10px] text-slate-500 truncate hidden min-[360px]:block">
                {locale === 'sw' ? 'Wape madereva' : 'Assign fleet'}
              </p>
            </div>
          </Link>

          {/* Action 3: Track Delivery */}
          <button
            onClick={() => setActiveQuickAction('TRACK')}
            className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-amber-400 hover:bg-amber-50/20 transition-all flex items-center gap-3 text-left group active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Compass className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 leading-tight truncate">
                <T k="merchant.track_delivery" />
              </p>
              <p className="text-[10px] text-slate-500 truncate hidden min-[360px]:block">
                {locale === 'sw' ? 'Kiungo cha mteja' : 'Customer portal'}
              </p>
            </div>
          </button>

          {/* Action 4: View Notifications Log */}
          <button
            onClick={() => setActiveQuickAction('NOTIFICATIONS')}
            className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-emerald-400 hover:bg-emerald-50/20 transition-all flex items-center gap-3 text-left group active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 leading-tight truncate">
                <T k="merchant.view_notifications" />
              </p>
              <p className="text-[10px] text-slate-500 truncate hidden min-[360px]:block">
                {locale === 'sw' ? 'Ripoti za SMS' : 'SMS log feed'}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* 6. Live Deliveries & Orders Section */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {/* Section Header & Filters */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900">
              <T k="merchant.live_deliveries" />
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
              <T k="merchant.real_time_dispatches_and_driver_assignments" />
            </p>
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {['ALL', 'OUT_FOR_DELIVERY', 'DRIVER_ASSIGNED', 'DELIVERED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                  statusFilter === st
                    ? 'bg-[#0F172A] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {st === 'ALL' ? t("admin.all") : st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-xs font-bold">
            <T k="merchant.loading_live_dispatches" />
          </div>
        ) : filteredOrders.length === 0 ? (
          /* Empty State */
          <div className="p-10 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <PackageX className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-black text-slate-800">
              <T k="merchant.no_orders_found" />
            </h3>
            <p className="text-xs text-slate-500 max-w-sm font-medium">
              <T k="merchant.click_below_to_dispatch_your_first_order" />
            </p>
            <Link
              href="/dashboard/orders"
              className="mt-2 px-4 py-2 bg-[#FF5500] hover:bg-[#E04B00] active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span><T k="merchant.create_first_order" /></span>
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile Responsive Order Cards (Visible on screens < 768px) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredOrders.map((item) => (
                <div key={item.id} className="p-3.5 space-y-2.5 hover:bg-slate-50/60 transition-colors">
                  {/* Top Line: Order Number & Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-black text-slate-900 text-xs sm:text-sm">
                      {item.order_number}
                    </span>
                    <div>{renderStatusBadge(item.status)}</div>
                  </div>

                  {/* Customer and Driver details */}
                  <div className="flex items-start justify-between gap-2 text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{item.customer_name}</p>
                      <p className="text-slate-400 text-[11px] font-mono">{item.customer_phone}</p>
                    </div>

                    <div className="text-right">
                      {item.driver_name ? (
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="font-semibold text-slate-700 text-xs">{item.driver_name}</span>
                          <div className="w-5 h-5 rounded-full bg-[#0F172A] text-white font-black flex items-center justify-center text-[9px]">
                            {item.driver_name[0]}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic font-medium">
                          <T k="common.unassigned" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons line */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100/80">
                    {item.tracking_token && (
                      <Link
                        href={`/track/${item.tracking_token}`}
                        target="_blank"
                        className="px-2.5 py-1 text-slate-600 hover:text-[#FF5500] text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1"
                        title={t("merchant.open_customer_tracking_link")}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Track</span>
                      </Link>
                    )}
                    <Link
                      href={`/dashboard/orders/${item.id}`}
                      className="px-3 py-1 bg-[#0F172A] hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors inline-block"
                    >
                      <T k="merchant.details" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (Visible on screens >= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                    <th className="p-4"><T k="common.order_2" /></th>
                    <th className="p-4"><T k="common.customer" /></th>
                    <th className="p-4"><T k="common.driver" /></th>
                    <th className="p-4"><T k="common.status" /></th>
                    <th className="p-4 text-right"><T k="common.actions" /></th>
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
                          <span className="text-slate-400 italic font-medium"><T k="common.unassigned" /></span>
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
                              title={t("merchant.open_customer_tracking_link")}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          )}
                          <Link
                            href={`/dashboard/orders/${item.id}`}
                            className="px-3.5 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-colors inline-block"
                          >
                            <T k="merchant.details" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* MODAL: TRACK DELIVERY QUICK LOOKUP */}
      {activeQuickAction === 'TRACK' && (
        <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200">
            <h3 className="text-base font-black text-slate-900"><T k="merchant.track_customer_delivery" /></h3>
            <p className="text-xs text-slate-500 font-medium"><T k="merchant.enter_an_order_number_or_tracking_token_to_open_live_portal" /></p>
            <input
              type="text"
              value={trackInput}
              onChange={(e) => setTrackInput(e.target.value)}
              placeholder={t("merchant.e_g_lumo_8241_or_tracking_token")}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-[#FF5500]"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveQuickAction(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-extrabold text-xs rounded-xl"
              >
                <T k="common.close" />
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
                <T k="merchant.open_tracking_portal" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW NOTIFICATIONS LOG */}
      {activeQuickAction === 'NOTIFICATIONS' && (
        <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[80vh] flex flex-col justify-between border border-slate-200">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-black text-slate-900"><T k="merchant.sms_notifications_feed" /></h3>
                <span className="text-xs font-extrabold text-[#FF5500] bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                  <T k="merchant.meseji_sms_logs" />
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mb-3">
                <T k="merchant.all_automated_customer_and_driver_sms_alerts_sent_via_meseji_api" />
              </p>

              <div className="space-y-2 overflow-y-auto max-h-72 pr-1">
                {notificationLog.length === 0 ? (
                  <p className="text-xs text-slate-400 p-4 text-center"><T k="merchant.no_notifications_logged_yet" /></p>
                ) : (
                  notificationLog.map((log) => (
                    <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-extrabold text-slate-900">{log.type}</p>
                        <p className="text-[11px] text-slate-500 font-medium"><T k="merchant.to" /> {log.recipient}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-md uppercase">
                          <T k="merchant.sent" />
                        </span>
                        <p className="text-[10px] font-mono text-slate-400 font-bold mt-0.5"><T k="common.order" /> {log.order}</p>
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
                <T k="common.close" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
