'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Truck, MapPin, Package, Phone, MessageSquare, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function DriverPortalPage() {
  const params = useParams();
  const token = params.token as string;

  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const handleDriverAction = async (action: 'start' | 'arrived' | 'delivered') => {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchApi(`/driver/${token}/${action}`, { method: 'POST' });
      if (res.delivery) {
        setDelivery((prev: any) => ({
          ...prev,
          status: res.delivery.status,
        }));
      } else {
        await loadData();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to update status. Please check your network connection.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-10 h-10 text-lumo-500 animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-medium">Loading Driver Portal...</p>
      </div>
    );
  }

  if (errorMsg && !delivery) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-950 border border-rose-800 text-rose-400 flex items-center justify-center mb-3">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-100">Invalid or Expired Link</h2>
        <p className="text-xs text-slate-400 max-w-xs mt-1 mb-4">{errorMsg}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>RETRY</span>
        </button>
      </div>
    );
  }

  const merchant = delivery?.merchant;
  const brandColor = merchant?.brand_color || '#1E40AF';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 selection:bg-lumo-800 font-sans">
      <div className="w-full max-w-md space-y-4 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            {merchant?.logo_url ? (
              <img src={merchant.logo_url} alt="Logo" className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg"
                style={{ backgroundColor: brandColor }}
              >
                {merchant?.business_name?.[0] || 'L'}
              </div>
            )}
            <div>
              <h2 className="font-bold text-sm text-white">{merchant?.business_name}</h2>
              <p className="text-[11px] text-slate-400">Driver Delivery Portal</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 px-2 py-1 rounded-md font-bold">
              {delivery?.status}
            </span>
          </div>
        </div>

        {/* Action Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950 border border-rose-800 text-rose-300 text-xs flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={loadData} className="underline font-bold text-rose-200">
              Retry
            </button>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
          {/* Item details */}
          <div className="space-y-1 pb-4 border-b border-slate-800">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-lumo-400" />
              <span>Product to Deliver</span>
            </div>
            <h1 className="text-xl font-black text-white">{delivery?.product_description}</h1>
          </div>

          {/* Delivery Location */}
          <div className="space-y-1 pb-4 border-b border-slate-800">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-lumo-400" />
              <span>Deliver To Address</span>
            </div>
            <p className="text-sm font-bold text-amber-300">{delivery?.delivery_address}</p>
          </div>

          {/* Customer info & Quick Call */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer Phone</p>
              <p className="text-sm font-mono font-bold text-white">{delivery?.customer_masked_phone}</p>
            </div>

            <div className="flex gap-2">
              <a
                href={`tel:${delivery?.customer_raw_phone}`}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs flex items-center gap-1.5"
              >
                <Phone className="w-4 h-4" />
                <span>CALL</span>
              </a>
              <a
                href={`https://wa.me/${delivery?.customer_raw_phone?.replace('+', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 font-bold text-xs flex items-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>WHATSAPP</span>
              </a>
            </div>
          </div>

          {/* ONE DOMINANT PRIMARY ACTION BUTTON */}
          <div className="pt-4">
            {delivery?.status === 'CREATED' && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleDriverAction('start')}
                className="w-full py-4 rounded-2xl text-white font-extrabold text-base shadow-glow tracking-wide transition-all active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: brandColor }}
              >
                {actionLoading ? 'STARTING...' : 'START DELIVERY'}
              </button>
            )}

            {delivery?.status === 'ON_THE_WAY' && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleDriverAction('arrived')}
                className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black text-base shadow-glow tracking-wide transition-all active:scale-95 disabled:opacity-50"
              >
                {actionLoading ? 'UPDATING...' : 'I HAVE ARRIVED'}
              </button>
            )}

            {delivery?.status === 'ARRIVED' && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleDriverAction('delivered')}
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-base shadow-glow tracking-wide transition-all active:scale-95 disabled:opacity-50"
              >
                {actionLoading ? 'CONFIRMING...' : 'CONFIRM DELIVERED'}
              </button>
            )}

            {delivery?.status === 'DELIVERED' && (
              <div className="w-full py-4 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-300 font-black text-center text-sm flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>✓ DELIVERY COMPLETED</span>
              </div>
            )}

            {delivery?.status === 'CANCELLED' && (
              <div className="w-full py-4 rounded-2xl bg-rose-950 border border-rose-800 text-rose-300 font-bold text-center text-sm">
                Delivery Cancelled
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-lumo-400" />
          <span>Powered by LUMO Delivery Portal</span>
        </div>
      </div>
    </div>
  );
}
