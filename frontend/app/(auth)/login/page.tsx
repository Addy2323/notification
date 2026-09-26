'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, AlertCircle, Phone, ArrowRight, RotateCcw, MessageSquare, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();

  // Unified State for OTP Flow
  const [step, setStep] = useState<'REQUEST_OTP' | 'VERIFY_OTP'>('REQUEST_OTP');
  const [phone, setPhone] = useState<string>('0627204980');
  const [otp, setOtp] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    
    try {
      await fetchApi('/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
      setStep('VERIFY_OTP');
      setSuccessMessage('A verification code has been dispatched via SMS to your mobile phone.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to request OTP. Ensure your phone number is valid.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    
    try {
      const data = await fetchApi('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, otp }),
      });

      if (data.user?.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setStep('REQUEST_OTP');
    setOtp('');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-teal-700 selection:text-white">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/" className="flex items-center gap-2 mb-4 group">
            <div className="w-11 h-11 rounded-2xl bg-teal-800 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6 text-white stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                <circle cx="12" cy="12" r="4" fill="currentColor" />
              </svg>
            </div>
            <span className="text-3xl font-black tracking-tight text-slate-900">LUMO</span>
          </Link>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold mb-2">
            <Lock className="w-3.5 h-3.5 text-teal-700" />
            <span>LUMO Gateway</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Delivery Management Workspace</h1>
          <p className="text-xs font-medium text-slate-500 mt-1">OTP Secure Authentication Layer</p>
        </div>

        {/* Error / Success Alerts */}
        {errorMessage && (
          <div className="mb-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Authentication Notice</p>
              <p className="text-rose-700 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}
        
        {successMessage && (
          <div className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-3 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Verification Sent</p>
              <p className="text-emerald-800 mt-0.5">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Crisp White Card Container */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl relative">
          {step === 'REQUEST_OTP' ? (
            <form onSubmit={handleRequestOtp} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Registered Phone Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-slate-200/90 rounded-xl px-10 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10 transition-all shadow-xs"
                    placeholder="e.g. 0627204980 or 255..."
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !phone}
                className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
              >
                {loading ? 'Requesting...' : 'SEND OTP CODE'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5 flex flex-col items-center">
              <div className="w-full text-center">
                <p className="text-sm font-bold text-slate-900 mb-1">Enter Verification Code</p>
                <p className="text-xs font-medium text-slate-500">Sent to <span className="font-mono font-bold text-slate-800">{phone}</span></p>
              </div>

              <div className="w-full">
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-white border border-slate-200 text-center tracking-[0.5em] rounded-xl px-4 py-3 text-2xl font-mono font-black text-teal-800 focus:outline-none focus:border-teal-700 shadow-xs"
                  placeholder="••••••"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'SIGN IN TO WORKSPACE'}
              </button>

              <button
                type="button"
                className="text-xs font-semibold text-slate-500 hover:text-teal-800 flex items-center gap-1.5 mt-2 transition-colors"
                onClick={resetFlow}
              >
                <RotateCcw className="w-3.5 h-3.5" /> Change Phone Number
              </button>
            </form>
          )}

          {/* Register Link */}
          <div className="mt-6 pt-5 border-t border-slate-200/80 text-center text-xs font-medium text-slate-500">
            Don't have a merchant account?{' '}
            <Link href="/register" className="text-teal-700 font-bold hover:underline">
              Register Business
            </Link>
          </div>
        </div>

        {/* Protected System Footer */}
        <div className="mt-8 flex flex-col items-center text-center gap-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Protected by LUMO OTP Gateway v1.1</span>
          </div>
          <p className="text-[11px] text-slate-400">LotusRise Company Limited — All Rights Reserved</p>
        </div>
      </div>
    </div>
  );
}
