'use client';

import React, { useEffect, useState } from 'react';
import {
  Star,
  Shield,
  Users,
  Store,
  Truck,
  MessageSquare,
  AlertTriangle,
  Filter,
  RefreshCw,
  Search,
  Loader2,
  AlertCircle,
  TrendingUp,
  Award,
  Package,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface RatingLogItem {
  id: string;
  order_number: string;
  merchant_name: string;
  customer_name: string;
  customer_phone: string;
  driver_name?: string | null;
  rating: number;
  comment?: string | null;
  created_at: string;
}

interface MerchantPerformance {
  merchant_id: string;
  business_name: string;
  total_ratings: number;
  average_rating: number;
}

interface DriverPerformance {
  driver_id: string;
  driver_name: string;
  merchant_name: string;
  total_ratings: number;
  average_rating: number;
}

interface AdminRatingsData {
  overall_rating: number;
  total_ratings: number;
  low_ratings_count: number;
  breakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  merchant_performance: MerchantPerformance[];
  driver_performance: DriverPerformance[];
  ratings_log: RatingLogItem[];
}

export default function AdminRatingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminRatingsData | null>(null);

  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [ratingFilter, setRatingFilter] = useState<'ALL' | '5' | '4' | '3' | 'LOW'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadAdminRatings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi(`/ratings/admin?period=${period}`);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin rating analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminRatings();
  }, [period]);

  const filteredLogs = (data?.ratings_log || []).filter((item) => {
    let matchesRating = true;
    if (ratingFilter === '5') matchesRating = item.rating === 5;
    else if (ratingFilter === '4') matchesRating = item.rating === 4;
    else if (ratingFilter === '3') matchesRating = item.rating === 3;
    else if (ratingFilter === 'LOW') matchesRating = item.rating <= 2;

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.order_number?.toLowerCase().includes(q) ||
      item.merchant_name?.toLowerCase().includes(q) ||
      item.customer_name?.toLowerCase().includes(q) ||
      item.driver_name?.toLowerCase().includes(q) ||
      item.comment?.toLowerCase().includes(q);

    return matchesRating && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Top Banner & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4 text-amber-400" />
            LUMO Executive Control • Quality Diagnostics
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Platform Customer Ratings</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor ecosystem satisfaction, merchant quality benchmarks, and low-score alerts.
          </p>
        </div>

        {/* Period Filter Tabs & Refresh */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800 w-fit">
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPeriod(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={loadAdminRatings}
            title="Refresh Diagnostics"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg ml-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && !data && (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-400">Loading platform quality diagnostics...</p>
        </div>
      )}

      {error && !data && (
        <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-200 text-center">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <h3 className="font-bold text-sm">Failed to Load Platform Ratings</h3>
          <p className="text-xs text-rose-300 mt-1">{error}</p>
        </div>
      )}

      {data && (
        <>
          {/* Key KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Overall Platform Rating */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-15">
                <Star className="w-24 h-24 fill-slate-950" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-900/80">
                Platform Score
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-black text-slate-950">{data.overall_rating.toFixed(1)}</span>
                <span className="text-slate-900/70 font-bold text-sm">/ 5.0</span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-slate-950">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(data.overall_rating) ? 'fill-slate-950' : 'opacity-30'
                    }`}
                  />
                ))}
                <span className="text-xs font-bold ml-1 text-slate-900">
                  ({data.total_ratings} {data.total_ratings === 1 ? 'rating' : 'ratings'})
                </span>
              </div>
            </div>

            {/* Total Ratings Logged */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total Ratings</span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-white">{data.total_ratings}</div>
              <p className="text-xs text-slate-400 mt-1">
                Ratings collected across all merchants
              </p>
            </div>

            {/* Low Rating Flags Alert Card */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Low Ratings (1-2★)</span>
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-rose-400">{data.low_ratings_count}</div>
              <p className="text-xs text-slate-400 mt-1">
                Deliveries flagged for service review
              </p>
            </div>

            {/* Rated Merchants Count */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Active Merchants</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Store className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-white">{data.merchant_performance.length}</div>
              <p className="text-xs text-slate-400 mt-1">
                Merchants with customer ratings
              </p>
            </div>
          </div>

          {/* Rating Breakdown & Merchant Leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rating Breakdown */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xs space-y-4">
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Filter className="w-4 h-4 text-amber-400" />
                Platform Star Distribution
              </h2>

              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = (data.breakdown as any)[stars] || 0;
                  const pct = data.total_ratings > 0 ? Math.round((count / data.total_ratings) * 100) : 0;
                  return (
                    <div key={stars} className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1 w-14 font-bold text-slate-300">
                        <span>{stars}</span>
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      </div>
                      <div className="flex-1 h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            stars >= 4 ? 'bg-emerald-500' : stars === 3 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="w-16 text-right font-mono font-bold text-slate-400">
                        {count} <span className="text-[10px] text-slate-500">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Merchant Quality Leaderboard */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Store className="w-4 h-4 text-amber-400" />
                  Merchant Quality Leaderboard
                </h2>
                <span className="text-xs font-bold text-slate-500">
                  Top Rated Logistics Businesses
                </span>
              </div>

              {data.merchant_performance.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No merchant rating records available.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="pb-3">Merchant</th>
                        <th className="pb-3 text-center">Total Ratings</th>
                        <th className="pb-3 text-center">Satisfaction</th>
                        <th className="pb-3 text-right">Avg Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {data.merchant_performance.map((m) => (
                        <tr key={m.merchant_id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 font-bold text-white flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xs">
                              {m.business_name?.[0] || 'M'}
                            </div>
                            <span>{m.business_name}</span>
                          </td>
                          <td className="py-3 text-center font-bold text-slate-300">{m.total_ratings}</td>
                          <td className="py-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                m.average_rating >= 4.5
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : m.average_rating >= 3.5
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {m.average_rating >= 4.5 ? 'Top Tier' : m.average_rating >= 3.5 ? 'Good' : 'Needs Work'}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 font-bold text-amber-400">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span>{m.average_rating.toFixed(1)}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Driver Quality Performance Section */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xs space-y-4">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-400" />
              Platform Driver Performance Rankings
            </h2>

            {data.driver_performance.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                No driver ratings logged.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.driver_performance.slice(0, 6).map((driver) => (
                  <div
                    key={driver.driver_id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 text-white flex items-center justify-center font-bold text-sm">
                        {driver.driver_name?.[0] || 'D'}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs">{driver.driver_name}</h4>
                        <p className="text-[10px] text-slate-400">{driver.merchant_name}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1 text-amber-400 text-xs font-black">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{driver.average_rating.toFixed(1)}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {driver.total_ratings} ratings
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detailed Platform Ratings Log & Search */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  All Customer Feedback Logs
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete real-time feed of customer reviews across the platform.
                </p>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search logs..."
                    className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setRatingFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      ratingFilter === 'ALL' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setRatingFilter('5')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                      ratingFilter === '5' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    5★
                  </button>
                  <button
                    onClick={() => setRatingFilter('LOW')}
                    className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                      ratingFilter === 'LOW' ? 'bg-rose-500 text-white' : 'text-rose-400 hover:text-rose-300'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Low (1-2★)
                  </button>
                </div>
              </div>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-400">No rating logs match your search or filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-4 rounded-xl bg-slate-950 border transition-all flex flex-col justify-between space-y-3 ${
                      log.rating <= 2
                        ? 'border-rose-800/60 bg-rose-950/20'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{log.customer_name}</span>
                            <span className="text-[11px] font-mono text-slate-400">{log.customer_phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                            <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-400 border border-slate-800 text-[10px] font-bold">
                              {log.merchant_name}
                            </span>
                            <span>Order #{log.order_number}</span>
                          </div>
                        </div>

                        {/* Star Rating Chip */}
                        <div
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-black ${
                            log.rating >= 4
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : log.rating === 3
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{log.rating}</span>
                        </div>
                      </div>

                      {/* Feedback Comment */}
                      {log.comment && log.comment.trim().length > 0 ? (
                        <div className="mt-3 p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 italic">
                          "{log.comment}"
                        </div>
                      ) : (
                        <div className="mt-2 text-[11px] text-slate-500 italic">No written comment left</div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Truck className="w-3 h-3 text-slate-500" />
                        Driver: <strong className="text-slate-200">{log.driver_name || 'Unassigned'}</strong>
                      </span>
                      <span>{new Date(log.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
