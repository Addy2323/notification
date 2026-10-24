'use client';


import { T, useLanguage } from '@/components/LanguageProvider';
import React, { useState, useEffect } from 'react';
import { UserCheck, Search, Phone, Mail, RefreshCw } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function AdminCustomersPage() {
  const { t, label: uiLabel, locale } = useLanguage();

  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchApi(`/admin/search?q=${encodeURIComponent(searchQuery || 'a')}`);
      setCustomers(res?.customers || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
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
            <UserCheck className="w-6 h-6 text-teal-400" />{' '}<T k="admin.platform_customers_directory" />{' '}</h1>
          <p className="text-xs text-slate-400 mt-1">{' '}<T k="admin.browse_registered_customer_profiles_phone_numbers_and_associated_merchant_orders" />{' '}</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t("admin.search_customer_name_phone")}
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
                <th className="p-4"><T k="admin.customer_name" /></th>
                <th className="p-4"><T k="common.merchant" /></th>
                <th className="p-4"><T k="common.phone_number" /></th>
                <th className="p-4"><T k="admin.email" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />{' '}<T k="admin.loading_customers_directory" />{' '}</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-500">{' '}<T k="admin.no_customers_match_search_query" />{' '}</td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-850">
                    <td className="p-4 font-bold text-white">{c.name}</td>
                    <td className="p-4 font-bold text-amber-400">{c.merchant?.business_name || t("admin.direct")}</td>
                    <td className="p-4 font-mono">{c.phone}</td>
                    <td className="p-4 font-mono text-slate-400">{c.email || 'N/A'}</td>
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
