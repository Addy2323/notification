'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Zap,
  TrendingUp,
  CreditCard,
  History,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ArrowUpRight,
  Smartphone,
  Info,
  Clock,
  Sparkles,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useLanguage } from '@/components/LanguageProvider';

interface TopupTransaction {
  id: string;
  reference: string;
  requested_units: number;
  unit_price: number;
  total_amount: number;
  payment_status: string;
  allocated: boolean;
  allocated_at?: string;
  checkout_url?: string;
  payment_link_url?: string;
  customer_phone?: string;
  created_at: string;
}

interface LedgerEntry {
  id: string;
  amount: number;
  type: string;
  balance_before: number;
  balance_after: number;
  reference?: string;
  reason: string;
  created_at: string;
}

export default function MerchantSmsPage() {
  const { t, locale } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Top-Up Form State
  const [quantity, setQuantity] = useState<number>(1000);
  const [phone, setPhone] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [topupError, setTopupError] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<any>(null);

  const isSw = locale === 'sw';

  const loadSmsData = useCallback(async () => {
    try {
      const res = await fetchApi('/sms/overview');
      setData(res);
      if (res.account?.health) {
        // success
      }
    } catch (err: any) {
      console.error('Failed to load SMS overview:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSmsData();
  }, [loadSmsData]);

  // Check URL parameters for payment redirect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref');
      const status = urlParams.get('status');
      if (ref && status === 'success') {
        fetchApi(`/sms/status/${encodeURIComponent(ref)}`)
          .then(() => {
            loadSmsData();
          })
          .catch(() => {});
      }
    }
  }, [loadSmsData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadSmsData();
  };

  const unitPrice = data?.pricing?.unitPriceTzs || 20;
  const minUnits = data?.pricing?.minUnits || 25;
  const maxUnits = data?.pricing?.maxUnits || 500000;
  const calculatedPayable = Math.max(0, (quantity || 0) * unitPrice);

  const handleInitiateTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    setTopupError(null);

    if (!quantity || quantity < minUnits) {
      setTopupError(
        isSw
          ? `Kiasi cha chini cha SMS ni vitengo ${minUnits}.`
          : `Minimum top-up quantity is ${minUnits} SMS units.`
      );
      return;
    }

    if (quantity > maxUnits) {
      setTopupError(
        isSw
          ? `Kiasi cha juu cha SMS ni vitengo ${maxUnits.toLocaleString()}.`
          : `Maximum top-up quantity is ${maxUnits.toLocaleString()} SMS units.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetchApi('/sms/topup', {
        method: 'POST',
        body: JSON.stringify({
          requestedUnits: quantity,
          customerPhone: phone || undefined,
        }),
      });

      setActiveSession(res);

      if (res.checkoutUrl) {
        // Open checkout URL or redirect
        window.location.href = res.checkoutUrl;
      }
    } catch (err: any) {
      setTopupError(err.message || 'Failed to initiate payment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-10 h-10 text-[#FF5500] animate-spin mb-4" />
        <p className="text-slate-600 font-bold text-sm">
          {isSw ? 'Inapakia taarifa za SMS...' : 'Loading SMS management & balance...'}
        </p>
      </div>
    );
  }

  const account = data?.account || {};
  const health = account.health || {
    availableCredits: account.availableCredits || 0,
    referenceUnits: account.balanceReferenceUnits || 1000,
    percentage: 100,
    status: 'HEALTHY',
    color: 'green',
  };

  const getProgressBarColor = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-emerald-500';
      case 'amber':
        return 'bg-amber-500';
      case 'red':
      default:
        return 'bg-red-500';
    }
  };

  const getBadgeStyle = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'amber':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'red':
      default:
        return 'bg-red-50 border-red-200 text-red-800';
    }
  };

  const quickAmounts = [500, 1000, 2500, 5000, 10000];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-orange-100 text-[#FF5500]">
              <MessageSquare className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {isSw ? 'Usimamizi wa SMS na Salio' : 'Smart SMS Management & Top-Up'}
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            {isSw
              ? 'Weka salio la SMS, fuatilia matumizi, na thibitisha risiti na arifa za wateja.'
              : 'Self-service SMS credit top-ups, live balance progress, and transparent billing.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{isSw ? 'Sasisha' : 'Refresh'}</span>
          </button>

          <a
            href="#topup-section"
            className="flex items-center gap-2 px-4 py-2 text-xs font-black text-white bg-gradient-to-r from-[#FF5500] to-orange-600 rounded-xl hover:brightness-105 active:scale-95 transition-all shadow-md shadow-orange-500/20"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isSw ? 'Ongeza Salio la SMS' : 'Top Up Credits'}</span>
          </a>
        </div>
      </div>

      {/* SMS Balance Card with Dynamic Progress Bar */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-700/60">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-72 h-72 bg-[#FF5500]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-700/80">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              <span>{isSw ? 'Salio Lililopo la SMS' : 'Available SMS Credits'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                {(account.availableCredits || 0).toLocaleString()}
              </span>
              <span className="text-sm font-bold text-slate-400">
                {isSw ? 'SMS zilizopo' : 'billable units'}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className={`px-4 py-2 rounded-xl border text-xs font-black flex items-center gap-2 ${getBadgeStyle(health.color)}`}>
              {health.color === 'green' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              {health.color === 'amber' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
              {health.color === 'red' && <AlertCircle className="w-4 h-4 text-red-600" />}
              <span>{isSw ? health.statusLabelSw : health.statusLabelEn}</span>
            </div>

            <a
              href="#topup-section"
              className="px-5 py-2.5 rounded-xl bg-[#FF5500] hover:bg-orange-600 active:scale-95 text-white font-black text-xs transition-all shadow-md text-center"
            >
              {isSw ? 'Weka Salio Sasa' : 'Top Up Now'}
            </a>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="pt-6 relative z-10 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300">
              {isSw ? 'Hali ya Salio na Asilimia' : 'SMS Health Indicator'}
            </span>
            <span className="font-black text-white">
              {health.percentage}%
            </span>
          </div>

          {/* Progress Track */}
          <div className="w-full h-4 bg-slate-800 rounded-full p-0.5 border border-slate-700/80 overflow-hidden shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${getProgressBarColor(
                health.color
              )}`}
              style={{ width: `${health.percentage}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>{isSw ? '61%–100% Salio la Kutosha (Kijani)' : '61%–100% Healthy (Green)'}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              <span>{isSw ? '26%–60% Linapungua (Manjano)' : '26%–60% Low Balance (Amber)'}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              <span>{isSw ? '0%–25% Hatari / Tupu (Nyekundu)' : '0%–25% Critical (Red)'}</span>
            </span>
          </div>

          <p className="text-[11px] text-slate-400 italic pt-1">
            {isSw
              ? '* Kila ukiongeza salio jipya au kupokea ongezeko kutoka kwa Admin, kigezo kinasasishwa na kurudi 100% (Kijani kibichi).'
              : '* Whenever you complete a top-up or receive an authorized admin extension, your balance reference updates immediately back to 100% Green.'}
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold text-slate-500">{isSw ? 'Jumla Iliyonunuliwa' : 'Total Purchased'}</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {(account.totalPurchased || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{isSw ? 'Vitengo vya SMS' : 'SMS units bought'}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold text-slate-500">{isSw ? 'Ongezeko la Admin' : 'Admin Extensions'}</span>
            <ShieldCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {(account.totalExtended || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{isSw ? 'SMS zilizoongezwa' : 'Granted by Admin'}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold text-slate-500">{isSw ? 'Zilizotumika' : 'Total Consumed'}</span>
            <MessageSquare className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {(account.totalConsumed || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{isSw ? 'Arifa zilizotumwa' : 'Deducted usage'}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold text-slate-500">{isSw ? 'Bei kwa Unit' : 'Unit Price'}</span>
            <DollarSign className="w-4 h-4 text-[#FF5500]" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            TSh {unitPrice}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{isSw ? 'Bila ada ya mwezi' : 'No monthly fee'}</p>
        </div>
      </div>

      {/* Custom SMS Top-Up Section */}
      <div id="topup-section" className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-orange-50 text-[#FF5500]">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">
              {isSw ? 'Ongeza Salio la SMS (Self-Service)' : 'Custom SMS Top-Up'}
            </h2>
            <p className="text-xs text-slate-500">
              {isSw
                ? 'Weka idadi yoyote ya SMS unazohitaji. Malipo hufanywa kwa njia ya simu (Snippe Mobile Money).'
                : 'Enter your desired SMS quantity. Instant USSD push & automatic verified credit allocation.'}
            </p>
          </div>
        </div>

        {topupError && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{topupError}</span>
          </div>
        )}

        <form onSubmit={handleInitiateTopup} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quantity Input */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                {isSw ? 'Idadi ya SMS (Vitengo)' : 'Requested SMS Units'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={minUnits}
                  max={maxUnits}
                  step="1"
                  value={quantity || ''}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                  placeholder="1000"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 font-black text-slate-900 text-lg focus:outline-none focus:ring-2 focus:ring-[#FF5500] focus:border-transparent"
                  required
                />
                <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">
                  {isSw ? 'Vitengo' : 'Units'}
                </span>
              </div>

              {/* Quick Select Buttons */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="text-[11px] font-bold text-slate-400">{isSw ? 'Chagua haraka:' : 'Quick Select:'}</span>
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setQuantity(amt)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      quantity === amt
                        ? 'bg-[#0F172A] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    +{amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Money Phone Input */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                {isSw ? 'Namba ya Simu kwa Malipo (M-Pesa, Airtel, Mixx, Halotel)' : 'Mobile Money Phone Number'}
              </label>
              <div className="relative">
                <Smartphone className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="255711788830 au 0711788830"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5500] focus:border-transparent"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                {isSw
                  ? 'Ukibonyeza lipa, utapokea USSD Push kwenye simu yako kuweka PIN.'
                  : 'Customer receives a USSD prompt on their phone to authorize payment with PIN.'}
              </p>
            </div>
          </div>

          {/* Pricing Preview Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs text-slate-500">
                <span>{isSw ? 'Hesabu ya Malipo:' : 'Payable Breakdown:'} </span>
                <span className="font-bold text-slate-700">
                  {quantity.toLocaleString()} SMS × TSh {unitPrice}
                </span>
              </div>
              <div className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isSw ? 'SMS hazina muda wa kuisha kila mwezi' : 'No monthly expiration — credits carry forward'}</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {isSw ? 'Jumla ya Kulipwa' : 'Total Payable'}
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                TZS {calculatedPayable.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || quantity < minUnits}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#FF5500] to-orange-600 hover:brightness-105 active:scale-95 disabled:opacity-50 text-white font-black text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isSw ? 'Inatayarisha Malipo...' : 'Creating Payment Session...'}</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>
                    {isSw
                      ? `Lipa TZS ${calculatedPayable.toLocaleString()} kwa Simu`
                      : `Proceed to Pay TZS ${calculatedPayable.toLocaleString()}`}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Top-Up Transactions History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-500" />
            <h3 className="text-base font-black text-slate-900">
              {isSw ? 'Historia ya Malipo ya SMS' : 'SMS Top-Up Transactions'}
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {data?.recentTransactions?.length || 0} {isSw ? 'miamala' : 'records'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">{isSw ? 'Tarehe' : 'Date'}</th>
                <th className="py-3.5 px-4">{isSw ? 'Kumbukumbu' : 'Reference'}</th>
                <th className="py-3.5 px-4">{isSw ? 'Idadi ya SMS' : 'SMS Units'}</th>
                <th className="py-3.5 px-4">{isSw ? 'Bei/Unit' : 'Unit Rate'}</th>
                <th className="py-3.5 px-4">{isSw ? 'Jumla (TZS)' : 'Amount (TZS)'}</th>
                <th className="py-3.5 px-4">{isSw ? 'Hali ya Malipo' : 'Payment Status'}</th>
                <th className="py-3.5 px-4">{isSw ? 'Salio Lililowekwa' : 'Credit Allocated'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.recentTransactions && data.recentTransactions.length > 0 ? (
                data.recentTransactions.map((tx: TopupTransaction) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-600 font-bold whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleDateString(locale, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {tx.reference}
                    </td>
                    <td className="py-3 px-4 font-black text-slate-900">
                      +{tx.requested_units.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      TSh {tx.unit_price}
                    </td>
                    <td className="py-3 px-4 font-black text-slate-900">
                      TZS {tx.total_amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black ${
                          tx.payment_status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : tx.payment_status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {tx.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {tx.allocated ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isSw ? 'Imewekwa' : 'Allocated'}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 font-bold text-[11px]">
                          {isSw ? 'Inasubiri' : 'Pending'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-bold">
                    {isSw ? 'Bado hakuna miamala ya SMS.' : 'No SMS top-up transactions yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SMS Usage & Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-slate-500" />
            <h3 className="text-base font-black text-slate-900">
              {isSw ? 'Leja ya Matumizi ya SMS' : 'SMS Credit Ledger & Usage'}
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {data?.recentLedger?.length || 0} {isSw ? 'rekodi za leja' : 'ledger entries'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">{isSw ? 'Tarehe' : 'Date'}</th>
                <th className="py-3.5 px-4">{isSw ? 'Sababu / Taarifa' : 'Reason / Event'}</th>
                <th className="py-3.5 px-4">{isSw ? 'Aina' : 'Type'}</th>
                <th className="py-3.5 px-4">{isSw ? 'Kiasi (SMS)' : 'Change (SMS)'}</th>
                <th className="py-3.5 px-4">{isSw ? 'Salio Kabla' : 'Before'}</th>
                <th className="py-3.5 px-4">{isSw ? 'Salio Baada' : 'After'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.recentLedger && data.recentLedger.length > 0 ? (
                data.recentLedger.map((row: LedgerEntry) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-600 font-bold whitespace-nowrap">
                      {new Date(row.created_at).toLocaleDateString(locale, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {row.reason}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {row.type}
                      </span>
                    </td>
                    <td
                      className={`py-3 px-4 font-black ${
                        row.amount > 0 ? 'text-emerald-600' : 'text-slate-700'
                      }`}
                    >
                      {row.amount > 0 ? `+${row.amount}` : row.amount}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {row.balance_before.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-black text-slate-900 font-mono">
                      {row.balance_after.toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">
                    {isSw ? 'Bado hakuna kumbukumbu za matumizi.' : 'No credit ledger entries yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
