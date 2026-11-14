'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Package, MapPin, Truck, Phone, MessageSquare, CheckCircle2, Clock,
  Globe, ShieldCheck, RefreshCw, AlertCircle, Share2, Copy, Check, ExternalLink, Sparkles,
  Store, ShoppingBag, ArrowRight, X
} from 'lucide-react';
import { fetchApi, API_BASE } from '@/lib/api';
import { useLanguage, T, TLabel } from '@/components/LanguageProvider';
import LanguageSelector from '@/components/LanguageSelector';

import { LumoStartupLoader } from '@/components/common/LumoStartupLoader';

const ASSET_ORIGIN = API_BASE.replace(/\/api\/?$/, '');
function resolveStoreAssetUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  return `${ASSET_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default function PublicCustomerTrackingPortal() {
  const { t, label: uiLabel, locale } = useLanguage();

  const params = useParams();
  const token = params.token as string;

  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { language: lang, setLanguage: setLang } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  // SmartTrack Store Buy Again state
  const [buyAgainOpen, setBuyAgainOpen] = useState(false);
  const [buyAgainLoading, setBuyAgainLoading] = useState(false);
  const [buyAgainData, setBuyAgainData] = useState<any>(null);
  const [buyAgainQtys, setBuyAgainQtys] = useState<Record<string, number>>({});
  const [buyAgainForm, setBuyAgainForm] = useState({
    customerName: '',
    customerPhone: '',
    deliveryAddress: '',
  });
  const [buyAgainSubmitting, setBuyAgainSubmitting] = useState(false);
  const [buyAgainResult, setBuyAgainResult] = useState<{
    orderNumber: string;
    trackingUrl?: string;
  } | null>(null);
  const [buyAgainError, setBuyAgainError] = useState<string>('');

  const handleOpenBuyAgain = async () => {
    setBuyAgainOpen(true);
    setBuyAgainLoading(true);
    setBuyAgainError('');
    setBuyAgainResult(null);
    try {
      const res = await fetch(`${API_BASE}/store/public/buy-again/${encodeURIComponent(token)}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || 'Repeat ordering is currently unavailable for this order.');
      }
      const d = json.data;
      setBuyAgainData(d);
      const initialQtys: Record<string, number> = {};
      for (const item of d.items || []) {
        if (item.isAvailable && item.productId) {
          initialQtys[item.productId] = Number(item.requestedQuantity || 1);
        }
      }
      setBuyAgainQtys(initialQtys);
      setBuyAgainForm({
        customerName: d.customerName || delivery?.customer_name || '',
        customerPhone: d.customerPhone || '',
        deliveryAddress: d.deliveryAddress || delivery?.delivery_address || '',
      });
    } catch (err: any) {
      setBuyAgainError(err.message || 'Unable to load current product prices.');
    } finally {
      setBuyAgainLoading(false);
    }
  };

  const handleSubmitBuyAgain = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedItems = Object.entries(buyAgainQtys)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([productId, quantity]) => ({ productId, quantity: Number(quantity) }));

    if (selectedItems.length === 0) {
      setBuyAgainError('Select at least 1 quantity of an available product to reorder.');
      return;
    }

    setBuyAgainSubmitting(true);
    setBuyAgainError('');
    try {
      const res = await fetch(`${API_BASE}/store/public/buy-again/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: buyAgainForm.customerName.trim(),
          customerPhone: buyAgainForm.customerPhone.trim(),
          deliveryAddress: buyAgainForm.deliveryAddress.trim(),
          items: selectedItems,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || 'Unable to submit repeat order.');
      }
      setBuyAgainResult(json.data);
    } catch (err: any) {
      setBuyAgainError(err.message || 'Could not place repeat order.');
    } finally {
      setBuyAgainSubmitting(false);
    }
  };

  const recordTrackingStoreClick = async (storeSlug: string, productId?: string) => {
    try {
      await fetch(`${API_BASE}/store/public/${encodeURIComponent(storeSlug)}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'TRACKING_CARD_CLICK',
          productId: productId || null,
        }),
      });
    } catch {
      // Non-blocking
    }
  };

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchApi(`/track/${token}`);
      setDelivery(data);
    } catch (err: any) {
      setErrorMsg(err.message || t("public.tracking_link_is_invalid_or_expired"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [token]);

  // Minimum 2-second splash screen display
  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleCopyLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleShareWhatsApp = () => {
    const link = window.location.href;
    const merchantName = delivery?.merchant?.business_name || 'LUMO';
    const orderNum = delivery?.order_number || t("common.order");
    const text = t('public.share_order_message', { order: orderNum, merchant: merchantName, link });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return null;
    }
  };

  // Show loader until BOTH: splash timer is done AND first API call is done
  if (!splashDone || (loading && !delivery)) {
    return <LumoStartupLoader message={t("public.loading_your_delivery")} />;
  }

  if (errorMsg && !delivery) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900"><T k="public.invalid_tracking_link" /></h2>
        <p className="text-xs text-slate-500 max-w-xs mt-1 mb-4">{errorMsg}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl"
        >{' '}<T k="common.retry" />{' '}</button>
      </div>
    );
  }

  const merchant = delivery?.merchant;
  const driver = delivery?.driver;
  const brandColor = merchant?.brand_color || '#0F766E';
  const status = delivery?.status || 'PENDING';
  const isNearby = status === 'ARRIVED' || status === 'DRIVER_NEARBY';

  const renderStatusMessage = () => {
    switch (status) {
      case 'PENDING':
      case 'CREATED':
        return { title: 'Order Received', desc: 'The merchant is preparing your order for dispatch.' };
      case 'CONFIRMED':
        return { title: 'Order Confirmed', desc: 'Your order is confirmed and scheduled for pickup.' };
      case 'DRIVER_ASSIGNED':
        return { title: 'Driver Assigned', desc: t('public.driver_assigned_to_order', { driver: driver?.name || t("public.a_driver") }) };
      case 'OUT_FOR_DELIVERY':
      case 'ON_THE_WAY':
        return { title: 'Out for Delivery 🚚', desc: 'Your driver is en route with your package!' };
      case 'ARRIVED':
      case 'DRIVER_NEARBY':
        return { title: 'Driver is Nearby 📍', desc: 'Your delivery is almost here! Please be ready to receive your order.' };
      case 'DELIVERED':
        return { title: 'Delivered 🎉', desc: 'Your order has been successfully delivered. Enjoy!' };
      case 'CANCELLED':
        return { title: 'Order Cancelled', desc: 'Please contact merchant support for assistance.' };
      default:
        return { title: status, desc: '' };
    }
  };

  const statusMsg = renderStatusMessage();

  // Dynamic Timeline steps with timestamps
  const rawTimeline = delivery?.timeline || [];

  const getEventTime = (type: string, fallbackDate?: string) => {
    const found = rawTimeline.find((e: any) => e.event_type === type);
    if (found) return formatTime(found.timestamp);
    return formatTime(fallbackDate);
  };

  const timelineSteps = [
    { key: 'PENDING', label: 'Order received', time: getEventTime('ORDER_CREATED', delivery?.created_at) },
    { key: 'CONFIRMED', label: 'Order confirmed', time: getEventTime('ORDER_CONFIRMED', delivery?.confirmed_at) },
    { key: 'DRIVER_ASSIGNED', label: 'Driver assigned', time: getEventTime('DRIVER_ASSIGNED', delivery?.started_at) },
    { key: 'OUT_FOR_DELIVERY', label: 'Driver started delivery', time: getEventTime('OUT_FOR_DELIVERY', delivery?.out_for_delivery_at) },
    { key: 'ARRIVED', label: 'Driver nearby', time: getEventTime('DRIVER_ARRIVED', delivery?.arrived_at) },
    { key: 'DELIVERED', label: 'Delivered', time: getEventTime('ORDER_DELIVERED', delivery?.delivered_at) },
  ];

  const getStepIndex = (st: string) => {
    const order = ['PENDING', 'CONFIRMED', 'DRIVER_ASSIGNED', 'OUT_FOR_DELIVERY', 'ARRIVED', 'DELIVERED'];
    if (st === 'CREATED') return 0;
    if (st === 'ON_THE_WAY') return 3;
    if (st === 'DRIVER_NEARBY') return 4;
    return order.indexOf(st);
  };

  const currentIndex = getStepIndex(status);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-12">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-md mx-auto p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {merchant?.logo_url ? (
              <img src={merchant.logo_url} alt={t("merchant.logo")} className="w-9 h-9 rounded-xl object-cover" />
            ) : (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-base shadow-sm"
                style={{ backgroundColor: brandColor }}
              >
                {merchant?.business_name?.[0] || 'L'}
              </div>
            )}
            <div>
              <h1 className="font-extrabold text-sm text-slate-900">{merchant?.business_name || t("public.lumo_order")}</h1>
              <p className="text-[10px] text-slate-500 font-mono">#{delivery?.order_number}</p>
            </div>
          </div>

          {/* Global Language Selector */}
          <LanguageSelector compact />
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto p-4 space-y-4 mt-2">
        {/* DRIVER IS NEARBY SPECIAL NOTIFICATION BANNER */}
        {isNearby && (
          <div className="bg-gradient-to-r from-amber-500 via-emerald-600 to-teal-700 p-4 rounded-3xl text-white shadow-lg animate-bounce-subtle space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-200 animate-spin" />
              <h3 className="font-black text-sm tracking-tight"><T k="public.your_delivery_is_almost_here" /></h3>
            </div>
            <p className="text-xs font-semibold opacity-95">{' '}<T k="public.your_driver" />{' '}{driver?.name ? <span className="underline font-bold">{driver.name}</span> : t("public.partner")}{' '}<T k="public.is_nearby_please_be_ready_to_receive_your_order" />{' '}</p>
          </div>
        )}

        {/* Live Status Header Card */}
        <div
          className="rounded-3xl p-6 text-white shadow-xl space-y-2 relative overflow-hidden transition-all duration-300"
          style={{ backgroundColor: brandColor }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-80"><T k="public.live_tracking_2" /></span>
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">{uiLabel(statusMsg.title)}</h2>
          <p className="text-xs opacity-90 leading-relaxed"><TLabel value={statusMsg.desc} /></p>
        </div>

        {/* Share Quick Bar */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleShareWhatsApp}
            className="flex-1 py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <MessageSquare className="w-4 h-4 fill-white" />
            <span><T k="merchant.share_whatsapp" /></span>
          </button>
          <button
            onClick={handleCopyLink}
            className="py-2.5 px-4 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? t("public.copied") : t("public.copy")}</span>
          </button>
        </div>

        {/* Product & Address Box */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-start gap-3">
            {delivery?.image_url ? (
              <img
                src={delivery.image_url}
                alt={delivery.product_description}
                className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-sm shrink-0"
              />
            ) : (
              <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 shrink-0">
                <Package className="w-5 h-5" />
              </div>
            )}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider"><T k="public.item_purchased" /></p>
              <h3 className="font-extrabold text-base text-slate-900">{delivery?.product_description}</h3>
            </div>
          </div>

          <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider"><T k="public.delivery_destination" /></p>
              <p className="font-bold text-xs text-slate-800">{delivery?.delivery_address}</p>
            </div>
          </div>
        </div>

        {/* CUSTOMER DELIVERY TIMELINE WITH ANIMATIONS */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-700" />
              <span><T k="public.delivery_timeline" /></span>
            </h3>
            <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">{' '}<T k="public.live_updates" />{' '}</span>
          </div>

          <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {timelineSteps.map((step, idx) => {
              const isCompleted = idx <= currentIndex;
              const isCurrent = idx === currentIndex;

              return (
                <div key={step.key} className="flex items-center gap-3.5 relative group">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 z-10 transition-all duration-300 ${
                      isCompleted
                        ? 'bg-teal-700 text-white shadow-md scale-105'
                        : 'bg-slate-100 border border-slate-300 text-slate-400'
                    }`}
                  >
                    {isCompleted ? (
                      <span className="text-[11px] animate-fade-in">✓</span>
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>

                  <div className="flex-1 flex items-center justify-between border-b border-slate-50 pb-2">
                    <div>
                      <p
                        className={`text-xs transition-colors duration-200 ${
                          isCurrent
                            ? 'text-teal-800 font-black scale-[1.02]'
                            : isCompleted
                            ? 'text-slate-900 font-bold'
                            : 'text-slate-400 font-medium'
                        }`}
                      >
                        {uiLabel(step.label)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {step.time && (
                        <span className="text-[11px] font-mono font-bold text-slate-500">
                          {step.time}
                        </span>
                      )}
                      {isCurrent && (
                        <span className="flex items-center gap-1 text-[9px] font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-200 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-ping" />
                          <span><T k="admin.active" /></span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Driver Card (if assigned) */}
        {driver && (() => {
          const rawTransport = (delivery?.transport_type || delivery?.vehicle_info || driver?.transport_type || driver?.vehicle_info || 'BODA').toUpperCase();
          const isBus = rawTransport.includes('BUS') || rawTransport.includes('BASI');
          const isPersonal = rawTransport.includes('PERSONAL') || rawTransport.includes('BINAFSI');
          const isBajaji = rawTransport.includes('BAJAJI');

          const transportMeta = isBus ? {
            icon: '🚌',
            badgeLabel: locale === 'sw' ? 'Basi la Mikoani' : 'Bus Delivery',
            title: t('public.bus_courier_details'),
            callLabel: t('public.call_bus_contact'),
            whatsappLabel: t('public.whatsapp_bus_contact'),
            badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
          } : isPersonal ? {
            icon: '👤',
            badgeLabel: locale === 'sw' ? 'Uwasilishaji Binafsi' : 'Personal Delivery',
            title: t('public.personal_delivery_details'),
            callLabel: t('public.call_representative'),
            whatsappLabel: t('public.whatsapp_representative'),
            badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          } : isBajaji ? {
            icon: '🛺',
            badgeLabel: 'Bajaji',
            title: locale === 'sw' ? 'Dereva wa Bajaji' : 'Bajaji Driver',
            callLabel: t('public.call_driver'),
            whatsappLabel: t('public.whatsapp_driver'),
            badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
          } : {
            icon: '🏍️',
            badgeLabel: 'Boda Boda',
            title: t('public.assigned_driver'),
            callLabel: t('public.call_driver'),
            whatsappLabel: t('public.whatsapp_driver'),
            badgeColor: 'bg-orange-50 text-orange-800 border-orange-200',
          };

          return (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xl">
                    {transportMeta.icon}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{transportMeta.title}</p>
                    <h4 className="font-extrabold text-sm text-slate-900">{driver.name}</h4>
                  </div>
                </div>
                <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${transportMeta.badgeColor}`}>
                  {transportMeta.badgeLabel}
                </span>
              </div>

              {driver.raw_phone && (
                <div className="flex gap-2 pt-2">
                  <a
                    href={`tel:${driver.raw_phone}`}
                    className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Phone className="w-4 h-4 text-emerald-400" />
                    <span>{transportMeta.callLabel}</span>
                  </a>
                  <a
                    href={`https://wa.me/${driver.raw_phone?.replace('+', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <MessageSquare className="w-4 h-4 text-white" />
                    <span>{transportMeta.whatsappLabel}</span>
                  </a>
                </div>
              )}
            </div>
          );
        })()}

        {/* Buy Again / Repeat Order + Discover More From Merchant Store */}
        {delivery?.store_recommendations?.store && (
          <div className="space-y-4">
            {/* Buy Again Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#FF5500] flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                      Need This Again?
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Check live prices & reorder from {delivery.store_recommendations.store.storeName}
                    </p>
                  </div>
                </div>
                {!buyAgainOpen ? (
                  <button
                    type="button"
                    onClick={handleOpenBuyAgain}
                    className="px-3.5 py-2 rounded-xl bg-[#FF5500] text-white text-xs font-bold hover:bg-orange-600 transition shrink-0"
                  >
                    Buy Again
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setBuyAgainOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {buyAgainOpen && (
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  {buyAgainLoading ? (
                    <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#FF5500]" />
                      Checking current storefront prices & stock...
                    </div>
                  ) : buyAgainResult ? (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1.5">
                      <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Repeat Order Created (#{buyAgainResult.orderNumber})
                      </p>
                      <p className="text-[11px] text-emerald-700">
                        Your new order request is pending confirmation with the merchant.
                      </p>
                      {buyAgainResult.trackingUrl && (
                        <a
                          href={buyAgainResult.trackingUrl}
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-900 underline"
                        >
                          Open New Tracking Link
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitBuyAgain} className="space-y-3">
                      {buyAgainError && (
                        <p className="text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-2 rounded-xl">
                          {buyAgainError}
                        </p>
                      )}

                      {buyAgainData?.items?.map((item: any, idx: number) => (
                        <div
                          key={`${item.productId || item.name}-${idx}`}
                          className="p-2.5 rounded-2xl border border-slate-200 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{item.name}</p>
                            {item.isAvailable ? (
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className="font-bold text-[#0F172A]">
                                  {item.currency || 'TZS'}{' '}
                                  {Number(item.currentUnitPrice || 0).toLocaleString('en-US')}
                                </span>
                                {item.priceChanged && (
                                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                    Updated from {Number(item.previousUnitPrice || 0).toLocaleString('en-US')}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <p className="text-[11px] text-rose-600 font-semibold">
                                {item.unavailableReason || 'Unavailable'}
                              </p>
                            )}
                          </div>
                          {item.isAvailable && item.productId && (
                            <input
                              type="number"
                              min="0"
                              max={item.maxQuantity || 100}
                              value={buyAgainQtys[item.productId] ?? 0}
                              onChange={(e) =>
                                setBuyAgainQtys((prev) => ({
                                  ...prev,
                                  [item.productId]: Math.max(0, Number(e.target.value || 0)),
                                }))
                              }
                              className="w-16 px-2 py-1.5 rounded-lg border border-slate-300 text-center font-bold"
                            />
                          )}
                        </div>
                      ))}

                      <div className="space-y-2">
                        <input
                          type="text"
                          required
                          value={buyAgainForm.customerName}
                          onChange={(e) =>
                            setBuyAgainForm({ ...buyAgainForm, customerName: e.target.value })
                          }
                          placeholder="Your Full Name *"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                        />
                        <input
                          type="text"
                          required
                          value={buyAgainForm.customerPhone}
                          onChange={(e) =>
                            setBuyAgainForm({ ...buyAgainForm, customerPhone: e.target.value })
                          }
                          placeholder="Phone Number *"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                        />
                        <input
                          type="text"
                          required
                          value={buyAgainForm.deliveryAddress}
                          onChange={(e) =>
                            setBuyAgainForm({ ...buyAgainForm, deliveryAddress: e.target.value })
                          }
                          placeholder="Delivery Address *"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={buyAgainSubmitting}
                        className="w-full py-2.5 rounded-xl bg-[#0F172A] text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50"
                      >
                        {buyAgainSubmitting ? 'Placing Repeat Order...' : 'Confirm Repeat Order Request'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Discover More From Merchant Store */}
            {delivery.store_recommendations.products?.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF5500]">
                      LUMO SmartTrack Store
                    </p>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      DISCOVER MORE FROM {delivery.store_recommendations.store.storeName.toUpperCase()}
                    </h3>
                  </div>
                  <Store className="w-5 h-5 text-slate-400 shrink-0" />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {delivery.store_recommendations.products.slice(0, 4).map((prod: any) => (
                    <Link
                      key={prod.id}
                      href={`/store/${delivery.store_recommendations.store.slug}?product=${encodeURIComponent(prod.id)}`}
                      onClick={() =>
                        recordTrackingStoreClick(delivery.store_recommendations.store.slug, prod.id)
                      }
                      className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 hover:bg-white hover:border-slate-300 transition flex flex-col"
                    >
                      <div className="h-24 bg-slate-200 relative">
                        {prod.primaryImageUrl ? (
                          <img
                            src={resolveStoreAssetUrl(prod.primaryImageUrl)}
                            alt={prod.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                        {prod.isPromotionActive && (
                          <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#FF5500] text-white">
                            Offer
                          </span>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-bold text-slate-900 line-clamp-1">{prod.name}</p>
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="text-xs font-extrabold text-[#0F172A]">
                            {prod.currency || 'TZS'}{' '}
                            {Number(prod.effectivePrice || 0).toLocaleString('en-US')}
                          </span>
                          {prod.isPromotionActive && (
                            <span className="text-[10px] text-slate-400 line-through">
                              {Number(prod.unitPrice || 0).toLocaleString('en-US')}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                <Link
                  href={`/store/${delivery.store_recommendations.store.slug}`}
                  onClick={() => recordTrackingStoreClick(delivery.store_recommendations.store.slug)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0F172A] text-white text-xs font-bold hover:bg-slate-800 flex items-center justify-center gap-2 transition"
                >
                  <Store className="w-4 h-4 text-[#FF5500]" />
                  VISIT OUR STORE
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Merchant Support Section */}
        {merchant?.business_phone && (
          <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-center space-y-1">
            <p className="text-xs font-semibold text-slate-600"><T k="public.merchant_support" /></p>
            <a href={`tel:${merchant.business_phone}`} className="text-xs font-mono font-bold text-teal-800 hover:underline">
              {merchant.business_phone}
            </a>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4 text-xs font-medium text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-teal-700" />
          <span><T k="public.powered_by_lumo_delivery_tracking" /></span>
        </div>
      </main>
    </div>
  );
}
