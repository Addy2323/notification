'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  XCircle,
  Package,
  Store,
  Clock,
  AlertCircle,
  Loader2,
  ShieldCheck,
  PhoneCall,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { useLanguage, T } from '@/components/LanguageProvider';
import LanguageSelector from '@/components/LanguageSelector';
import { fetchApi } from '@/lib/api';

interface ConfirmationData {
  confirmation_id: string;
  order_id: string;
  order_number: string;
  masked_customer_name: string;
  product_name: string;
  amount: number;
  delivered_at?: string;
  order_status: string;
  items?: Array<{
    product_name_snapshot: string;
    quantity: number;
    unit_selling_price: number;
    subtotal: number;
  }>;
  merchant: {
    name: string;
    logo?: string | null;
    brand_color?: string;
    phone?: string | null;
  };
  is_already_confirmed: boolean;
  customer_response?: 'RECEIVED' | 'NOT_RECEIVED' | null;
  responded_at?: string | null;
  followup_status?: string | null;
}

export default function OrderReceiptConfirmationPage() {
  const { t, locale } = useLanguage();
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ConfirmationData | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedResponse, setSubmittedResponse] = useState<'RECEIVED' | 'NOT_RECEIVED' | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isSwahili = locale === 'sw';

  useEffect(() => {
    if (!token) return;

    async function loadConfirmationInfo() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchApi(`/confirm/token/${token}`);
        setData(res);
        if (res.is_already_confirmed && res.customer_response) {
          setSubmittedResponse(res.customer_response);
        }
      } catch (err: any) {
        console.error('Failed to load confirmation details:', err);
        setError(
          err.message ||
            (isSwahili
              ? 'Kiungo hiki si sahihi au kimeisha muda wake. Tafadhali angalia SMS yako au wasiliana na huduma kwa wateja.'
              : 'This confirmation link is invalid or expired. Please check your SMS or contact support.')
        );
      } finally {
        setLoading(false);
      }
    }

    loadConfirmationInfo();
  }, [token, isSwahili]);

  const handleConfirmation = async (response: 'YES' | 'NO') => {
    if (submitting || submittedResponse) return;

    try {
      setSubmitting(true);
      setSubmitError(null);

      const res = await fetchApi('/confirm/submit', {
        method: 'POST',
        body: JSON.stringify({
          token,
          response,
        }),
      });

      const normalized = res.response === 'YES' || res.response === 'RECEIVED' ? 'RECEIVED' : 'NOT_RECEIVED';
      setSubmittedResponse(normalized);
    } catch (err: any) {
      if (err.code === 'ALREADY_SUBMITTED') {
        setSubmittedResponse(err.details?.existing_response || 'RECEIVED');
      } else {
        setSubmitError(
          err.message ||
            (isSwahili
              ? 'Imeshindwa kuwasilisha jibu lako. Tafadhali jaribu tena.'
              : 'Failed to submit your confirmation. Please check your network and try again.')
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 shadow-xl rounded-3xl p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-500 animate-pulse">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <h2 className="text-base font-black text-slate-800">
            {isSwahili ? 'Inapakia Taarifa za Oda...' : 'Loading Order Confirmation...'}
          </h2>
          <p className="text-xs text-slate-500">
            {isSwahili ? 'Tafadhali subiri kidogo tunapothibitisha kiungo chako.' : 'Please wait while we verify your confirmation link.'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6">
        <header className="max-w-md w-full mx-auto flex items-center justify-between pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-amber-400 font-black text-sm">
              L
            </div>
            <span className="font-black text-slate-900 tracking-tight text-sm">LUMO Delivery</span>
          </div>
          <LanguageSelector />
        </header>

        <main className="max-w-md w-full mx-auto my-auto">
          <div className="bg-white border border-rose-100 shadow-xl rounded-3xl p-6 sm:p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center mx-auto text-rose-500">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h1 className="text-lg font-black text-slate-900">
              {isSwahili ? 'Kiungo Si Sahihi au Kimeisha Muda' : 'Invalid or Expired Link'}
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">{error}</p>
            <div className="pt-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                {isSwahili ? 'Jaribu Tena' : 'Try Again'}
              </button>
            </div>
          </div>
        </main>

        <footer className="text-center text-[11px] text-slate-400 py-4">
          © {new Date().getFullYear()} LUMO Track • Powered by LotusRise Co. Ltd
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 antialiased selection:bg-[#16794B] selection:text-white">
      {/* Top Header */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between pb-4">
        <div className="flex items-center gap-2.5">
          {data.merchant.logo ? (
            <img
              src={data.merchant.logo}
              alt={data.merchant.name}
              className="w-8 h-8 rounded-xl object-contain border border-slate-200 bg-white"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm"
              style={{ backgroundColor: data.merchant.brand_color || '#16794B' }}
            >
              {data.merchant.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-xs font-black text-slate-900 leading-none">{data.merchant.name}</p>
            <span className="text-[10px] text-slate-400 font-medium">LUMO Verified Delivery</span>
          </div>
        </div>

        <LanguageSelector />
      </header>

      {/* Main Container */}
      <main className="max-w-md w-full mx-auto space-y-4 my-auto">
        {/* Order Details Card */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {isSwahili ? 'Nambari ya Oda' : 'Order Reference'}
              </span>
              <p className="text-sm font-black text-slate-900 font-mono">#{data.order_number}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {isSwahili ? 'Mpokeaji' : 'Recipient'}
              </span>
              <p className="text-xs font-bold text-slate-700">{data.masked_customer_name}</p>
            </div>
          </div>

          {/* Product Summary */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Package className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{data.product_name}</p>
              {data.items && data.items.length > 0 ? (
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {data.items.length} {isSwahili ? 'bidhaa kwenye oda hii' : 'item(s) in this order'}
                </p>
              ) : null}
              {data.amount ? (
                <p className="text-[11px] font-bold text-slate-700 mt-1 font-mono">
                  TZS {Number(data.amount).toLocaleString(locale)}
                </p>
              ) : null}
            </div>
          </div>

          {/* Delivered At timestamp if available */}
          {data.delivered_at && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500 px-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {isSwahili ? 'Iliwasilishwa: ' : 'Dispatched/Handed over: '}
                {new Date(data.delivered_at).toLocaleDateString(locale, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>

        {/* Confirmation State & Actions */}
        {submittedResponse ? (
          <div
            className={`border rounded-3xl p-6 shadow-md text-center space-y-4 transition-all ${
              submittedResponse === 'RECEIVED'
                ? 'bg-emerald-50/70 border-emerald-200'
                : 'bg-rose-50/70 border-rose-200'
            }`}
          >
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-sm ${
                submittedResponse === 'RECEIVED'
                  ? 'bg-[#16794B] text-white'
                  : 'bg-[#C53030] text-white'
              }`}
            >
              {submittedResponse === 'RECEIVED' ? (
                <CheckCircle2 className="w-8 h-8" />
              ) : (
                <XCircle className="w-8 h-8" />
              )}
            </div>

            <div>
              <h2
                className={`text-base font-black ${
                  submittedResponse === 'RECEIVED' ? 'text-emerald-950' : 'text-rose-950'
                }`}
              >
                {submittedResponse === 'RECEIVED'
                  ? isSwahili
                    ? 'Asante! Umethibitisha Kupokea Oda Yako'
                    : 'Receipt Confirmed! Thank you!'
                  : isSwahili
                  ? 'Taarifa Yako Imepokelewa'
                  : 'Report Logged — Follow-Up Initiated'}
              </h2>

              <p
                className={`text-xs mt-1.5 leading-relaxed ${
                  submittedResponse === 'RECEIVED' ? 'text-emerald-800' : 'text-rose-800'
                }`}
              >
                {submittedResponse === 'RECEIVED'
                  ? isSwahili
                    ? 'Tunafurahi kuwa umepokea mzigo wako salama. Ujumbe mfupi (SMS) wa shukrani umetumwa kwenye simu yako.'
                    : "We're glad you received your order. A confirmation thank-you SMS has been dispatched to your phone."
                  : isSwahili
                  ? 'Pole kwa changamoto hii. Timu yetu ya usafirishaji na muuzaji wameshapewa taarifa mara moja na watawasiliana nawe hivi punde kutatua suala hili.'
                  : 'We apologize for this inconvenience. An urgent investigation case has been opened and our support team will contact you shortly.'}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200/50 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>
                {isSwahili ? 'Jibu lako limerekodiwa rasmi' : 'Response securely recorded on file'}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-md text-center space-y-5">
            {submitError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-left flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {isSwahili ? 'Uthibitisho wa Mteja' : 'Customer Confirmation'}
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                {isSwahili ? 'Je, umepokea oda yako?' : 'Have you received your order?'}
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                {isSwahili
                  ? 'Tafadhali chagua mojawapo ya vitufe vilivyo hapa chini kuthibitisha.'
                  : 'Please tap one of the buttons below to confirm with our delivery team.'}
              </p>
            </div>

            {/* Accessible Two Action Buttons matching user exact SVG spec */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* YES BUTTON */}
              <button
                type="button"
                onClick={() => handleConfirmation('YES')}
                disabled={submitting}
                className="group relative flex items-center justify-center gap-2.5 h-[52px] rounded-xl font-bold text-sm text-white transition-all shadow-md active:scale-98 disabled:opacity-50"
                style={{ backgroundColor: '#16794B' }}
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : (
                  <>
                    <span className="text-base font-black">✓</span>
                    <span>{isSwahili ? 'Ndiyo, nimepokea oda yangu' : '✓ Yes, received'}</span>
                  </>
                )}
              </button>

              {/* NO BUTTON */}
              <button
                type="button"
                onClick={() => handleConfirmation('NO')}
                disabled={submitting}
                className="group relative flex items-center justify-center gap-2.5 h-[52px] rounded-xl font-bold text-sm transition-all shadow-sm active:scale-98 disabled:opacity-50"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #D64545',
                  color: '#C53030',
                }}
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#C53030]" />
                ) : (
                  <>
                    <span className="text-base font-black">✕</span>
                    <span>{isSwahili ? 'Hapana, sijapokea oda yangu' : '✕ No, not received'}</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {isSwahili
                  ? 'Uthibitisho wako husaidia kuboresha huduma za usafirishaji'
                  : 'Your confirmation protects your order and verifies delivery'}
              </span>
            </div>
          </div>
        )}

        {/* Merchant Support Info */}
        {data.merchant.phone && (
          <div className="text-center pt-2">
            <a
              href={`tel:${data.merchant.phone}`}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium"
            >
              <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {isSwahili ? 'Maswali kuhusu oda yako? Piga: ' : 'Questions about your delivery? Call: '}
                <strong className="text-slate-700">{data.merchant.phone}</strong>
              </span>
            </a>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-400 py-4 max-w-md w-full mx-auto">
        <p>© {new Date().getFullYear()} LUMO Delivery Platform • LotusRise Company Limited</p>
      </footer>
    </div>
  );
}
