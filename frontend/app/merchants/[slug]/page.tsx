'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Store,
  MapPin,
  Globe,
  Phone,
  Mail,
  MessageSquare,
  Share2,
  Package,
  Search,
  Check,
  UserPlus,
  UserCheck,
  ArrowLeft,
  ExternalLink,
  Grid,
  Info,
  ShoppingBag,
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

export default function PublicMerchantProfilePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [activeTab, setActiveTab] = useState<'store' | 'products' | 'posts' | 'about'>('store');
  const [prodSearch, setProdSearch] = useState('');
  const [prodCategory, setProdCategory] = useState('ALL');
  const [copiedShare, setCopiedShare] = useState(false);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  const getOrCreateVisitorId = () => {
    if (typeof window === 'undefined') return '';
    let id = localStorage.getItem('lumo_visitor_id') || '';
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem('lumo_visitor_id', id);
    }
    return id;
  };

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const visitorId = typeof window !== 'undefined' ? localStorage.getItem('lumo_visitor_id') || '' : '';
      const res = await fetch(`${API_BASE}/marketplace/merchants/${encodeURIComponent(slug)}`, {
        credentials: 'include',
        cache: 'no-store',
        headers: visitorId ? { 'x-visitor-id': visitorId } : undefined,
      });
      const json = await res.json();
      if (!res.ok || !json?.success || !json.data) {
        setNotFound(true);
        return;
      }
      setProfile(json.data);
      setIsFollowing(Boolean(json.data.isFollowing));
      setFollowersCount(Number(json.data.stats?.followersCount || 0));
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleToggleFollow = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    try {
      const visitorId = getOrCreateVisitorId();
      const res = await fetch(`${API_BASE}/marketplace/merchants/${encodeURIComponent(slug)}/follow`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(visitorId ? { 'x-visitor-id': visitorId } : {}),
        },
        body: JSON.stringify({ visitorId }),
      });
      const json = await res.json();
      if (res.ok && json?.success && json.data) {
        if (json.data.visitorId && typeof window !== 'undefined') {
          localStorage.setItem('lumo_visitor_id', json.data.visitorId);
        }
        setIsFollowing(Boolean(json.data.following));
        setFollowersCount(Number(json.data.followersCount || 0));
      }
    } finally {
      setFollowLoading(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: profile?.merchant?.businessName || 'LUMO Merchant',
          text: profile?.merchant?.description || 'Explore products on LUMO Track',
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to copy
      }
    }
    navigator.clipboard.writeText(shareUrl);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header />
        <div className="max-w-5xl w-full mx-auto px-4 py-12 space-y-6 animate-pulse">
          <div className="bg-white rounded-3xl p-8 flex flex-col sm:flex-row gap-6 items-center">
            <div className="w-28 h-28 rounded-full bg-slate-200" />
            <div className="flex-1 space-y-3 w-full">
              <div className="h-6 bg-slate-200 rounded w-1/3" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="h-10 bg-slate-100 rounded w-2/3" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
          <Store className="w-14 h-14 text-slate-300" />
          <h1 className="text-xl font-extrabold text-slate-900">Merchant Profile Not Available</h1>
          <p className="text-xs text-slate-500 max-w-sm">
            This merchant storefront may be unpublished or moved. Browse all verified and active merchants instead.
          </p>
          <Link
            href="/merchants"
            className="px-5 py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-bold hover:bg-slate-800"
          >
            Back to Merchant Marketplace
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const { merchant, store, stats, storeCategories = [], products = [], posts = [] } = profile;

  const filteredProducts = products.filter((p: any) => {
    const q = prodSearch.trim().toLowerCase();
    const matchSearch =
      !q ||
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q);
    const matchCat = prodCategory === 'ALL' || p.category === prodCategory;
    return matchSearch && matchCat;
  });

  const productCategories = Array.from(
    new Set([
      ...storeCategories.map((c: any) => c.name),
      ...products.map((p: any) => p.category).filter(Boolean),
    ])
  );

  const whatsappDigits = (merchant.whatsappNumber || merchant.contactPhone || '').replace(/[^0-9]/g, '');
  const whatsappLink = whatsappDigits
    ? `https://wa.me/${whatsappDigits.startsWith('0') ? '255' + whatsappDigits.slice(1) : whatsappDigits}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col pb-20 md:pb-0">
      <div className="hidden md:block">
        <Header />
      </div>

      {/* Mobile Native-App Top Bar */}
      <div className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 h-14 flex items-center justify-between gap-2">
        <Link
          href="/merchants"
          aria-label="Back to marketplace"
          className="p-2 -ml-1 rounded-full hover:bg-slate-100 text-slate-800 active:scale-95 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-black text-slate-900 truncate">{merchant.businessName}</span>
          {merchant.isVerified && <VerifiedBadge size="xs" />}
        </div>
        <button
          type="button"
          onClick={handleShare}
          aria-label="Share store"
          className="p-2 -mr-1 rounded-full hover:bg-slate-100 text-slate-800 active:scale-95 transition"
        >
          {copiedShare ? <Check className="w-5 h-5 text-emerald-600" /> : <Share2 className="w-5 h-5" />}
        </button>
      </div>

      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
        <Link
          href="/merchants"
          className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Marketplace
        </Link>

        {/* Instagram-Inspired Business Profile Header */}
        <section className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-8 shadow-sm">
          {/* Mobile Compact Top Row: Avatar + 3 Stats (Posts | Followers | Products) */}
          <div className="flex items-center gap-4 sm:hidden">
            <div className="w-20 h-20 rounded-full p-0.5 bg-gradient-to-tr from-[#FF5500] via-[#0095F6] to-[#0F172A] shadow-sm shrink-0">
              <div className="w-full h-full rounded-full bg-white p-0.5 overflow-hidden flex items-center justify-center">
                {merchant.logoUrl ? (
                  <img
                    src={resolveAssetUrl(merchant.logoUrl)}
                    alt={merchant.businessName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#0F172A] text-white flex items-center justify-center">
                    <Store className="w-8 h-8" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 grid grid-cols-3 text-center gap-1">
              <div>
                <p className="text-base font-black text-slate-900">
                  {Number(stats?.postsCount ?? products.length).toLocaleString('en-US')}
                </p>
                <p className="text-[11px] text-slate-500 font-medium">Posts</p>
              </div>
              <div>
                <p className="text-base font-black text-slate-900">
                  {followersCount.toLocaleString('en-US')}
                </p>
                <p className="text-[11px] text-slate-500 font-medium">Followers</p>
              </div>
              <div>
                <p className="text-base font-black text-slate-900">
                  {Number(stats?.productsCount ?? products.length).toLocaleString('en-US')}
                </p>
                <p className="text-[11px] text-slate-500 font-medium">Products</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-start gap-4 sm:gap-8 mt-3 sm:mt-0">
            {/* Desktop Circular Profile Image */}
            <div className="hidden sm:flex justify-center md:justify-start shrink-0">
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full p-1 bg-gradient-to-tr from-[#FF5500] via-[#0095F6] to-[#0F172A] shadow-md">
                <div className="w-full h-full rounded-full bg-white p-0.5 overflow-hidden flex items-center justify-center">
                  {merchant.logoUrl ? (
                    <img
                      src={resolveAssetUrl(merchant.logoUrl)}
                      alt={merchant.businessName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-[#0F172A] text-white flex items-center justify-center">
                      <Store className="w-10 h-10" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Info & Stats */}
            <div className="flex-1 space-y-3 sm:space-y-4 text-left min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h1 className="text-lg sm:text-2xl font-black text-slate-900">
                      {merchant.businessName}
                    </h1>
                    {merchant.isVerified && <VerifiedBadge size="md" />}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                    <span className="font-mono font-semibold text-slate-600">{merchant.username}</span>
                    {merchant.primaryCategory && (
                      <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-[#FF5500] font-bold border border-orange-100">
                        {merchant.primaryCategory.name}
                      </span>
                    )}
                    {merchant.location && (
                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {merchant.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Desktop Action Buttons */}
                <div className="hidden sm:flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={followLoading}
                    onClick={handleToggleFollow}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                      isFollowing
                        ? 'bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200'
                        : 'bg-[#0095F6] text-white hover:bg-blue-600 shadow-sm'
                    }`}
                  >
                    {isFollowing ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
                  >
                    {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                    {copiedShare ? 'Copied' : 'Share Store'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('products')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-bold hover:bg-slate-800"
                  >
                    <Package className="w-3.5 h-3.5 text-[#FF5500]" />
                    View Products
                  </button>
                  {whatsappLink && (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Contact
                    </a>
                  )}
                </div>
              </div>

              {/* Desktop 3 Unified Stats: Posts | Followers | Products */}
              <div className="hidden sm:grid grid-cols-3 gap-4 max-w-md py-3 border-y border-slate-100">
                <div>
                  <p className="text-lg font-black text-slate-900">
                    {Number(stats?.postsCount ?? products.length).toLocaleString('en-US')}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">Posts</p>
                </div>
                <div>
                  <p className="text-lg font-black text-slate-900">
                    {followersCount.toLocaleString('en-US')}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">Followers</p>
                </div>
                <div>
                  <p className="text-lg font-black text-slate-900">
                    {Number(stats?.productsCount ?? products.length).toLocaleString('en-US')}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">Products</p>
                </div>
              </div>

              {/* Bio & Links */}
              <div className="space-y-1.5">
                {merchant.description && (
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed max-w-2xl">
                    {merchant.description}
                  </p>
                )}
                {merchant.website && (
                  <a
                    href={merchant.website.startsWith('http') ? merchant.website : `https://${merchant.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#0095F6] hover:underline"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    {merchant.website}
                  </a>
                )}
              </div>

              {/* Mobile App Action Row */}
              <div className="grid grid-cols-3 gap-2 pt-1 sm:hidden">
                <button
                  type="button"
                  disabled={followLoading}
                  onClick={handleToggleFollow}
                  className={`inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                    isFollowing
                      ? 'bg-slate-100 text-slate-800 border border-slate-300'
                      : 'bg-[#0095F6] text-white shadow-sm'
                  }`}
                >
                  {isFollowing ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('products')}
                  className="inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-bold active:scale-95"
                >
                  <Package className="w-3.5 h-3.5 text-[#FF5500]" />
                  Products
                </button>
                {whatsappLink ? (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold active:scale-95"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Chat
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold active:scale-95"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Instagram-Style Sticky Navigation Tabs */}
        <div className="sticky top-14 md:top-20 z-30 bg-slate-50/95 backdrop-blur-sm pt-1">
          <div className="grid grid-cols-4 sm:flex border-b border-slate-200 gap-1 sm:gap-2 pb-2 sm:pb-3">
            {[
              { id: 'store', label: 'Store', icon: Store },
              { id: 'products', label: 'Products', icon: ShoppingBag },
              { id: 'posts', label: 'Posts', icon: Grid },
              { id: 'about', label: 'About', icon: Info },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`inline-flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition ${
                    isActive
                      ? 'bg-[#0F172A] text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: STORE */}
        {activeTab === 'store' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-6 sm:p-8 bg-gradient-to-r from-[#0F172A] to-[#1E3A5F] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black">{store.storeName}</h2>
                    {merchant.isVerified && <VerifiedBadge size="sm" />}
                  </div>
                  <p className="text-xs text-slate-300 max-w-xl">
                    {store.promotionalBannerText || store.description || 'Browse live stock, prices, and order directly without registration.'}
                  </p>
                </div>
                <Link
                  href={`/store/${store.slug}`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold shadow-md shrink-0"
                >
                  Open Full Storefront
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {products.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
                <Package className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No published products yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.slice(0, 8).map((prod: any) => (
                  <Link
                    key={prod.id}
                    href={`/store/${store.slug}?product=${encodeURIComponent(prod.id)}`}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition flex flex-col"
                  >
                    <div className="h-44 bg-slate-100 relative">
                      {prod.primaryImageUrl ? (
                        <img
                          src={resolveAssetUrl(prod.primaryImageUrl)}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Package className="w-8 h-8" />
                        </div>
                      )}
                      {prod.isPromotionActive && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF5500] text-white">
                          Offer
                        </span>
                      )}
                    </div>
                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <p className="text-xs font-bold text-slate-900 line-clamp-1">{prod.name}</p>
                        <p className="text-[11px] text-slate-500">{prod.category || 'General'}</p>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-black text-[#0F172A]">
                          {prod.currency || 'TZS'} {Number(prod.effectivePrice || 0).toLocaleString('en-US')}
                        </span>
                        {prod.isPromotionActive && (
                          <span className="text-[11px] text-slate-400 line-through">
                            {Number(prod.unitPrice || 0).toLocaleString('en-US')}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PRODUCTS */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={prodSearch}
                  onChange={(e) => setProdSearch(e.target.value)}
                  placeholder="Search merchant products..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
              <select
                value={prodCategory}
                onChange={(e) => setProdCategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
              >
                <option value="ALL">All Categories</option>
                {productCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs text-slate-500">
                No products match your search.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((prod: any) => (
                  <Link
                    key={prod.id}
                    href={`/store/${store.slug}?product=${encodeURIComponent(prod.id)}`}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition flex flex-col"
                  >
                    <div className="h-44 bg-slate-100 relative">
                      {prod.primaryImageUrl ? (
                        <img
                          src={resolveAssetUrl(prod.primaryImageUrl)}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Package className="w-8 h-8" />
                        </div>
                      )}
                      {!prod.isAvailable && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800/80 text-white">
                          Sold Out
                        </span>
                      )}
                    </div>
                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <p className="text-xs font-bold text-slate-900 line-clamp-1">{prod.name}</p>
                        {prod.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{prod.description}</p>
                        )}
                      </div>
                      <div className="pt-1 flex items-center justify-between gap-2">
                        <span className="text-sm font-black text-[#0F172A]">
                          {prod.currency || 'TZS'} {Number(prod.effectivePrice || 0).toLocaleString('en-US')}
                        </span>
                        <span className="text-[11px] font-bold text-[#FF5500]">Order →</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: POSTS (Instagram-Style Square Grid of Posted Products & Showcases) */}
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {posts.length === 0 && products.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
                <Grid className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No posts yet</p>
                <p className="text-xs text-slate-500">Products posted by this merchant will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 sm:gap-3">
                {posts.map((post: any) => (
                  <div
                    key={`post-${post.id}`}
                    className="aspect-square bg-slate-100 rounded-lg sm:rounded-2xl overflow-hidden relative group border border-slate-200"
                  >
                    {post.imageUrl ? (
                      <img
                        src={resolveAssetUrl(post.imageUrl)}
                        alt={post.title || 'Merchant post'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-2 text-center bg-slate-900 text-white text-[11px] font-semibold">
                        {post.title || post.caption}
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-2 text-white">
                      <p className="text-[10px] sm:text-xs font-bold line-clamp-1">
                        {post.title || post.caption}
                      </p>
                    </div>
                  </div>
                ))}
                {products.map((prod: any) => (
                  <Link
                    key={`prod-post-${prod.id}`}
                    href={`/store/${store.slug}?product=${encodeURIComponent(prod.id)}`}
                    className="aspect-square bg-slate-100 rounded-lg sm:rounded-2xl overflow-hidden relative group border border-slate-200 active:scale-[0.98] transition"
                  >
                    {prod.primaryImageUrl ? (
                      <img
                        src={resolveAssetUrl(prod.primaryImageUrl)}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Package className="w-7 h-7" />
                      </div>
                    )}
                    {prod.isPromotionActive && (
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#FF5500] text-white">
                        Offer
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-1.5 sm:p-2.5 text-white">
                      <p className="text-[10px] sm:text-xs font-bold line-clamp-1">{prod.name}</p>
                      <p className="text-[9px] sm:text-[11px] font-extrabold text-orange-300">
                        {prod.currency || 'TZS'} {Number(prod.effectivePrice || 0).toLocaleString('en-US')}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ABOUT */}
        {activeTab === 'about' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900">About {merchant.businessName}</h2>
              {merchant.isVerified && <VerifiedBadge size="sm" />}
            </div>
            {merchant.description && (
              <p className="text-sm text-slate-700 leading-relaxed">{merchant.description}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs">
              {merchant.location && (
                <div className="flex items-center gap-2.5 text-slate-700">
                  <MapPin className="w-4 h-4 text-[#FF5500]" />
                  <span>{merchant.location}</span>
                </div>
              )}
              {merchant.contactPhone && (
                <div className="flex items-center gap-2.5 text-slate-700">
                  <Phone className="w-4 h-4 text-[#FF5500]" />
                  <a href={`tel:${merchant.contactPhone}`} className="hover:underline font-semibold">
                    {merchant.contactPhone}
                  </a>
                </div>
              )}
              {merchant.contactEmail && (
                <div className="flex items-center gap-2.5 text-slate-700">
                  <Mail className="w-4 h-4 text-[#FF5500]" />
                  <span>{merchant.contactEmail}</span>
                </div>
              )}
              {merchant.website && (
                <div className="flex items-center gap-2.5 text-slate-700">
                  <Globe className="w-4 h-4 text-[#FF5500]" />
                  <a
                    href={merchant.website.startsWith('http') ? merchant.website : `https://${merchant.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#0095F6] hover:underline"
                  >
                    {merchant.website}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Mobile Sticky Bottom App Action Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] flex items-center gap-2 shadow-[0_-4px_20px_rgba(15,23,42,0.08)]">
        <Link
          href={`/store/${store.slug}`}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#FF5500] text-white text-xs font-bold shadow-sm active:scale-95 transition"
        >
          <Store className="w-4 h-4" />
          Open Store & Order
        </Link>
        {whatsappLink && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold active:scale-95 transition"
          >
            <MessageSquare className="w-4 h-4" />
            WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

