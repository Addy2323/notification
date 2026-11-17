'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BadgeCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { VerifiedBadge } from '@/components/common/VerifiedBadge';

export default function MerchantVerificationPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkingRef, setCheckingRef] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/verification/my/status');
      const d = res?.data || res;
      setData(d);
      if (!phone && d?.merchant?.businessPhone) {
        setPhone(d.merchant.businessPhone);
      }
      if (!selectedPlanId && d?.plans?.length > 0) {
        setSelectedPlanId(d.plans[0].id);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load verification status');
    } finally {
      setLoading(false);
    }
  }, [phone, selectedPlanId]);

  useEffect(() => {
    loadStatus();
  }, []);

  const handlePayNow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) {
      showToast('error', 'Please select a verification subscription plan');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetchApi('/verification/my/apply', {
        method: 'POST',
        body: JSON.stringify({ planId: selectedPlanId, phone }),
      });
      const app = (res?.data || res)?.application;
      showToast('success', 'Verification payment session created. Complete payment to submit for admin approval.');
      await loadStatus();
      if (app?.checkout_url) {
        window.open(app.checkout_url, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Unable to initiate payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckStatus = async (reference: string) => {
    setCheckingRef(reference);
    try {
      await fetchApi(`/verification/my/applications/${encodeURIComponent(reference)}/status`);
      showToast('success', 'Payment status refreshed');
      await loadStatus();
    } catch (err: any) {
      showToast('error', err.message || 'Unable to refresh payment status');
    } finally {
      setCheckingRef(null);
    }
  };

  const handleRepush = async (reference: string) => {
    setCheckingRef(reference);
    try {
      await fetchApi(`/verification/my/applications/${encodeURIComponent(reference)}/repush`, {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
      showToast('success', 'Mobile money USSD prompt pushed to your phone');
    } catch (err: any) {
      showToast('error', err.message || 'Unable to resend USSD prompt');
    } finally {
      setCheckingRef(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4 animate-pulse">
        <div className="h-28 bg-slate-200 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-48 bg-slate-200 rounded-2xl" />
          <div className="h-48 bg-slate-200 rounded-2xl" />
          <div className="h-48 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  const merchant = data?.merchant || {};
  const plans = data?.plans || [];
  const applications = data?.applications || [];
  const selectedPlan = plans.find((p: any) => p.id === selectedPlanId);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {toast && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.text}
        </div>
      )}

      {/* Status Header */}
      <div className="bg-gradient-to-r from-[#0B192C] to-[#1E3A5F] text-white rounded-3xl p-6 sm:p-8 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black">Verified Merchant (Blue Tick)</h1>
            {merchant.isVerified && <VerifiedBadge size="md" />}
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Build instant customer trust with the official LUMO Track Blue Verification Badge across the Merchant Marketplace, Storefront, and Search.
          </p>
        </div>

        <div className="bg-white/10 border border-white/15 rounded-2xl p-4 min-w-[210px]">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-300">Current Status</p>
          <p className="text-base font-black mt-1 flex items-center gap-1.5">
            {merchant.isVerified ? (
              <>
                <VerifiedBadge size="sm" />
                <span>VERIFIED</span>
              </>
            ) : (
              <span>{merchant.verificationStatus || 'NOT_VERIFIED'}</span>
            )}
          </p>
          {merchant.expiresAt && merchant.isVerified && (
            <p className="text-[11px] text-slate-300 mt-1">
              Valid until {new Date(merchant.expiresAt).toLocaleDateString()} ({merchant.daysRemaining}d left)
            </p>
          )}
        </div>
      </div>

      {merchant.verificationStatus === 'PAID_PENDING_REVIEW' && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-bold text-amber-900">Payment Confirmed — Pending Admin Approval</h2>
            <p className="text-xs text-amber-800 mt-0.5">
              Your subscription payment has been received. An administrator will review and activate your Blue Verification Badge shortly.
            </p>
          </div>
        </div>
      )}

      {merchant.renewalReminder && (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-[#0095F6] shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-bold text-blue-900">Renewal Reminder</h2>
            <p className="text-xs text-blue-800 mt-0.5">
              Your Verified Merchant badge expires in {merchant.daysRemaining} day(s). Renew early to keep your badge active without interruption.
            </p>
          </div>
        </div>
      )}

      {/* Dynamic Subscription Plans */}
      <form onSubmit={handlePayNow} className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Choose Verification Plan</h2>
          <p className="text-xs text-slate-500">All prices are configured live by LUMO Track administration.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan: any) => {
            const selected = selectedPlanId === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlanId(plan.id)}
                className={`p-5 rounded-2xl border-2 text-left transition flex flex-col justify-between space-y-3 ${
                  selected
                    ? 'border-[#0095F6] bg-blue-50/40 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                      {plan.duration_days} Days
                    </span>
                    <VerifiedBadge size="sm" />
                  </div>
                  <h3 className="text-base font-black text-slate-900">{plan.name}</h3>
                  {plan.description && <p className="text-xs text-slate-600">{plan.description}</p>}
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xl font-black text-[#0F172A]">
                    TZS {Number(plan.price_tzs || 0).toLocaleString('en-US')}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mobile Money Phone Number (for Snippe Checkout / USSD)
            </label>
            <div className="relative">
              <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0768828247"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting || !selectedPlan}
            className="px-6 py-3 rounded-xl bg-[#0095F6] hover:bg-blue-600 text-white text-xs font-bold shadow-sm disabled:opacity-50 inline-flex items-center justify-center gap-2 shrink-0"
          >
            <ShieldCheck className="w-4 h-4" />
            {submitting
              ? 'Initiating Payment...'
              : `Pay Now — TZS ${Number(selectedPlan?.price_tzs || 0).toLocaleString('en-US')}`}
          </button>
        </div>
      </form>

      {/* Application & Payment History */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900">Verification & Payment History</h2>
          <button
            type="button"
            onClick={loadStatus}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {applications.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No verification applications yet.</p>
        ) : (
          <div className="space-y-3">
            {applications.map((app: any) => (
              <div
                key={app.id}
                className="p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      {app.plan?.name || (app.method === 'ADMIN_GRANTED' ? 'Admin Granted Verification' : 'Verification Plan')}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      Status: {app.status}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                      Payment: {app.payment_status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    Ref: {app.transaction_reference} • TZS {Number(app.payment_amount_tzs || 0).toLocaleString('en-US')}
                  </p>
                </div>

                {app.payment_status === 'PENDING' && (
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {app.checkout_url && (
                      <a
                        href={app.checkout_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0F172A] text-white text-xs font-semibold"
                      >
                        Pay Checkout
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={checkingRef === app.transaction_reference}
                      onClick={() => handleRepush(app.transaction_reference)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Push USSD
                    </button>
                    <button
                      type="button"
                      disabled={checkingRef === app.transaction_reference}
                      onClick={() => handleCheckStatus(app.transaction_reference)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                    >
                      Verify Status
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

