'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Store,
  MapPin,
  Users,
  Package,
  SlidersHorizontal,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { VerifiedBadge } from '@/components/common/VerifiedBadge';
import { API_BASE } from '@/lib/api';

const ASSET_ORIGIN = API_BASE.replace(/\/api\/?$/, '');
function resolveAssetUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  return `${ASSET_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default function PublicMerchantMarketplacePage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [locationFilter, setLocationFilter] = useState('');
  const [sortBy, setSortBy] = useState<'popularity' | 'recent' | 'engagement'>('popularity');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetch(`${API_BASE}/marketplace/categories`)
      .then((r) => r.json())
      .then((json) => {
        if (json?.success && json.data?.categories) {
          setCategories(json.data.categories);
        }
      })
      .catch(() => {});
  }, []);

  const fetchMerchants = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (debouncedSearch.trim()) qs.set('q', debouncedSearch.trim());
      if (selectedCategory) qs.set('category', selectedCategory);
      if (selectedSubcategory) qs.set('subcategory', selectedSubcategory);
      if (verifiedOnly) qs.set('verified', 'true');
      if (locationFilter) qs.set('location', locationFilter);
      qs.set('sort', sortBy);
      qs.set('page', String(page));
      qs.set('limit', '18');

      const res = await fetch(`${API_BASE}/marketplace/merchants?${qs.toString()}`);
      const json = await res.json();
      if (json?.success && json.data) {
        setMerchants(json.data.items || []);
        setTotal(json.data.total || 0);
        setTotalPages(json.data.totalPages || 1);
        if (Array.isArray(json.data.locations)) {
          setLocations(json.data.locations);
        }
      }
    } catch {
      setMerchants([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedCategory, selectedSubcategory, verifiedOnly, locationFilter, sortBy, page]);

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  const activeCategoryObj = categories.find((c) => c.slug === selectedCategory);
  const subcategories = activeCategoryObj?.subcategories || [];

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setSelectedCategory('');
    setSelectedSubcategory('');
    setVerifiedOnly(false);
    setLocationFilter('');
    setSortBy('popularity');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Header />

      {/* Marketplace Hero Section */}
      <section className="bg-[#0B192C] text-white border-b border-[#1B2E4B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#13294B] border border-[#24467A] text-xs font-bold text-[#FF8A4C]">
              <Sparkles className="w-3.5 h-3.5" />
              LUMO Track Merchant Marketplace
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Discover Trusted Merchants. Shop with Confidence.
            </h1>
            <p className="text-sm sm:text-base text-[#A0B8D0] max-w-2xl mx-auto">
              Explore businesses, discover amazing products and connect with merchants across Tanzania.
            </p>

            {/* Search Bar */}
            <div className="pt-4">
              <div className="relative flex flex-col sm:flex-row gap-2 bg-white/10 p-2 rounded-2xl border border-white/15 backdrop-blur-md">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-300 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search merchants, products, or categories..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setVerifiedOnly((v) => !v)}
                  className={`px-4 py-3 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 transition shrink-0 ${
                    verifiedOnly
                      ? 'bg-[#0095F6] text-white shadow-md'
                      : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Verified Only
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Dynamic Categories Strip */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Browse Categories</h2>
              <p className="text-xs text-slate-500">Select a business category to filter trusted storefronts</p>
            </div>
            {(selectedCategory || selectedSubcategory || verifiedOnly || locationFilter || debouncedSearch) && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-xs font-semibold text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
                Reset Filters
              </button>
            )}
          </div>

          <div className="flex overflow-x-auto gap-2.5 pb-2 sm:pb-0 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('');
                setSelectedSubcategory('');
                setPage(1);
              }}
              className={`shrink-0 w-36 sm:w-auto p-3.5 rounded-2xl border text-left transition active:scale-[0.98] ${
                !selectedCategory
                  ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-md'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <Store className={`w-4 h-4 ${!selectedCategory ? 'text-[#FF5500]' : 'text-slate-500'}`} />
              </div>
              <p className="text-xs font-bold line-clamp-1">All Merchants</p>
              <p className={`text-[11px] mt-0.5 ${!selectedCategory ? 'text-slate-300' : 'text-slate-500'}`}>
                Explore all stores
              </p>
            </button>

            {categories.map((cat) => {
              const active = selectedCategory === cat.slug;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(active ? '' : cat.slug);
                    setSelectedSubcategory('');
                    setPage(1);
                  }}
                  className={`shrink-0 w-40 sm:w-auto p-3.5 rounded-2xl border text-left transition active:scale-[0.98] ${
                    active
                      ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-md'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    {cat.imageUrl ? (
                      <img
                        src={resolveAssetUrl(cat.imageUrl)}
                        alt={cat.name}
                        className="w-6 h-6 rounded-md object-cover"
                      />
                    ) : (
                      <Store className={`w-4 h-4 ${active ? 'text-[#FF5500]' : 'text-[#FF5500]'}`} />
                    )}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {cat.merchantCount || 0}
                    </span>
                  </div>
                  <p className="text-xs font-bold line-clamp-1">{cat.name}</p>
                  <p className={`text-[10px] mt-0.5 line-clamp-1 ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                    {cat.subcategories?.length ? `${cat.subcategories.length} subcategories` : 'Browse stores'}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Subcategory Pills */}
          {subcategories.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-bold text-slate-500">Subcategories:</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedSubcategory('');
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  !selectedSubcategory
                    ? 'bg-[#FF5500] text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                All {activeCategoryObj?.name}
              </button>
              {subcategories.map((sub: any) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    setSelectedSubcategory(selectedSubcategory === sub.slug ? '' : sub.slug);
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                    selectedSubcategory === sub.slug
                      ? 'bg-[#FF5500] text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {sub.name} ({sub.merchantCount || 0})
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Directory Controls */}
        <section className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <SlidersHorizontal className="w-4 h-4 text-[#FF5500]" />
              <span>
                Showing <strong className="text-slate-900">{merchants.length}</strong> of{' '}
                <strong className="text-slate-900">{total}</strong> active merchants
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {locations.length > 0 && (
                <select
                  value={locationFilter}
                  onChange={(e) => {
                    setLocationFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  <option value="">All Locations</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as any);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
              >
                <option value="popularity">Sort: Most Popular</option>
                <option value="engagement">Sort: Highest Engagement</option>
                <option value="recent">Sort: Recently Joined</option>
              </select>
            </div>
          </div>

          {/* Merchant Directory Cards */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-2/3" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-10 bg-slate-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : merchants.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
              <Store className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">No merchants match your filters</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Try clearing your search or selecting another category to discover approved merchants across Tanzania.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="px-5 py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-bold hover:bg-slate-800"
              >
                View All Merchants
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {merchants.map((m) => (
                <div
                  key={m.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="h-20 bg-gradient-to-r from-[#0B192C] to-[#1E3A5F] relative">
                      {m.coverImageUrl && (
                        <img
                          src={resolveAssetUrl(m.coverImageUrl)}
                          alt={m.businessName}
                          className="w-full h-full object-cover opacity-80"
                        />
                      )}
                    </div>
                    <div className="px-5 pb-5 -mt-8 relative">
                      <div className="flex items-end justify-between gap-2">
                        <div className="w-16 h-16 rounded-full border-4 border-white bg-[#0F172A] text-white overflow-hidden shadow-md flex items-center justify-center shrink-0">
                          {m.logoUrl ? (
                            <img
                              src={resolveAssetUrl(m.logoUrl)}
                              alt={m.businessName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Store className="w-7 h-7" />
                          )}
                        </div>
                        {m.primaryCategory && (
                          <span className="px-2.5 py-1 rounded-full bg-orange-50 text-[#FF5500] text-[10px] font-bold border border-orange-100 truncate max-w-[160px]">
                            {m.primaryCategory.name}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-base font-extrabold text-slate-900 truncate">
                            {m.businessName}
                          </h3>
                          {m.isVerified && <VerifiedBadge size="sm" />}
                        </div>
                        <p className="text-xs text-slate-500 font-mono">@{m.slug}</p>
                        {m.description && (
                          <p className="text-xs text-slate-600 line-clamp-2 pt-1">{m.description}</p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                        <div className="bg-slate-50 rounded-xl py-2 px-1">
                          <p className="text-xs font-extrabold text-slate-900">
                            {Number(m.stats?.followersCount || 0).toLocaleString('en-US')}
                          </p>
                          <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                            <Users className="w-3 h-3" /> Followers
                          </p>
                        </div>
                        <div className="bg-slate-50 rounded-xl py-2 px-1">
                          <p className="text-xs font-extrabold text-slate-900">
                            {Number(m.stats?.productsCount || 0).toLocaleString('en-US')}
                          </p>
                          <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                            <Package className="w-3 h-3" /> Products
                          </p>
                        </div>
                        <div className="bg-slate-50 rounded-xl py-2 px-1 flex flex-col justify-center">
                          <p className="text-[11px] font-bold text-slate-800 truncate px-1">
                            {m.location || 'Tanzania'}
                          </p>
                          <p className="text-[10px] text-slate-500 flex items-center justify-center gap-0.5">
                            <MapPin className="w-3 h-3" /> Location
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 pb-5 flex items-center gap-2">
                    <Link
                      href={`/merchants/${m.slug}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-bold hover:bg-slate-800 transition"
                    >
                      View Store
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs font-semibold text-slate-600">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

