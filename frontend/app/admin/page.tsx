'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, Users, Truck, AlertTriangle, CheckCircle2, RefreshCw, Lock, Unlock, FileText, ArrowLeft } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function AdminConsolePage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'MERCHANTS' | 'AUDIT'>('MERCHANTS');

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [m, merch, logs] = await Promise.all([
        fetchApi('/admin/metrics'),
        fetchApi('/admin/merchants'),
        fetchApi('/admin/audit-logs'),
      ]);
      setMetrics(m);
      setMerchants(merch || []);
      setAuditLogs(logs || []);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (!window.confirm(`Are you sure you want to change merchant status to ${newStatus}?`)) return;

    try {
      await fetchApi(`/admin/merchants/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to update merchant status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 text-slate-400 hover:text-white rounded-xl border border-slate-800 hover:bg-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">LUMO Platform Admin Console</h1>
            <p className="text-xs text-slate-400 font-medium">System oversight, merchant control & audit logs</p>
          </div>
        </div>

        <button
          onClick={loadAdminData}
          className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-bold text-slate-300 rounded-xl flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh System Data</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase">Total Merchants</span>
            <Users className="w-4 h-4 text-lumo-400" />
          </div>
          <p className="text-2xl font-black text-white">{metrics?.totalMerchants || 0}</p>
          <p className="text-[10px] text-emerald-400 mt-1 font-semibold">{metrics?.activeMerchants || 0} Active</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase">Total Deliveries</span>
            <Truck className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white">{metrics?.totalDeliveries || 0}</p>
          <p className="text-[10px] text-slate-400 mt-1">Platform Total</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-xs font-bold uppercase">Completed</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{metrics?.deliveredCount || 0}</p>
          <p className="text-[10px] text-slate-400 mt-1">Successful Deliveries</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-rose-400 mb-1">
            <span className="text-xs font-bold uppercase">Failed / Cancelled</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-rose-400">{metrics?.failedCount || 0}</p>
          <p className="text-[10px] text-slate-400 mt-1">Exception Cases</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('MERCHANTS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'MERCHANTS'
              ? 'bg-amber-500 text-slate-950 shadow-glow'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          MERCHANTS MANAGEMENT ({merchants.length})
        </button>
        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'AUDIT'
              ? 'bg-amber-500 text-slate-950 shadow-glow'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          SYSTEM AUDIT LOGS ({auditLogs.length})
        </button>
      </div>

      {/* Merchants Tab Content */}
      {activeTab === 'MERCHANTS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-800">
                  <th className="p-4">Business Name</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Deliveries</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300 font-medium">
                {merchants.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-850">
                    <td className="p-4 font-bold text-white">{item.business_name}</td>
                    <td className="p-4 font-mono">{item.business_phone}</td>
                    <td className="p-4">{item.location || 'N/A'}</td>
                    <td className="p-4 font-mono font-bold text-amber-400">{item._count?.deliveries || 0}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          item.status === 'ACTIVE'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => toggleStatus(item.id, item.status)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ml-auto ${
                          item.status === 'ACTIVE'
                            ? 'bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800'
                            : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {item.status === 'ACTIVE' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        <span>{item.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Tab Content */}
      {activeTab === 'AUDIT' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-amber-400 font-mono">{log.action}</span>
                  <span className="text-slate-400 ml-2">by {log.user?.name || log.merchant?.business_name || 'System'}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
