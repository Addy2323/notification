'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Store,
  Search,
  MessageSquare,
  Phone,
  MapPin,
  Mail,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Package,
  X,
  ArrowRight,
  Star,
  Globe,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { API_BASE } from '@/lib/api';

const ASSET_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

function resolveAssetUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${ASSET_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

function formatPrice(amount?: number | null, currency = 'TZS'): string {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return `${currency} 0`;
  return `${currency} ${Number(amount).toLocaleString('en-US')}`;
}

function formatWhatsAppUrl(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, '');
  const intl = digits.startsWith('0') ? `255${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return 'anon';
  let vid = localStorage.getItem('lumo_store_visitor_id');
  if (!vid) {
    vid = `vis_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('lumo_store_visitor_id', vid);
  }
  return vid;
}

export default function PublicMerchantStorefrontPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = String(params?.slug || '');
  const initialProductParam = searchParams?.get('product') || '';

  const [loading, setLoading] = useState(true);
  const [unavailableState, setUnavailableState] = useState<'NONE' | 'NOT_FOUND' | 'SUSPENDED'>('NONE');
  const [store, setStore] = useState<any>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [sortBy, setSortBy] = useState('featured');

  // Selected product modal
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [activeImage, setActiveImage] = useState<string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [modalAction, setModalAction] = useState<'NONE' | 'ORDER_REQUEST' | 'ENQUIRY'>('NONE');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    type: 'ORDER_REQUEST' | 'ENQUIRY';
    orderNumber?: string;
    trackingUrl?: string;
    enquiryId?: string;
  } | null>(null);
  const [submissionError, setSubmissionError] = useState<string>('');

  const [customerForm, setCustomerForm] = useState({
    quantity: 1,
    customerName: '',
    customerPhone: '',
    deliveryAddress: '',
    message: '',
  });

  const storeViewLogged = useRef(false);

  const trackEvent = useCallback(
    async (
      eventType:
        | 'STORE_VIEW'
        | 'PRODUCT_VIEW'
        | 'STORE_LINK_CLICK'
        | 'WHATSAPP_CLICK'
        | 'CALL_CLICK'
        | 'TRACKING_CARD_CLICK',
      productId?: string
    ) => {
      if (!slug) return;
      try {
        await fetch(`${API_BASE}/store/public/${encodeURIComponent(slug)}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType,
            productId: productId || null,
            visitorId: getOrCreateVisitorId(),
            referrer: typeof document !== 'undefined' ? document.referrer || null : null,
          }),
        });
      } catch {
        // Non-blocking analytics call
      }
    },
    [slug]
  );

  const fetchStorefront = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setUnavailableState('NONE');
    try {
      const qs = new URLSearchParams();
      if (activeCategory !== 'ALL') qs.set('category', activeCategory);
      if (searchQuery.trim()) qs.set('search', searchQuery.trim());
      if (featuredOnly) qs.set('featured', 'true');
      if (sortBy && sortBy !== 'featured') qs.set('sort', sortBy);

      const res = await fetch(
        `${API_BASE}/store/public/${encodeURIComponent(slug)}?${qs.toString()}`,
        { cache: 'no-store' }
      );
      const json = await res.json();

      if (res.status === 302 && json?.data?.redirectSlug) {
        const suffix = initialProductParam ? `?product=${encodeURIComponent(initialProductParam)}` : '';
        router.replace(`/store/${json.data.redirectSlug}${suffix}`);
        return;
      }

      if (res.status === 410 || json?.error?.code === 'STORE_SUSPENDED') {
        setUnavailableState('SUSPENDED');
        setStore({ storeName: json?.data?.storeName || 'Merchant Store' });
        return;
      }

      if (!res.ok || !json?.success) {
        setUnavailableState('NOT_FOUND');
        return;
      }

      const data = json.data;
      setStore(data.store);
      setCategories(data.categories || []);
      setProducts(data.products || []);

      if (!storeViewLogged.current) {
        storeViewLogged.current = true;
        trackEvent('STORE_VIEW');
      }

      if (initialProductParam) {
        const found = (data.products || []).find(
          (p: any) => p.id === initialProductParam || p.slug === initialProductParam
        );
        if (found) {
          openProductDetail(found, false);
        }
      }
    } catch {
      setUnavailableState('NOT_FOUND');
    } finally {
      setLoading(false);
    }
  }, [slug, activeCategory, searchQuery, featuredOnly, sortBy, initialProductParam, router, trackEvent]);

  useEffect(() => {
    fetchStorefront();
  }, [fetchStorefront]);

  const openProductDetail = (prod: any, updateUrl = true) => {
    setSelectedProduct(prod);
    setActiveImage(prod.primaryImageUrl || prod.images?.[0] || '');
    setSelectedVariantId(prod.variants?.[0]?.id || '');
    setModalAction('NONE');
    setSubmissionSuccess(null);
    setSubmissionError('');
    setCustomerForm({
      quantity: 1,
      customerName: '',
      customerPhone: '',
      deliveryAddress: '',
      message: '',
    });
    trackEvent('PRODUCT_VIEW', prod.id);
    if (updateUrl && typeof window !== 'undefined') {
      const nextUrl = `/store/${slug}?product=${encodeURIComponent(prod.id)}`;
      window.history.replaceState(null, '', nextUrl);
    }
  };

  const closeProductDetail = () => {
    setSelectedProduct(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/store/${slug}`);
    }
  };

  const handleSubmitOrderOrEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || modalAction === 'NONE') return;
    setSubmittingAction(true);
    setSubmissionError('');
    try {
      const res = await fetch(`${API_BASE}/store/public/${encodeURIComponent(slug)}/order-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: modalAction,
          productId: selectedProduct.id,
          quantity: Number(customerForm.quantity || 1),
          selectedVariantId: selectedVariantId || undefined,
          customerName: customerForm.customerName.trim(),
          customerPhone: customerForm.customerPhone.trim(),
          deliveryAddress: customerForm.deliveryAddress.trim() || undefined,
          message: customerForm.message.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || 'Unable to submit request.');
      }
      setSubmissionSuccess(json.data);
    } catch (err: any) {
      setSubmissionError(err.message || 'Unable to process request right now.');
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading && !store) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-slate-600 p-6">
        <RefreshCw className="w-7 h-7 animate-spin text-[#FF5500]" />
        <p className="text-sm font-medium">Opening SmartTrack Storefront...</p>
      </div>
    );
  }

  if (unavailableState !== 'NONE') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            {unavailableState === 'SUSPENDED' ? (
              <AlertTriangle className="w-7 h-7 text-amber-600" />
            ) : (
              <Store className="w-7 h-7" />
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {unavailableState === 'SUSPENDED'
              ? `${store?.storeName || 'This store'} is currently unavailable`
              : 'Storefront Not Found'}
          </h1>
          <p className="text-sm text-slate-500">
            {unavailableState === 'SUSPENDED'
              ? 'This merchant storefront has been temporarily paused by platform administrators.'
              : 'This store link may have expired, moved, or has not been published by the merchant yet.'}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-bold hover:bg-slate-800"
          >
            Go to LUMO Track
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const primaryColor = store?.primaryColor || '#0F172A';
  const secondaryColor = store?.secondaryColor || '#FF5500';
  const selectedVariantObj = selectedProduct?.variants?.find((v: any) => v.id === selectedVariantId);
  const activeModalPrice =
    selectedVariantObj?.price !== null && selectedVariantObj?.price !== undefined
      ? selectedVariantObj.price
      : selectedProduct?.effectivePrice;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Promotional Announcement Banner */}
      {store?.promotionalBannerText && (
        <div
          className="text-white text-center text-xs font-semibold py-2 px-4"
          style={{ backgroundColor: secondaryColor }}
        >
          {store.promotionalBannerText}
        </div>
      )}

      {/* Branded Store Header */}
      <header className="bg-white border-b border-slate-200">
        <div
          className="h-32 sm:h-44 relative"
          style={{
            backgroundColor: primaryColor,
            backgroundImage: store?.coverImageUrl ? `url(${resolveAssetUrl(store.coverImageUrl)})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
        </div>

        <div className="max-w-6xl mx-auto px-4 pb-6 pt-3">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex items-start gap-4 -mt-12 relative z-10">
              {store?.logoUrl ? (
                <img
                  src={resolveAssetUrl(store.logoUrl)}
                  alt={store.storeName}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-white shadow-lg bg-white shrink-0"
                />
              ) : (
                <div
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Store className="w-9 h-9" />
                </div>
              )}
              <div className="pt-8">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{store?.storeName}</h1>
                {store?.description && (
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">{store.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs text-slate-500">
                  {store?.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {store.location}
                    </span>
                  )}
                  {store?.contactPhone && (
                    <a
                      href={`tel:${store.contactPhone}`}
                      onClick={() => trackEvent('CALL_CLICK')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {store.contactPhone}
                    </a>
                  )}
                  {store?.contactEmail && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {store.contactEmail}
                    </span>
                  )}
                  {store?.socialLinks?.website && (
                    <a
                      href={store.socialLinks.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[#FF5500] hover:underline"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      Website
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {store?.whatsappNumber && (
                <a
                  href={formatWhatsAppUrl(
                    store.whatsappNumber,
                    `Hello ${store.storeName}, I saw your LUMO SmartTrack Store and would like more information.`
                  )}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackEvent('WHATSAPP_CLICK')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  Chat on WhatsApp
                </a>
              )}
              {store?.contactPhone && (
                <a
                  href={`tel:${store.contactPhone}`}
                  onClick={() => trackEvent('CALL_CLICK')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-bold hover:bg-slate-50"
                >
                  <Phone className="w-4 h-4" />
                  Call Store
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Catalog */}
      <main className="max-w-6xl mx-auto w-full px-4 py-6 flex-1 space-y-5">
        {/* Search, Categories, Sort */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, brands, or items..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFeaturedOnly((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition ${
                  featuredOnly
                    ? 'bg-orange-50 border-[#FF5500] text-[#FF5500]'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                Featured
              </button>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
              >
                <option value="featured">Recommended</option>
                <option value="newest">Newest Arrivals</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setActiveCategory('ALL')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                  activeCategory === 'ALL'
                    ? 'text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                style={activeCategory === 'ALL' ? { backgroundColor: primaryColor } : undefined}
              >
                All Products
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                    activeCategory === cat
                      ? 'text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  style={activeCategory === cat ? { backgroundColor: primaryColor } : undefined}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <h2 className="text-base font-bold text-slate-900">No matching products found</h2>
            <p className="text-xs text-slate-500">
              Try clearing your search or selecting another category, or message {store?.storeName} directly on WhatsApp.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((prod) => (
              <button
                key={prod.id}
                type="button"
                onClick={() => openProductDetail(prod)}
                className="text-left group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition flex flex-col"
              >
                <div className="aspect-square w-full bg-slate-100 relative overflow-hidden">
                  {prod.primaryImageUrl ? (
                    <img
                      src={resolveAssetUrl(prod.primaryImageUrl)}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Package className="w-10 h-10" />
                    </div>
                  )}

                  <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                    {prod.showSoldOutBadge && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow">
                        Sold Out
                      </span>
                    )}
                    {prod.isAvailable && prod.isPromotionActive && (
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow"
                        style={{ backgroundColor: secondaryColor }}
                      >
                        Offer
                      </span>
                    )}
                    {prod.isFeatured && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/85 text-white">
                        Featured
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 flex-1 flex flex-col justify-between w-full">
                  <div>
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                      {prod.category || 'Product'}
                    </p>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5 line-clamp-2">{prod.name}</h3>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm sm:text-base font-extrabold text-slate-900">
                        {formatPrice(prod.effectivePrice, prod.currency)}
                      </span>
                      {prod.isPromotionActive && (
                        <span className="text-xs text-slate-400 line-through">
                          {formatPrice(prod.unitPrice, prod.currency)}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-[11px] font-semibold mt-1 ${
                        !prod.isAvailable
                          ? 'text-rose-600'
                          : prod.stockStatus === 'LOW_STOCK'
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {!prod.isAvailable
                        ? 'Currently Out of Stock'
                        : prod.stockStatus === 'LOW_STOCK'
                        ? 'Limited Stock Available'
                        : 'Available'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-5 px-4 text-center text-xs text-slate-500">
        <p className="font-medium text-slate-700">{store?.storeName}</p>
        <p className="mt-1">
          Powered by{' '}
          <Link href="/" className="font-bold text-[#0F172A] hover:underline">
            LUMO Track
          </Link>
        </p>
      </footer>

      {/* PRODUCT DETAIL MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white w-full sm:max-w-3xl sm:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="sticky top-0 bg-white/95 backdrop-blur px-5 py-3.5 border-b border-slate-100 flex items-center justify-between z-10">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {selectedProduct.category || 'Product Details'}
              </span>
              <button
                type="button"
                onClick={closeProductDetail}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Image Gallery */}
              <div className="space-y-3">
                <div className="aspect-square rounded-2xl bg-slate-100 overflow-hidden border border-slate-200">
                  {activeImage ? (
                    <img
                      src={resolveAssetUrl(activeImage)}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Package className="w-12 h-12" />
                    </div>
                  )}
                </div>
                {selectedProduct.images?.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {selectedProduct.images.map((imgUrl: string) => (
                      <button
                        key={imgUrl}
                        type="button"
                        onClick={() => setActiveImage(imgUrl)}
                        className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 ${
                          activeImage === imgUrl ? 'border-[#FF5500]' : 'border-slate-200'
                        }`}
                      >
                        <img src={resolveAssetUrl(imgUrl)} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Details & Actions */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedProduct.name}</h2>
                  {selectedProduct.brand && (
                    <p className="text-xs text-slate-500 mt-0.5">Brand: {selectedProduct.brand}</p>
                  )}
                  <div className="flex items-baseline gap-2.5 mt-3">
                    <span className="text-2xl font-extrabold text-slate-900">
                      {formatPrice(activeModalPrice, selectedProduct.currency)}
                    </span>
                    {selectedProduct.isPromotionActive && !selectedVariantObj?.price && (
                      <span className="text-sm text-slate-400 line-through">
                        {formatPrice(selectedProduct.unitPrice, selectedProduct.currency)}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs font-bold mt-1.5 ${
                      !selectedProduct.isAvailable
                        ? 'text-rose-600'
                        : selectedProduct.stockStatus === 'LOW_STOCK'
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {!selectedProduct.isAvailable
                      ? 'Out of Stock'
                      : selectedProduct.trackInventory && selectedProduct.availableQuantity !== null
                      ? `In Stock (${selectedProduct.availableQuantity} available)`
                      : 'In Stock & Available'}
                  </p>
                </div>

                {selectedProduct.description && (
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {selectedProduct.description}
                  </p>
                )}

                {selectedProduct.variants?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-700">Select Option:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.variants.map((v: any) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVariantId(v.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                            selectedVariantId === v.id
                              ? 'bg-[#0F172A] text-white border-[#0F172A]'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {v.name}
                          {v.price ? ` (${formatPrice(v.price, selectedProduct.currency)})` : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {submissionSuccess ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5" />
                      {submissionSuccess.type === 'ORDER_REQUEST'
                        ? `Order Request Submitted (#${submissionSuccess.orderNumber})`
                        : 'Enquiry Sent to Merchant'}
                    </div>
                    <p className="text-xs text-emerald-700">
                      {submissionSuccess.type === 'ORDER_REQUEST'
                        ? `${store?.storeName} has received your order request and will contact you shortly to confirm delivery.`
                        : `${store?.storeName} will contact you shortly on your phone number.`}
                    </p>
                    {submissionSuccess.trackingUrl && (
                      <a
                        href={submissionSuccess.trackingUrl}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-900 underline pt-1"
                      >
                        Track Your Order Status
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedProduct.isAvailable && (
                        <button
                          type="button"
                          onClick={() => setModalAction('ORDER_REQUEST')}
                          className="w-full py-2.5 px-4 rounded-xl text-white text-xs font-bold shadow-sm hover:opacity-95 flex items-center justify-center gap-1.5"
                          style={{ backgroundColor: secondaryColor }}
                        >
                          <ShoppingBag className="w-4 h-4" />
                          ORDER NOW
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setModalAction('ENQUIRY')}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#0F172A] text-white text-xs font-bold hover:bg-slate-800 flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-4 h-4" />
                        ENQUIRE ABOUT PRODUCT
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {store?.whatsappNumber && (
                        <a
                          href={formatWhatsAppUrl(
                            store.whatsappNumber,
                            `Hello ${store.storeName}, I would like to ask about "${selectedProduct.name}" (${formatPrice(
                              activeModalPrice,
                              selectedProduct.currency
                            )})${selectedVariantObj ? ` - ${selectedVariantObj.name}` : ''}. Link: ${
                              store.publicUrl
                            }?product=${selectedProduct.id}`
                          )}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => trackEvent('WHATSAPP_CLICK', selectedProduct.id)}
                          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 flex items-center justify-center gap-1.5"
                        >
                          <MessageSquare className="w-4 h-4" />
                          CHAT ON WHATSAPP
                        </a>
                      )}
                      {store?.contactPhone && (
                        <a
                          href={`tel:${store.contactPhone}`}
                          onClick={() => trackEvent('CALL_CLICK', selectedProduct.id)}
                          className="w-full py-2.5 px-4 rounded-xl border border-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-50 flex items-center justify-center gap-1.5"
                        >
                          <Phone className="w-4 h-4" />
                          CALL MERCHANT
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Inline Order / Enquiry Form */}
                {modalAction !== 'NONE' && !submissionSuccess && (
                  <form
                    onSubmit={handleSubmitOrderOrEnquiry}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-900">
                        {modalAction === 'ORDER_REQUEST'
                          ? 'Complete Your Order Request'
                          : 'Send Product Enquiry'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setModalAction('NONE')}
                        className="text-xs text-slate-500 hover:text-slate-800"
                      >
                        Cancel
                      </button>
                    </div>
                    {submissionError && (
                      <p className="text-xs font-semibold text-rose-600">{submissionError}</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Your Name *</label>
                        <input
                          type="text"
                          required
                          value={customerForm.customerName}
                          onChange={(e) =>
                            setCustomerForm({ ...customerForm, customerName: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                          placeholder="Full Name"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Phone Number *</label>
                        <input
                          type="text"
                          required
                          value={customerForm.customerPhone}
                          onChange={(e) =>
                            setCustomerForm({ ...customerForm, customerPhone: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                          placeholder="+255 7XX XXX XXX"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          max={
                            selectedProduct.trackInventory && selectedProduct.availableQuantity
                              ? selectedProduct.availableQuantity
                              : 100
                          }
                          value={customerForm.quantity}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              quantity: Math.max(1, Number(e.target.value || 1)),
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Delivery Location {modalAction === 'ORDER_REQUEST' ? '*' : '(Optional)'}
                        </label>
                        <input
                          type="text"
                          required={modalAction === 'ORDER_REQUEST'}
                          value={customerForm.deliveryAddress}
                          onChange={(e) =>
                            setCustomerForm({ ...customerForm, deliveryAddress: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                          placeholder="Area / Street / Landmark"
                        />
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      value={customerForm.message}
                      onChange={(e) => setCustomerForm({ ...customerForm, message: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                      placeholder="Optional note or question for the seller..."
                    />
                    <button
                      type="submit"
                      disabled={submittingAction}
                      className="w-full py-2.5 rounded-xl bg-[#FF5500] text-white text-xs font-bold hover:bg-orange-600 disabled:opacity-50"
                    >
                      {submittingAction
                        ? 'Submitting...'
                        : modalAction === 'ORDER_REQUEST'
                        ? `Confirm Order Request (${formatPrice(
                            Number(activeModalPrice || 0) * Number(customerForm.quantity || 1),
                            selectedProduct.currency
                          )})`
                        : 'Send Enquiry'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

