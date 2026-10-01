'use client';

import React, { useState, useEffect } from 'react';
import { Eye, BarChart3, TrendingUp, Users, ArrowRight, RefreshCw, Activity } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function AdminTrafficPage() {
  const [trafficData, setTrafficData] = useState<any>(null);
  const [liveStream, setLiveStream] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [trafficRes, liveRes] = await Promise.all([
        fetchApi('/admin/traffic?period=THIS_MONTH'),
        fetchApi('/admin/traffic/live'),
      ]);
      setTrafficData(trafficRes);
      setLiveStream(liveRes?.stream || []);
    } catch (err) {
      console.error('Failed to load traffic analytics:', err);
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
            <BarChart3 className="w-6 h-6 text-amber-400" />
            Traffic & Conversion Funnel Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitor website visitors, platform traffic sources, active sessions, and multi-stage conversion funnels.
          </p>
        </div>
      </div>

      {/* Traffic KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5">
          <span className="text-xs text-slate-400 font-bold uppercase">Total Page Views</span>
          <p className="text-3xl font-black text-white mt-1 font-mono">
            {Number(trafficData?.pageViews || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5">
          <span className="text-xs text-slate-400 font-bold uppercase">Unique Visitors</span>
          <p className="text-3xl font-black text-amber-400 mt-1 font-mono">
            {Number(trafficData?.estimatedUniqueVisitors || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5">
          <span className="text-xs text-slate-400 font-bold uppercase">Active Sessions</span>
          <p className="text-3xl font-black text-emerald-400 mt-1 font-mono">
            {Number(trafficData?.sessionsCount || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5">
          <span className="text-xs text-slate-400 font-bold uppercase">Overall Conversion</span>
          <p className="text-3xl font-black text-teal-400 mt-1 font-mono">
            {trafficData?.funnel?.length
              ? `${trafficData.funnel[trafficData.funnel.length - 1]?.conversionRate || 0}%`
              : '0%'}
          </p>
        </div>
      </div>

      {/* Conversion Funnel Visualization */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          Platform Traffic Conversion Funnel
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-2">
          {(trafficData?.funnel || []).map((stage: any, idx: number) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 relative">
              <span className="text-[10px] font-bold uppercase text-slate-500 block truncate">
                Stage {idx + 1}: {stage.step}
              </span>
              <p className="text-xl font-black text-amber-400 font-mono mt-1">
                {Number(stage.count || 0).toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-400 block mt-2">
                {stage.conversionRate}% Conversion
              </span>
            </div>
          ))}
          {(!trafficData?.funnel || trafficData.funnel.length === 0) && (
            <div className="col-span-full p-4 text-center text-xs text-slate-500">
              No traffic funnel events recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
