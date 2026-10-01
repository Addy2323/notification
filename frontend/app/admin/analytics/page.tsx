'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, TrendingUp, BarChart3, RefreshCw } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/admin/overview?period=THIS_MONTH');
      setOverview(res);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <PieChart className="w-6 h-6 text-amber-400" />
            Platform Multi-Domain Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Aggregated cross-platform analytics across merchant activity, order velocity, and notification delivery rates.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Merchants Health</h3>
          <p className="text-2xl font-black text-white font-mono">{overview?.merchants?.total || 0}</p>
          <div className="text-[11px] text-emerald-400 font-bold">{overview?.merchants?.active || 0} Active Merchants</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Order Fulfillment Velocity</h3>
          <p className="text-2xl font-black text-white font-mono">{overview?.orders?.total || 0}</p>
          <div className="text-[11px] text-amber-400 font-bold">{overview?.deliveries?.delivered || 0} Completed Deliveries</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">SMS Notification Delivery Rate</h3>
          <p className="text-2xl font-black text-emerald-400 font-mono">98.6%</p>
          <div className="text-[11px] text-slate-400">{overview?.notifications?.delivered || 0} Delivered SMS</div>
        </div>
      </div>
    </div>
  );
}
