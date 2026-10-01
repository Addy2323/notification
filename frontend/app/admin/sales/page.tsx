'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Download, Calendar, RefreshCw } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function GlobalSalesPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('THIS_MONTH');
  const [salesMetrics, setSalesMetrics] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchApi(`/admin/overview?period=${period}`);
      setSalesMetrics(res?.orders || {});
    } catch (err) {
      console.error('Failed to load sales analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            Platform Sales & Financial Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time financial performance, total revenue, product costs, and gross profit breakdown.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/admin/reports/excel?period=${period}&reportType=SALES`}
            target="_blank"
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Financial Ledger (Excel)
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Revenue / Sales</span>
          <p className="text-3xl font-black text-emerald-400 font-mono mt-2">
            TZS {(salesMetrics?.totalSalesValue || 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Product Cost</span>
          <p className="text-3xl font-black text-rose-400 font-mono mt-2">
            TZS {(salesMetrics?.totalProductCost || 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Net Gross Profit</span>
          <p className="text-3xl font-black text-amber-400 font-mono mt-2">
            TZS {(salesMetrics?.totalGrossProfit || 0).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
