'use client';


import { T } from '@/components/LanguageProvider';
import React, { useState, useEffect } from 'react';
import { Bell, RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function AdminNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/admin/overview?period=THIS_MONTH');
      setMetrics(res?.notifications || {});
    } catch (err) {
      console.error('Failed to load notifications metrics:', err);
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
            <Bell className="w-6 h-6 text-amber-400" />{' '}<T k="admin.sms_notification_monitoring" />{' '}</h1>
          <p className="text-xs text-slate-400 mt-1">{' '}<T k="admin.track_sms_delivery_rates_queue_depth_recipient_status_and_provider_response_times" />{' '}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5">
          <span className="text-xs text-slate-400 font-bold uppercase"><T k="admin.total_sms_sent" /></span>
          <p className="text-3xl font-black text-white mt-1 font-mono">{metrics?.total || 0}</p>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5">
          <span className="text-xs text-slate-400 font-bold uppercase"><T k="admin.delivered_sms" /></span>
          <p className="text-3xl font-black text-emerald-400 mt-1 font-mono">{metrics?.delivered || 0}</p>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5">
          <span className="text-xs text-slate-400 font-bold uppercase"><T k="admin.queued_sms" /></span>
          <p className="text-3xl font-black text-amber-400 mt-1 font-mono">{metrics?.queued || 0}</p>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5">
          <span className="text-xs text-slate-400 font-bold uppercase"><T k="admin.failed_sms" /></span>
          <p className="text-3xl font-black text-rose-400 mt-1 font-mono">{metrics?.failed || 0}</p>
        </div>
      </div>
    </div>
  );
}
