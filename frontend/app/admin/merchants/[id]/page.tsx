'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Swal from 'sweetalert2';
import {
  Users,
  ShoppingBag,
  DollarSign,
  Package,
  Truck,
  UserCheck,
  Bell,
  BarChart3,
  FileText,
  Activity,
  Palette,
  Award,
  ChevronLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Ban,
  CheckCircle2,
  Archive,
  Download,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function Merchant360ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const merchantId = params.id as string;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('Overview');

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await fetchApi(`/admin/merchants/${merchantId}/profile`);
      setProfile(data);
    } catch (err) {
      console.error('Failed to load merchant profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (merchantId) loadProfile();
  }, [merchantId]);

  const handleStatusToggle = async (targetStatus: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED') => {
    const actionText = targetStatus === 'SUSPENDED' ? 'suspend' : targetStatus === 'ARCHIVED' ? 'archive' : 'reactivate';

    const confirm = await Swal.fire({
      title: `Are you sure?`,
      text: `Do you want to ${actionText} merchant "${profile?.merchant?.business_name}"?`,
      icon: targetStatus === 'SUSPENDED' ? 'warning' : 'info',
      showCancelButton: true,
      confirmButtonColor: targetStatus === 'SUSPENDED' ? '#EF4444' : '#F59E0B',
      cancelButtonColor: '#334155',
      confirmButtonText: `Yes, ${actionText} merchant`,
      background: '#0F172A',
      color: '#FFFFFF',
    });

    if (confirm.isConfirmed) {
      try {
        await fetchApi(`/admin/merchants/${merchantId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: targetStatus }),
        });

        Swal.fire({
          title: 'Status Updated!',
          text: `Merchant status is now ${targetStatus}`,
          icon: 'success',
          background: '#0F172A',
          color: '#FFFFFF',
          timer: 2000,
          showConfirmButton: false,
        });

        loadProfile();
      } catch (err: any) {
        Swal.fire({
          title: 'Error',
          text: err.message || 'Failed to update status',
          icon: 'error',
          background: '#0F172A',
          color: '#FFFFFF',
        });
      }
    }
  };

  if (loading || !profile) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-slate-900 rounded-3xl"></div>
        <div className="h-12 bg-slate-900 rounded-2xl w-full"></div>
        <div className="h-96 bg-slate-900 rounded-3xl"></div>
      </div>
    );
  }

  const { merchant, score, streak, summary, orders, deliveries, notifications, auditLogs } = profile;

  const TABS = [
    { label: 'Overview', icon: BarChart3 },
    { label: 'Orders', icon: ShoppingBag, count: summary?.totalOrders },
    { label: 'Sales', icon: DollarSign },
    { label: 'Products', icon: Package, count: summary?.productsCount },
    { label: 'Customers', icon: UserCheck, count: summary?.customersCount },
    { label: 'Drivers', icon: Truck, count: summary?.driversCount },
    { label: 'Deliveries', icon: Package, count: deliveries?.length },
    { label: 'Notifications', icon: Bell, count: notifications?.length },
    { label: 'Analytics', icon: Activity },
    { label: 'Reports', icon: FileText },
    { label: 'Activity', icon: Clock, count: auditLogs?.length },
    { label: 'Branding', icon: Palette },
  ];

  return (
    <div className="space-y-6">
      {/* Top Navigation Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/merchants"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Merchants Directory</span>
        </Link>
      </div>

      {/* Header Banner & Merchant Profile Summary */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-xl"
              style={{ backgroundColor: merchant.brand_color || '#1E40AF' }}
            >
              {merchant.business_name[0]}
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-white tracking-tight">{merchant.business_name}</h1>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    merchant.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : merchant.status === 'SUSPENDED'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {merchant.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2 font-medium">
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-500" /> {merchant.business_phone}
                </span>
                {merchant.email && (
                  <span className="flex items-center gap-1 font-mono">
                    <Mail className="w-3.5 h-3.5 text-slate-500" /> {merchant.email}
                  </span>
                )}
                {merchant.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" /> {merchant.location}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Header Gauges & Actions */}
          <div className="flex items-center gap-4 self-start md:self-auto">
            {/* Score Badge */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center min-w-[100px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Engagement Score
              </span>
              <span className="text-2xl font-black text-amber-400 font-mono">
                {score?.totalScore || 0} / 100
              </span>
            </div>

            {/* Streak Badge */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center min-w-[100px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Activity Streak
              </span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                🔥 {streak?.currentStreak || 0}d
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {merchant.status === 'ACTIVE' ? (
                <button
                  onClick={() => handleStatusToggle('SUSPENDED')}
                  className="px-3.5 py-2 rounded-xl bg-rose-950/40 border border-rose-900 text-rose-400 hover:bg-rose-900/60 font-bold text-xs transition-all"
                >
                  Suspend
                </button>
              ) : (
                <button
                  onClick={() => handleStatusToggle('ACTIVE')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-950/40 border border-emerald-900 text-emerald-400 hover:bg-emerald-900/60 font-bold text-xs transition-all"
                >
                  Reactivate
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 12 Interactive Tabs Bar */}
      <div className="flex items-center gap-1.5 bg-slate-900 p-2 rounded-2xl border border-slate-800 overflow-x-auto custom-scrollbar">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.label;

          return (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab.label)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Panels */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6">
        {activeTab === 'Overview' && (
          <div className="space-y-6">
            {/* Overview Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-500">Total Sales Value</span>
                <p className="text-xl font-black text-emerald-400 font-mono mt-1">
                  TZS {(summary?.totalSales || 0).toLocaleString()}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-500">Total Product Cost</span>
                <p className="text-xl font-black text-rose-400 font-mono mt-1">
                  TZS {(summary?.totalCost || 0).toLocaleString()}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-500">Gross Profit</span>
                <p className="text-xl font-black text-amber-400 font-mono mt-1">
                  TZS {(summary?.grossProfit || 0).toLocaleString()}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-500">Total Orders</span>
                <p className="text-xl font-black text-white mt-1">{summary?.totalOrders || 0}</p>
              </div>
            </div>

            {/* Score Breakdown Table */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                Engagement Score Breakdown (0 - 100)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">Order Volume</span>
                  <span className="text-lg font-bold text-white font-mono">{score?.breakdown?.orderVolumeScore || 0} / 25</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">Fulfillment Rate</span>
                  <span className="text-lg font-bold text-white font-mono">{score?.breakdown?.completionRateScore || 0} / 25</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">Daily Consistency</span>
                  <span className="text-lg font-bold text-white font-mono">{score?.breakdown?.streakScore || 0} / 20</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">Driver Usage</span>
                  <span className="text-lg font-bold text-white font-mono">{score?.breakdown?.driverUsageScore || 0} / 15</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-semibold">Notification Success</span>
                  <span className="text-lg font-bold text-white font-mono">{score?.breakdown?.notificationScore || 0} / 15</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Orders' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">Recent Merchant Orders ({orders.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Order #</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Product</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {orders.map((o: any) => (
                    <tr key={o.id} className="hover:bg-slate-850">
                      <td className="p-3 font-mono font-bold text-white">{o.order_number}</td>
                      <td className="p-3">{o.customer_name} ({o.customer_phone})</td>
                      <td className="p-3">{o.product_name}</td>
                      <td className="p-3 font-mono font-bold text-amber-400">
                        TZS {Number(o.total_revenue || o.amount || 0).toLocaleString()}
                      </td>
                      <td className="p-3 font-bold">{o.status}</td>
                      <td className="p-3 font-mono text-[10px]">{new Date(o.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'Sales' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">Merchant Financial Ledger</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400">Total Sales Value</span>
                <p className="text-2xl font-black text-emerald-400 font-mono mt-1">
                  TZS {summary?.totalSales.toLocaleString()}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400">Total Cost</span>
                <p className="text-2xl font-black text-rose-400 font-mono mt-1">
                  TZS {summary?.totalCost.toLocaleString()}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400">Gross Profit</span>
                <p className="text-2xl font-black text-amber-400 font-mono mt-1">
                  TZS {summary?.grossProfit.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Drivers' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">Merchant Drivers ({merchant.drivers?.length || 0})</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(merchant.drivers || []).map((d: any) => (
                <div key={d.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-xs">{d.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{d.phone}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Reports' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">Generate Merchant Audit Reports</h3>
            <div className="flex gap-3">
              <a
                href={`/api/admin/reports/pdf?merchantId=${merchantId}`}
                target="_blank"
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF Report
              </a>

              <a
                href={`/api/admin/reports/excel?merchantId=${merchantId}`}
                target="_blank"
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Excel Report
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
