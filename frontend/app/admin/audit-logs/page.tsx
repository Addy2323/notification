'use client';


import { T, useLanguage } from '@/components/LanguageProvider';
import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, Clock, User, Shield } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function AdminAuditLogsPage() {
  const { t, label: uiLabel, locale } = useLanguage();

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/admin/audit-logs');
      setLogs(res || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-400" />{' '}<T k="admin.administrative_audit_security_logs" />{' '}</h1>
          <p className="text-xs text-slate-400 mt-1">{' '}<T k="admin.immutable_audit_trail_of_administrator_actions_merchant_status_changes_and_system_mod" />{' '}</p>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-4"><T k="admin.timestamp" /></th>
                <th className="p-4"><T k="admin.action_executed" /></th>
                <th className="p-4"><T k="admin.object_type" /></th>
                <th className="p-4"><T k="admin.target_merchant" /></th>
                <th className="p-4"><T k="admin.admin_user" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />{' '}<T k="admin.loading_audit_trail" />{' '}</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500 font-sans">{' '}<T k="admin.no_administrative_audit_logs_recorded_yet" />{' '}</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-850">
                    <td className="p-4 text-slate-400">{new Date(log.timestamp).toLocaleString(locale)}</td>
                    <td className="p-4 font-bold text-amber-400">{log.action}</td>
                    <td className="p-4 font-bold text-white">{log.object_type}</td>
                    <td className="p-4 text-slate-300 font-sans">{log.merchant?.business_name || log.merchant_id || t("admin.system")}</td>
                    <td className="p-4 text-slate-400 font-sans">{log.user?.name || log.admin_id}</td>
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
