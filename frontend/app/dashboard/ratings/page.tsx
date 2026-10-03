'use client';

import React, { useEffect, useState } from 'react';
import {
  Star,
  Users,
  MessageSquare,
  TrendingUp,
  Filter,
  Calendar,
  Loader2,
  AlertCircle,
  Truck,
  Package,
  Award,
  ThumbsUp,
  RefreshCw,
  Search,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface FeedbackItem {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  driver_name?: string | null;
  product_name: string;
  rating: number;
  comment?: string | null;
  created_at: string;
}

interface DriverRating {
  driver_id: string;
  driver_name: string;
  driver_phone?: string;
  total_ratings: number;
  average_rating: number;
}

interface MerchantRatingsData {
  average_rating: number;
  total_ratings: number;
  breakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  driver_ratings: DriverRating[];
  feedback: FeedbackItem[];
}

export default function MerchantRatingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MerchantRatingsData | null>(null);

  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [starFilter, setStarFilter] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi(`/ratings/merchant?period=${period}`);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load rating analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period]);

  const filteredFeedback = (data?.feedback || []).filter((item) => {
    const matchesStar = starFilter === 'ALL' || item.rating === starFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.order_number?.toLowerCase().includes(q) ||
      item.customer_name?.toLowerCase().includes(q) ||
      item.driver_name?.toLowerCase().includes(q) ||
      item.comment?.toLowerCase().includes(q);

    return matchesStar && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans text-slate-900 pb-12">
      {/* Top Banner & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">
            <Star className="w-4 h-4 fill-orange-500 text-orange-500" />
            Quality Control & Customer Experience
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Customer Ratings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor delivery performance, customer satisfaction, and driver service quality.
          </p>
        </div>

        {/* Period Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80 w-fit">
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
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={loadData}
            title="Refresh"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg ml-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && !data && (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 text-[#FF5500] animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500">Loading rating metrics...</p>
        </div>
      )}

      {error && !data && (
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-center">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
          <h3 className="font-bold text-sm">Failed to Load Customer Ratings</h3>
          <p className="text-xs text-rose-600 mt-1">{error}</p>
        </div>
      )}

      {data && (
        <>
          {/* Key Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Average Rating Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0F172A] to-slate-900 text-white shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Star className="w-24 h-24 fill-white" />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Rating</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-black text-white">{data.average_rating.toFixed(1)}</span>
                <span className="text-slate-400 font-bold text-sm">/ 5.0</span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(data.average_rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-700'
                    }`}
                  />
                ))}
                <span className="text-xs text-slate-300 font-bold ml-1.5">
                  ({data.total_ratings} {data.total_ratings === 1 ? 'rating' : 'ratings'})
                </span>
              </div>
            </div>

            {/* Total Ratings Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Customer Reviews</span>
                <div className="p-2 rounded-xl bg-orange-50 text-[#FF5500]">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900">{data.total_ratings}</div>
              <p className="text-xs text-slate-500 mt-1">
                Completed delivery ratings
              </p>
            </div>

            {/* Top Driver Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Top Rated Driver</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg font-black text-slate-900 truncate">
                {data.driver_ratings[0]?.driver_name || 'N/A'}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-600 font-bold">
                {data.driver_ratings[0] ? (
                  <>
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{data.driver_ratings[0].average_rating.toFixed(1)} rating</span>
                    <span className="text-slate-400">({data.driver_ratings[0].total_ratings} orders)</span>
                  </>
                ) : (
                  <span className="text-slate-400 font-normal">No driver ratings yet</span>
                )}
              </div>
            </div>

            {/* Feedback Response Rate Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Comments Left</span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900">
                {data.feedback.filter((f) => f.comment && f.comment.trim().length > 0).length}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Detailed customer feedback notes
              </p>
            </div>
          </div>

          {/* Rating Breakdown & Driver Performance Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rating Breakdown Card */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#FF5500]" />
                Rating Distribution
              </h2>

              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = (data.breakdown as any)[stars] || 0;
                  const pct = data.total_ratings > 0 ? Math.round((count / data.total_ratings) * 100) : 0;
                  return (
                    <div key={stars} className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1 w-14 font-bold text-slate-700">
                        <span>{stars}</span>
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      </div>
                      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            stars >= 4 ? 'bg-emerald-500' : stars === 3 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="w-16 text-right font-mono font-bold text-slate-600">
                        {count} <span className="text-[10px] text-slate-400">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Driver Performance Ranking */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#FF5500]" />
                  Driver Performance Quality
                </h2>
                <span className="text-xs font-bold text-slate-400">
                  {data.driver_ratings.length} {data.driver_ratings.length === 1 ? 'Driver' : 'Drivers'} Rated
                </span>
              </div>

              {data.driver_ratings.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No driver ratings recorded for this period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="pb-3">Driver Name</th>
                        <th className="pb-3">Phone</th>
                        <th className="pb-3 text-center">Total Ratings</th>
                        <th className="pb-3 text-right">Avg Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.driver_ratings.map((driver) => (
                        <tr key={driver.driver_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 font-bold text-slate-900 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center font-black text-xs border border-slate-200">
                              {driver.driver_name?.[0] || 'D'}
                            </div>
                            <span>{driver.driver_name}</span>
                          </td>
                          <td className="py-3 text-slate-500 font-mono">{driver.driver_phone || 'N/A'}</td>
                          <td className="py-3 text-center font-bold text-slate-700">{driver.total_ratings}</td>
                          <td className="py-3 text-right">
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                              <span>{driver.average_rating.toFixed(1)}</span>
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

          {/* Customer Feedback Log Section */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#FF5500]" />
                  Recent Customer Feedback
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Individual customer ratings and delivery comments.
                </p>
              </div>

              {/* Star Rating Filter Chips & Search Input */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search feedback..."
                    className="pl-8 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#FF5500]"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setStarFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      starFilter === 'ALL' ? 'bg-[#0F172A] text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Stars
                  </button>
                  {[5, 4, 3, 2, 1].map((star) => (
                    <button
                      key={star}
                      onClick={() => setStarFilter(star)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-0.5 transition-all ${
                        starFilter === star
                          ? 'bg-amber-500 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>{star}</span>
                      <Star className={`w-3 h-3 ${starFilter === star ? 'fill-white' : 'fill-amber-400 text-amber-400'}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredFeedback.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500">No customer feedback matching criteria</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Try resetting your filter or period</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredFeedback.map((fb) => (
                  <div
                    key={fb.id}
                    className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900">{fb.customer_name}</span>
                            <span className="text-[11px] font-mono text-slate-400">{fb.customer_phone}</span>
                          </div>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Package className="w-3 h-3 text-orange-500" />
                            Order #{fb.order_number} ({fb.product_name})
                          </p>
                        </div>

                        {/* Star Rating Badge */}
                        <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-full border border-amber-200 shadow-2xs">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <span className="text-xs font-black text-slate-900">{fb.rating}</span>
                        </div>
                      </div>

                      {/* Feedback Comment Box */}
                      {fb.comment && fb.comment.trim().length > 0 ? (
                        <div className="mt-3 p-3 rounded-lg bg-white border border-slate-200/90 text-xs text-slate-800 italic relative">
                          "{fb.comment}"
                        </div>
                      ) : (
                        <div className="mt-2 text-[11px] text-slate-400 italic">No written comment provided</div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Truck className="w-3 h-3 text-slate-400" />
                        Driver: <strong className="text-slate-900">{fb.driver_name || 'Unassigned'}</strong>
                      </span>
                      <span>{new Date(fb.created_at).toLocaleDateString()}</span>
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
