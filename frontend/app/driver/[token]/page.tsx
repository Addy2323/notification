'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Truck, MapPin, Phone, CheckCircle2, AlertCircle, RefreshCw, Navigation,
  Clock, XCircle, ArrowRight, ShieldCheck, User, Package
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { LumoStartupLoader } from '@/components/common/LumoStartupLoader';

interface DriverDelivery {
  id: string;
  order_number: string;
  status: string;
  product_description: string;
  delivery_address: string;
  customer_name: string;
  customer_phone: string;
  driver_name: string | null;
  merchant: {
    business_name: string;
    logo_url: string | null;
    brand_color: string | null;
    business_phone: string | null;
  };
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  CREATED: { label: 'Assigned', bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700' },
  PENDING: { label: 'Assigned', bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700' },
  DRIVER_ASSIGNED: { label: 'Assigned', bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700' },
  CONFIRMED: { label: 'Accepted', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
  OUT_FOR_DELIVERY: { label: 'On The Way', bg: 'bg-teal-50 border-teal-200', text: 'text-teal-700' },
  ARRIVED: { label: 'Nearby', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
  DELIVERED: { label: 'Delivered', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
  CANCELLED: { label: 'Failed', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700' },
};

export default function MobileDriverPortalPage() {
  const params = useParams();
  const token = params.token as string;

  const [delivery, setDelivery] = useState<DriverDelivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [splashDone, setSplashDone] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchApi(`/driver/${token}`);
      setDelivery(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'This delivery link is invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Minimum 2-second splash screen display
  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleAction = async (action: 'accept' | 'start' | 'nearby' | 'delivered' | 'failed') => {
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetchApi(`/driver/${token}/${action}`, { method: 'POST' });
      if (res.order) {
        setDelivery((prev: any) => ({ ...prev, status: res.order.status }));
      } else {
        await loadData();
      }

      const actionLabels: Record<string, string> = {
        accept: 'Delivery accepted!',
        start: 'Status updated: On The Way! Customer notified.',
        nearby: 'Status updated: Nearby! Customer notified.',
        delivered: 'Delivery completed! Customer notified.',
        failed: 'Delivery marked as failed.',
      };

      setSuccessMsg(actionLabels[action]);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to update status. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Show loader until BOTH: splash timer is done AND first API call is done
  if (!splashDone || loading) {
    return <LumoStartupLoader message="Loading delivery details..." />;
  }

  if (errorMsg && !delivery) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center mb-3">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-100">Invalid or Expired Link</h2>
        <p className="text-xs text-slate-400 max-w-xs mt-1 mb-4">{errorMsg}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const merchant = delivery?.merchant;
  const statusCfg = STATUS_CONFIG[delivery?.status || 'PENDING'] || STATUS_CONFIG.PENDING;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(delivery?.delivery_address || '')}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 font-sans selection:bg-teal-700 selection:text-white">
      <div className="w-full max-w-md space-y-4 my-auto">
        {/* Merchant Header */}
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-800 flex items-center justify-center text-white font-black text-lg shadow-sm">
              {merchant?.business_name?.[0] || 'L'}
            </div>
            <div>
              <h2 className="font-bold text-sm text-white tracking-tight">{merchant?.business_name || 'LUMO Merchant'}</h2>
              <p className="text-[11px] text-slate-400 font-medium">Driver Portal</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${statusCfg.bg} ${statusCfg.text}`}>
            {statusCfg.label}
          </span>
        </div>

        {/* Alerts */}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Delivery Details Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
          {/* Order Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order Number</p>
              <h1 className="text-xl font-black text-white font-mono">{delivery?.order_number}</h1>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Item</p>
              <p className="text-xs font-bold text-slate-200">{delivery?.product_description}</p>
            </div>
          </div>

          {/* Customer & Address */}
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Customer</p>
              <div className="flex items-center justify-between bg-slate-950 border border-slate-800 p-3 rounded-2xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-950 border border-teal-800 text-teal-400 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{delivery?.customer_name}</p>
                    <p className="text-[11px] font-mono text-slate-400">{delivery?.customer_phone}</p>
                  </div>
                </div>
                <a
                  href={`tel:${delivery?.customer_phone}`}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call</span>
                </a>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Delivery Address</p>
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl space-y-2">
                <p className="text-xs font-semibold text-amber-300 flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{delivery?.delivery_address}</span>
                </p>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-all"
                >
                  <Navigation className="w-3.5 h-3.5 text-amber-400" />
                  <span>Open Maps Navigation</span>
                </a>
              </div>
            </div>
          </div>

          {/* Action Buttons — High Impact Touch Controls */}
          <div className="pt-2 space-y-2.5">
            {delivery?.status === 'DELIVERED' ? (
              <div className="w-full py-4 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-300 font-black text-center text-sm flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Delivery Completed</span>
              </div>
            ) : delivery?.status === 'CANCELLED' ? (
              <div className="w-full py-4 rounded-2xl bg-rose-950 border border-rose-800 text-rose-300 font-bold text-center text-sm flex items-center justify-center gap-2">
                <XCircle className="w-5 h-5 text-rose-400" />
                <span>Delivery Failed / Cancelled</span>
              </div>
            ) : (
              <>
                {/* 1. Accept Delivery */}
                {(delivery?.status === 'DRIVER_ASSIGNED' || delivery?.status === 'PENDING' || delivery?.status === 'CREATED') && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleAction('accept')}
                    className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-extrabold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Accept Delivery</span>
                  </button>
                )}

                {/* 2. Start Delivery */}
                {(delivery?.status === 'CONFIRMED' || delivery?.status === 'DRIVER_ASSIGNED' || delivery?.status === 'PENDING') && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleAction('start')}
                    className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-extrabold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Start Delivery (On The Way)</span>
                  </button>
                )}

                {/* 3. I'm Nearby */}
                {delivery?.status === 'OUT_FOR_DELIVERY' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleAction('nearby')}
                    className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-extrabold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>I'm Nearby (Arrived)</span>
                  </button>
                )}

                {/* 4. Delivered */}
                {(delivery?.status === 'ARRIVED' || delivery?.status === 'OUT_FOR_DELIVERY') && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleAction('delivered')}
                    className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-base shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Mark Delivered</span>
                  </button>
                )}

                {/* 5. Failed Delivery */}
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleAction('failed')}
                  className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-rose-950 border border-slate-800 hover:border-rose-800 text-slate-400 hover:text-rose-300 font-semibold text-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span>Failed Delivery</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
          <span>Zero-Typing Driver Portal • LUMO</span>
        </div>
      </div>
    </div>
  );
}
