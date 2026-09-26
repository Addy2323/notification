'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Package, MapPin, Truck, Phone, MessageSquare, CheckCircle2, Clock, Globe, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { translations, Language } from '@/lib/i18n';

export default function CustomerTrackingPortal() {
  const params = useParams();
  const token = params.token as string;

  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lang, setLang] = useState<Language>('en');

  const t = (key: string) => translations[lang][key] || key;

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchApi(`/track/${token}`);
      setDelivery(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Tracking link is invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh customer tracking status every 15 seconds
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [token]);

  if (loading && !delivery) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-10 h-10 text-lumo-800 animate-spin mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading tracking portal...</p>
      </div>
    );
  }

  if (errorMsg && !delivery) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Invalid Tracking Link</h2>
        <p className="text-xs text-slate-500 max-w-xs mt-1 mb-4">{errorMsg}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-lumo-800 text-white text-xs font-bold rounded-xl"
        >
          Retry
        </button>
      </div>
    );
  }

  const merchant = delivery?.merchant;
  const driver = delivery?.driver;
  const brandColor = merchant?.brand_color || '#1E40AF';
  const status = delivery?.status;

  const renderStatusMessage = () => {
    switch (status) {
      case 'CREATED':
        return { title: 'DELIVERY REGISTERED', desc: t('delivery.created') };
      case 'ON_THE_WAY':
        return { title: 'ON THE WAY', desc: t('delivery.on_the_way') };
      case 'ARRIVED':
        return { title: t('delivery.arrived'), desc: t('delivery.arrived_desc') };
      case 'DELIVERED':
        return { title: t('delivery.delivered'), desc: t('delivery.delivered_desc') };
      case 'CANCELLED':
        return { title: t('delivery.cancelled'), desc: 'Contact merchant for details.' };
      default:
        return { title: status, desc: '' };
    }
  };

  const statusMsg = renderStatusMessage();

  const timelineSteps = [
    { key: 'CREATED', label: t('timeline.created') },
    { key: 'ON_THE_WAY', label: t('timeline.on_the_way') },
    { key: 'ARRIVED', label: t('timeline.arrived') },
    { key: 'DELIVERED', label: t('timeline.delivered') },
  ];

  const getStepIndex = (st: string) => {
    const order = ['CREATED', 'ON_THE_WAY', 'ARRIVED', 'DELIVERED'];
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
              <img src={merchant.logo_url} alt="Logo" className="w-9 h-9 rounded-xl object-cover" />
            ) : (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-base"
                style={{ backgroundColor: brandColor }}
              >
                {merchant?.business_name?.[0] || 'L'}
              </div>
            )}
            <div>
              <h1 className="font-extrabold text-sm text-slate-900">{merchant?.business_name}</h1>
              <p className="text-[10px] text-slate-500">{t('delivery.title')}</p>
            </div>
          </div>

          {/* Language Switcher */}
          <button
            onClick={() => setLang(lang === 'en' ? 'sw' : 'en')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all"
          >
            <Globe className="w-3.5 h-3.5 text-lumo-800" />
            <span>{t('language.toggle')}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto p-4 space-y-4 mt-2">
        {/* Status Hero Banner */}
        <div
          className="rounded-3xl p-6 text-white shadow-glow space-y-2 relative overflow-hidden"
          style={{ backgroundColor: brandColor }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-80">LIVE STATUS</span>
            <span className="animate-pulse w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">{statusMsg.title}</h2>
          <p className="text-xs opacity-90">{statusMsg.desc}</p>
        </div>

        {/* Product & Address Box */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-card space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-lumo-50 text-lumo-800 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Item Purchased</p>
              <h3 className="font-extrabold text-base text-slate-900">{delivery?.product_description}</h3>
            </div>
          </div>

          <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delivery Destination</p>
              <p className="font-bold text-xs text-slate-800">{delivery?.delivery_address}</p>
            </div>
          </div>
        </div>

        {/* Progress Timeline */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-card space-y-4">
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-lumo-800" />
            <span>Progress Timeline</span>
          </h3>

          <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {timelineSteps.map((step, idx) => {
              const isCompleted = idx <= currentIndex;
              const isCurrent = idx === currentIndex;

              return (
                <div key={step.key} className="flex items-center gap-4 relative">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 z-10 transition-all ${
                      isCompleted
                        ? 'bg-lumo-800 text-white shadow-md'
                        : 'bg-slate-100 border border-slate-300 text-slate-400'
                    }`}
                  >
                    {isCompleted ? '✓' : idx + 1}
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isCurrent ? 'text-lumo-800 font-extrabold scale-105' : isCompleted ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold bg-lumo-50 text-lumo-800 px-2 py-0.5 rounded-full animate-pulse">
                        Active
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Driver Box & Contact */}
        {driver && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
                  <Truck className="w-5 h-5 text-lumo-800" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('driver.title')}</p>
                  <h4 className="font-extrabold text-sm text-slate-900">{driver.name}</h4>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <a
                href={`tel:${driver.raw_phone}`}
                className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>{t('driver.call')}</span>
              </a>
              <a
                href={`https://wa.me/${driver.raw_phone?.replace('+', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4 text-white" />
                <span>{t('driver.whatsapp')}</span>
              </a>
            </div>
          </div>
        )}

        {/* Support Section */}
        <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-center space-y-1">
          <p className="text-xs font-semibold text-slate-600">{t('merchant.support')}</p>
          <p className="text-xs font-mono font-bold text-slate-800">{merchant?.business_phone}</p>
        </div>

        {/* Powered by LUMO footer */}
        <div className="text-center pt-4 text-xs font-medium text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-lumo-800" />
          <span>{t('powered_by')}</span>
        </div>
      </main>
    </div>
  );
}
