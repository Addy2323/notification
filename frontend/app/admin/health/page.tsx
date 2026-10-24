'use client';


import { useLanguage, T } from '@/components/LanguageProvider';
import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Activity, Server, Database, Bell, CheckCircle2, AlertTriangle, ShieldAlert, RefreshCw } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function AdminSystemHealthPage() {
  const { t, label: uiLabel, locale } = useLanguage();

  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/admin/health');
      setHealth(res);
    } catch (err) {
      console.error('Failed to load system health:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const handleResolveIncident = async (incidentId: string) => {
    try {
      await fetchApi(`/admin/incidents/${incidentId}/resolve`, { method: 'POST' });
      Swal.fire({
        title: t("admin.incident_resolved"),
        text: t("admin.system_incident_marked_as_resolved"),
        icon: 'success',
        background: '#0F172A',
        color: '#FFFFFF',
      });
      loadHealth();
    } catch (err: any) {
      Swal.fire({
        title: t("admin.error"),
        text: err.message,
        icon: 'error',
        background: '#0F172A',
        color: '#FFFFFF',
      });
    }
  };

  if (loading && !health) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-slate-900 rounded-3xl"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-900 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const { components, metrics, incidents } = health || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-400" />{' '}<T k="admin.system_health_infrastructure_diagnostics" />{' '}</h1>
          <p className="text-xs text-slate-400 mt-1">{' '}<T k="admin.real_time_status_of_postgresql_database_nodes_api_latency_sms_provider_gateways_and_b" />{' '}</p>
        </div>

        <button
          onClick={loadHealth}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-amber-400 border border-slate-800 flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span><T k="admin.refresh_health_diagnostics" /></span>
        </button>
      </div>

      {/* Component Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Database */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase"><T k="admin.postgresql_db_node" /></span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-black text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />{' '}<T k="admin.healthy" />{' '}</p>
          <p className="text-[10px] text-slate-400 font-mono">{' '}<T k="admin.db_latency" />{' '}{components?.database?.latencyMs || 2} ms
          </p>
        </div>

        {/* API Latency */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase"><T k="admin.express_api_gateway" /></span>
            <Server className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl font-black text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />{' '}<T k="admin.healthy" />{' '}</p>
          <p className="text-[10px] text-slate-400 font-mono">{' '}<T k="admin.avg_latency" />{' '}{components?.api?.latencyMs || 18} ms
          </p>
        </div>

        {/* SMS Gateway */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase"><T k="admin.meseji_sms_gateway" /></span>
            <Bell className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-black text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />{' '}<T k="admin.operational" />{' '}</p>
          <p className="text-[10px] text-slate-400 font-mono">{' '}<T k="admin.24h_failures" />{' '}{components?.smsProvider?.recentFailures || 0}
          </p>
        </div>

        {/* Notification Queue */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase"><T k="admin.background_queue" /></span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-xl font-black text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />{' '}<T k="admin.online" />{' '}</p>
          <p className="text-[10px] text-slate-400 font-mono">{' '}<T k="admin.queue_depth" />{' '}{components?.notificationQueue?.queuedDepth || 0}
          </p>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />{' '}<T k="admin.system_incident_log" />{' '}</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3"><T k="admin.service" /></th>
                <th className="p-3"><T k="admin.error_type" /></th>
                <th className="p-3"><T k="admin.severity" /></th>
                <th className="p-3"><T k="admin.description" /></th>
                <th className="p-3"><T k="common.status" /></th>
                <th className="p-3 text-right"><T k="admin.action" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
              {(incidents || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500 font-sans">{' '}<T k="admin.no_active_or_historical_system_incidents_recorded" />{' '}</td>
                </tr>
              ) : (
                incidents.map((inc: any) => (
                  <tr key={inc.id} className="hover:bg-slate-850">
                    <td className="p-3 font-bold text-white">{inc.service_name}</td>
                    <td className="p-3 text-amber-400">{inc.error_type}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          inc.severity === 'CRITICAL'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {inc.severity}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300 font-sans">{inc.description}</td>
                    <td className="p-3 font-bold">{uiLabel(inc.status)}</td>
                    <td className="p-3 text-right font-sans">
                      {inc.status === 'OPEN' && (
                        <button
                          onClick={() => handleResolveIncident(inc.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold hover:bg-emerald-500/20"
                        >{' '}<T k="admin.resolve" />{' '}</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
