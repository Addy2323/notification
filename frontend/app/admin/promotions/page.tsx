'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Megaphone, RefreshCw, Activity } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { VerifiedBadge } from '@/components/common/VerifiedBadge';

export default function AdminPromotionsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/promotions/admin/overview');
      setData(res?.data || res);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = data?.stats || {};
  const campaigns = data?.campaigns || [];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-[#FF5500]" />
            Admin Marketing & Bulk SMS Oversight
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor platform-wide SMS promotion campaigns, delivery rates, and SMS gateway health.
          </p>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Campaigns', value: stats.totalCampaigns || 0 },
          { label: 'Target Messages', value: stats.totalMessages || 0 },
          { label: 'SMS Units Used', value: stats.totalSmsUsageUnits || 0 },
          { label: 'Delivered', value: stats.successfulDeliveries || 0 },
          { label: 'Failed', value: stats.failedDeliveries || 0 },
          { label: 'Provider Status', value: stats.providerStatus || 'CONNECTED' },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500">{k.label}</p>
            <p className="text-base font-black text-slate-900 mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm overflow-x-auto space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-900">Recent Merchant Campaigns</h2>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
            <Activity className="w-3.5 h-3.5" />
            {stats.providerName || 'Meseji SMS'}
          </span>
        </div>

        {loading ? (
          <p className="text-xs text-slate-500 py-6 text-center">Loading campaigns...</p>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-bold text-slate-500 uppercase text-[11px]">
              <tr>
                <th className="px-3 py-2.5">Merchant</th>
                <th className="px-3 py-2.5">Campaign</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Recipients</th>
                <th className="px-3 py-2.5">Sent / Failed</th>
                <th className="px-3 py-2.5">Units / Cost</th>
                <th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-bold text-slate-900 flex items-center gap-1">
                    {c.merchant?.business_name || 'Merchant'}
                    {c.merchant?.is_verified && <VerifiedBadge size="xs" />}
                  </td>
                  <td className="px-3 py-2.5 font-semibold">{c.name}</td>
                  <td className="px-3 py-2.5 text-slate-500">{c.promotionType}</td>
                  <td className="px-3 py-2.5">{c.totalRecipients}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-emerald-700 font-semibold">{c.sentCount}</span> /{' '}
                    <span className="text-rose-700 font-semibold">{c.failedCount}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    {c.totalUnitsUsed}u (TZS {Number(c.totalCostTzs || 0).toLocaleString()})
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

