'use client';


import { T, useLanguage } from '@/components/LanguageProvider';
import React, { useState, useEffect } from 'react';
import { Truck, Search, Phone, ShieldCheck, RefreshCw } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function AdminDriversPage() {
  const { t, label: uiLabel, locale } = useLanguage();

  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchApi(`/admin/search?q=${encodeURIComponent(searchQuery || 'a')}`);
      setDrivers(res?.drivers || []);
    } catch (err) {
      console.error('Failed to load drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-indigo-400" />{' '}<T k="admin.platform_driver_fleet" />{' '}</h1>
          <p className="text-xs text-slate-400 mt-1">{' '}<T k="admin.monitor_registered_drivers_across_all_merchants_active_delivery_assignments_and_statu" />{' '}</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t("admin.search_driver_name_phone")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:border-amber-500"
          />
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-4"><T k="common.driver_name" /></th>
                <th className="p-4"><T k="common.merchant" /></th>
                <th className="p-4"><T k="common.phone_number" /></th>
                <th className="p-4"><T k="common.status" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />{' '}<T k="admin.loading_driver_fleet" />{' '}</td>
                </tr>
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-500">{' '}<T k="admin.no_drivers_match_search_query" />{' '}</td>
                </tr>
              ) : (
                drivers.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-850">
                    <td className="p-4 font-bold text-white">{d.name}</td>
                    <td className="p-4 font-bold text-amber-400">{d.merchant?.business_name || t("admin.system_driver")}</td>
                    <td className="p-4 font-mono">{d.phone}</td>
                    <td className="p-4 font-bold">
                      <span className="px-2.5 py-1 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {uiLabel(d.status)}
                      </span>
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
