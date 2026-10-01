'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trophy, Award, TrendingUp, ShoppingBag, DollarSign, RefreshCw, Eye } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function MerchantRankingsPage() {
  const [metric, setMetric] = useState<'SCORE' | 'ORDERS' | 'SALES' | 'DELIVERIES' | 'GROWTH'>('SCORE');
  const [period, setPeriod] = useState('THIS_MONTH');
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRankings = async () => {
    setLoading(true);
    try {
      const res = await fetchApi(`/admin/rankings?metric=${metric}&period=${period}&limit=50`);
      setRankings(res || []);
    } catch (err) {
      console.error('Failed to load rankings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRankings();
  }, [metric, period]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            Merchant Activity & Performance Rankings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic platform leaderboards ranking merchants by activity engagement score, orders, revenue, and growth.
          </p>
        </div>

        {/* Metric Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto">
          {(['SCORE', 'ORDERS', 'SALES', 'DELIVERIES', 'GROWTH'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                metric === m
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-4">Rank</th>
                <th className="p-4">Merchant / Business</th>
                <th className="p-4">Engagement Score</th>
                <th className="p-4">Total Orders</th>
                <th className="p-4">Total Sales (TZS)</th>
                <th className="p-4">Fulfillment Rate</th>
                <th className="p-4 text-right">360° Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                    Calculating merchant leaderboards...
                  </td>
                </tr>
              ) : rankings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No leaderboard data available for selected metric.
                  </td>
                </tr>
              ) : (
                rankings.map((r) => (
                  <tr key={r.merchantId} className="hover:bg-slate-850 transition-colors">
                    <td className="p-4">
                      <span
                        className={`w-7 h-7 rounded-xl font-black flex items-center justify-center text-xs ${
                          r.rank === 1
                            ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
                            : r.rank === 2
                            ? 'bg-slate-300 text-slate-950'
                            : r.rank === 3
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        #{r.rank}
                      </span>
                    </td>

                    <td className="p-4">
                      <p className="font-bold text-white text-sm">{r.businessName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{r.businessPhone}</p>
                    </td>

                    <td className="p-4">
                      <span className="text-sm font-black text-amber-400 font-mono">{r.totalScore} / 100</span>
                    </td>

                    <td className="p-4 font-bold text-white">{r.totalOrders}</td>

                    <td className="p-4 font-mono font-bold text-emerald-400">
                      TZS {r.totalSales.toLocaleString()}
                    </td>

                    <td className="p-4 font-bold text-teal-400">{r.completionRate}%</td>

                    <td className="p-4 text-right">
                      <Link
                        href={`/admin/merchants/${r.merchantId}`}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors inline-block"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                      </Link>
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
