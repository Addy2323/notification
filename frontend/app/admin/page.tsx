'use client';


import { T, useLanguage } from '@/components/LanguageProvider';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  ShoppingBag,
  DollarSign,
  Package,
  Truck,
  Bell,
  Eye,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
  Layers,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function AdminOverviewDashboard() {
  const { t, label: uiLabel, locale } = useLanguage();

  const [period, setPeriod] = useState<string>('THIS_MONTH');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [growthMetric, setGrowthMetric] = useState<'orders' | 'sales' | 'merchants' | 'deliveries' | 'visitors'>('orders');
  const [growthInterval, setGrowthInterval] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('MONTHLY');
  const [liveStream, setLiveStream] = useState<any[]>([]);
  const [activeVisitorsCount, setActiveVisitorsCount] = useState<number>(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, growthRes, liveRes] = await Promise.all([
        fetchApi(`/admin/overview?period=${period}`),
        fetchApi(`/admin/growth?interval=${growthInterval}`),
        fetchApi('/admin/traffic/live'),
      ]);

      setMetrics(overviewRes);
      setGrowthData(growthRes || []);
      setLiveStream(liveRes?.stream || []);
      setActiveVisitorsCount(liveRes?.activeVisitorsCount || 0);
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period, growthInterval]);

  const periods = [
    { label: 'Today', value: 'TODAY' },
    { label: 'This Week', value: 'THIS_WEEK' },
    { label: 'This Month', value: 'THIS_MONTH' },
    { label: 'This Quarter', value: 'THIS_QUARTER' },
    { label: 'Semi-Annual', value: 'SEMI_ANNUAL' },
    { label: 'This Year', value: 'THIS_YEAR' },
  ];

  if (loading && !metrics) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 bg-slate-900 rounded-2xl w-1/3"></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-32 bg-slate-900 rounded-2xl"></div>
          ))}
        </div>
        <div className="h-80 bg-slate-900 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Period Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">{' '}<T k="admin.lumo_control_centre_overview" />{' '}<span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">{' '}<T k="admin.live_operations" />{' '}</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">{' '}<T k="admin.real_time_platform_performance_snapshot_merchant_metrics_sales_deliveries_traffic" />{' '}</p>
        </div>

        {/* Dashboard Period Selector */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 self-start lg:self-auto overflow-x-auto max-w-full">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                period === p.value
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {uiLabel(p.label)}
            </button>
          ))}
          <button
            onClick={loadData}
            title={t("admin.refresh_data")}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Merchants */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider"><T k="admin.total_merchants" /></span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-white">
            {metrics?.merchants?.total?.toLocaleString(locale) || 0}
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span className="text-emerald-400 font-bold">{metrics?.merchants?.active || 0}{' '}<T k="admin.active" /></span>
            <span>{metrics?.merchants?.newToday || 0}{' '}<T k="admin.new_today" /></span>
          </div>
        </div>

        {/* Card 2: Total Orders */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider"><T k="common.total_orders" /></span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-white">
            {metrics?.orders?.total?.toLocaleString(locale) || 0}
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span><T k="admin.period_total" /></span>
            <span className="text-amber-400 font-bold"><T k="admin.selected_range" /></span>
          </div>
        </div>

        {/* Card 3: Total Sales Value */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider"><T k="admin.total_sales_value" /></span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-black text-emerald-400 font-mono truncate">
            TZS {(metrics?.orders?.totalSalesValue || 0).toLocaleString(locale)}
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span><T k="admin.gross_profit_3" /></span>
            <span className="text-emerald-300 font-bold font-mono">
              TZS {(metrics?.orders?.totalGrossProfit || 0).toLocaleString(locale)}
            </span>
          </div>
        </div>

        {/* Card 4: Total Deliveries */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider"><T k="admin.total_deliveries" /></span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-white">
            {metrics?.deliveries?.total?.toLocaleString(locale) || 0}
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
            <span className="text-emerald-400 font-bold">{metrics?.deliveries?.delivered || 0}{' '}<T k="common.delivered" /></span>
            <span className="text-rose-400 font-bold">{metrics?.deliveries?.failed || 0}{' '}<T k="common.failed" /></span>
          </div>
        </div>

        {/* Card 5: Total Drivers */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider"><T k="admin.platform_drivers" /></span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-white">
            {metrics?.drivers?.total?.toLocaleString(locale) || 0}
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span className="text-indigo-300 font-bold">{metrics?.drivers?.delivering || 0}{' '}<T k="admin.delivering" /></span>
            <span className="text-emerald-400 font-bold">{metrics?.drivers?.available || 0}{' '}<T k="admin.available" /></span>
          </div>
        </div>

        {/* Card 6: Notifications */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider"><T k="admin.sms_notifications" /></span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-white">
            {metrics?.notifications?.total?.toLocaleString(locale) || 0}
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span className="text-emerald-400 font-bold">{metrics?.notifications?.delivered || 0}{' '}<T k="common.delivered" /></span>
            <span className="text-amber-400 font-bold">{metrics?.notifications?.queued || 0}{' '}<T k="admin.queued" /></span>
          </div>
        </div>

        {/* Card 7: Live Active Visitors */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider"><T k="admin.live_active_visitors" /></span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Eye className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-rose-400 flex items-center gap-2">
            ● {activeVisitorsCount}
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span><T k="admin.website_traffic" /></span>
            <Link href="/admin/traffic" className="text-amber-400 font-bold hover:underline">{' '}<T k="admin.view_traffic" />{' '}</Link>
          </div>
        </div>

        {/* Card 8: Merchant Engagement */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider"><T k="admin.engaged_merchants" /></span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-black text-teal-400">
            {metrics?.merchants?.engagedPeriod || 0}
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span><T k="admin.active_in_period" /></span>
            <Link href="/admin/rankings" className="text-teal-300 font-bold hover:underline">{' '}<T k="admin.rankings" />{' '}</Link>
          </div>
        </div>
      </div>

      {/* Platform Growth Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />{' '}<T k="admin.lumo_platform_growth_analytics" />{' '}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{' '}<T k="admin.historical_trends_across_merchants_orders_sales_deliveries_and_website_visitors" />{' '}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Metric Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(['orders', 'sales', 'merchants', 'deliveries', 'visitors'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setGrowthMetric(m)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                    growthMetric === m
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Interval Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map((inv) => (
                <button
                  key={inv}
                  onClick={() => setGrowthInterval(inv)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    growthInterval === inv
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {inv[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic SVG Spline Chart */}
        <div className="h-64 w-full relative pt-4">
          {growthData.length > 0 ? (
            <div className="w-full h-full flex flex-col justify-between">
              {/* Chart SVG */}
              <svg className="w-full h-48 overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => (
                  <line
                    key={idx}
                    x1="0"
                    y1={180 * pct}
                    x2="100%"
                    y2={180 * pct}
                    stroke="#1E293B"
                    strokeDasharray="4 4"
                  />
                ))}

                {/* Curve Line & Area */}
                {(() => {
                  const values = growthData.map((d) => d[growthMetric] || 0);
                  const maxVal = Math.max(...values, 10);
                  const points = values.map((val, idx) => {
                    const x = (idx / (values.length - 1)) * 100;
                    const y = 180 - (val / maxVal) * 160;
                    return `${x}%,${y}`;
                  });

                  const pathD = `M 0%,180 L ${points.join(' L ')} L 100%,180 Z`;

                  return (
                    <>
                      <path d={pathD} fill="url(#growthGradient)" />
                      <polyline
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth="3"
                        points={points.join(' ')}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  );
                })()}
              </svg>

              {/* X Axis Labels */}
              <div className="flex justify-between text-[10px] text-slate-500 font-mono px-1">
                {growthData.map((item, idx) => (
                  <div key={idx} className="text-center">
                    <span className="font-bold text-slate-400 block">{uiLabel(item.label)}</span>
                    <span className="text-[9px] text-amber-400">
                      {growthMetric === 'sales'
                        ? `TZS ${(item[growthMetric] || 0).toLocaleString(locale)}`
                        : (item[growthMetric] || 0).toLocaleString(locale)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">{' '}<T k="admin.no_growth_dataset_available_for_this_interval" />{' '}</div>
          )}
        </div>
      </div>

      {/* Two Column Section: Merchants Needing Attention & Live Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Merchants Needing Attention */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white"><T k="admin.merchants_needing_attention" /></h3>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">{' '}<T k="admin.backlog_monitor" />{' '}</span>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-white">David Sportware</p>
                <p className="text-[10px] text-rose-400"><T k="admin.18_pending_orders_requiring_dispatch" /></p>
              </div>
              <Link
                href="/admin/merchants"
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-amber-400 border border-slate-800"
              >{' '}<T k="admin.investigate" />{' '}</Link>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-white">ABC Electronics</p>
                <p className="text-[10px] text-amber-400"><T k="admin.3_unassigned_drivers_for_active_deliveries" /></p>
              </div>
              <Link
                href="/admin/merchants"
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-amber-400 border border-slate-800"
              >{' '}<T k="admin.investigate" />{' '}</Link>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-white">Zanzibar Fashion</p>
                <p className="text-[10px] text-slate-400"><T k="admin.merchant_profile_onboarding_incomplete" /></p>
              </div>
              <Link
                href="/admin/merchants"
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-amber-400 border border-slate-800"
              >{' '}<T k="admin.inspect" />{' '}</Link>
            </div>
          </div>
        </div>

        {/* Live Platform Activity Feed */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white"><T k="admin.live_platform_activity_stream" /></h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>{' '}<T k="admin.live" />{' '}</span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
            {liveStream.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/60 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      item.type === 'ORDER'
                        ? 'bg-blue-400'
                        : item.type === 'DELIVERY'
                        ? 'bg-emerald-400'
                        : 'bg-amber-400'
                    }`}
                  ></div>
                  <span className="text-slate-200 font-medium">{item.text}</span>
                </div>
                <span className="text-[9px] font-mono text-slate-500">
                  {new Date(item.timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

            {liveStream.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-6"><T k="admin.listening_for_live_platform_activity" /></p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
