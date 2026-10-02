'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Store, ShieldCheck, ArrowRight, XCircle, CheckCircle2, Phone, KeyRound, Sparkles, Eye, EyeOff } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { OtpInput } from '@/app/components/OtpInput';

export default function RegisterPage() {
  const router = useRouter();

  // Registration Form State
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    pin: '1234',
    business_name: '',
    business_phone: '',
    location: '',
  });

  const [showPassword, setShowPassword] = useState(false);

  // Flow Step: 'INFO' | 'OTP' | 'ONBOARDING'
  const [step, setStep] = useState<'INFO' | 'OTP' | 'ONBOARDING'>('INFO');
  
  // OTP Verification State
  const [otpCode, setOtpCode] = useState<string>('');

  // OTP Countdown Timer State
  const [otpTimerKey, setOtpTimerKey] = useState<number>(0);
  
  // Status & Feedback State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Field-level Validation Errors State
  const [fieldErrors, setFieldErrors] = useState<{
    business_name?: string;
    business_phone?: string;
    name?: string;
    email?: string;
    password?: string;
    pin?: string;
  }>({});

  // Validate single field or all fields
  const validateForm = () => {
    const errors: typeof fieldErrors = {};

    // Business Name
    if (!form.business_name.trim()) {
      errors.business_name = 'Business name is required.';
    } else if (form.business_name.trim().length < 2) {
      errors.business_name = 'Business name must be at least 2 characters.';
    }

    // Business Phone
    const phoneClean = form.business_phone.replace(/\s+/g, '');
    if (!phoneClean) {
      errors.business_phone = 'Phone number is required.';
    } else if (!/^(?:\+?255|0)[67]\d{8}$/.test(phoneClean) && !/^\+?\d{9,13}$/.test(phoneClean)) {
      errors.business_phone = 'Please enter a valid phone number (e.g. 0627204980 or 0744963858).';
    }

    // Operator Name
    if (!form.name.trim()) {
      errors.name = 'Operator name is required.';
    } else if (form.name.trim().length < 2) {
      errors.name = 'Operator name must be at least 2 characters.';
    }

    // Email (Optional)
    if (form.email && form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    // Password
    if (!form.password) {
      errors.password = 'Account password is required.';
    } else if (form.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long.';
    }

    // PIN
    if (!form.pin) {
      errors.pin = '4-digit PIN is required.';
    } else if (!/^\d{4}$/.test(form.pin)) {
      errors.pin = 'PIN must be exactly 4 numeric digits.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 1: Request SMS OTP to Business Phone
  const handleInitiateRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!validateForm()) {
      setErrorMessage('Please fix the highlighted errors before continuing.');
      return;
    }

    setLoading(true);

    try {
      // Send 6-digit OTP to business phone
      await fetchApi('/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: form.business_phone }),
      });

      setStep('OTP');
      setOtpTimerKey((prev) => prev + 1);
      setSuccessMessage(`A 6-digit verification SMS code has been sent to ${form.business_phone}.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send SMS OTP to business phone.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP Code
  const handleResendOtp = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await fetchApi('/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: form.business_phone }),
      });
      setOtpTimerKey((prev) => prev + 1);
      setSuccessMessage('A new 6-digit SMS verification code has been dispatched.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend SMS code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and Register Account (Supports manual submit & auto-submit on 6th digit)
  const executeRegistrationWithOtp = async (codeToVerify: string) => {
    if (loading) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      // First verify OTP code
      await fetchApi('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: form.business_phone, otp: codeToVerify }),
      });

      // Then complete merchant registration
      await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          email: form.email || undefined,
          password: form.password,
          pin: form.pin || '1234',
          business_phone: form.business_phone,
          business_name: form.business_name,
          location: form.location || undefined,
        }),
      });

      // Show PWA Onboarding step before navigating to dashboard
      setStep('ONBOARDING');
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeRegistrationWithOtp(otpCode);
  };

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-900 font-sans flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden selection:bg-emerald-600 selection:text-white">
      {/* Liquid Ambient Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-teal-400/25 rounded-full blur-[120px] pointer-events-none animate-liquid-1" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[550px] h-[550px] bg-cyan-400/20 rounded-full blur-[140px] pointer-events-none animate-liquid-2" />

      {/* Background Flowing Water Drops */}
      <div className="bg-water-droplet w-3.5 h-6 left-[10%] animate-drop-flow-1" />
      <div className="bg-water-droplet w-2.5 h-4 left-[26%] animate-drop-flow-2" />
      <div className="bg-water-droplet w-4 h-7 left-[52%] animate-drop-flow-3" />
      <div className="bg-water-droplet w-3 h-5 left-[78%] animate-drop-flow-4" />
      <div className="bg-water-droplet w-2.5 h-4 left-[92%] animate-drop-flow-5" />

      <div className="w-full max-w-lg z-10 flex flex-col items-center">
        {/* Error Alert */}
        {errorMessage && (
          <div className="w-full water-alert-banner rounded-2xl p-3.5 px-4 text-xs font-medium flex items-center justify-between gap-3 mb-4 shadow-xl border border-rose-900/60 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <XCircle className="w-4 h-4 text-rose-300 shrink-0" />
              <span className="text-rose-100 font-semibold">{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-300 hover:text-rose-100">✕</button>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="w-full mb-4 p-3 rounded-2xl bg-emerald-950/90 border border-emerald-800/60 text-emerald-100 text-xs font-medium flex items-center gap-2.5 shadow-xl backdrop-blur-md animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Liquid Water Glass Card */}
        <div className="w-full water-glass-card rounded-[32px] p-6 sm:p-8 shadow-2xl relative border border-white/80 overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-60" />

          {/* Liquid Water Droplets on Card */}
          <div className="water-droplet w-4 h-4 top-4 right-6 animate-drop-pulse" />
          <div className="water-droplet w-2.5 h-2.5 top-12 left-5 opacity-75" />
          <div className="water-droplet w-3.5 h-3.5 bottom-6 right-6 animate-drop-pulse" />
          <div className="water-droplet w-2 h-2 bottom-12 left-6 opacity-60" />

          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-3 shadow-sm">
              <Store className="w-5 h-5 text-emerald-700 stroke-[2]" />
            </div>

            <h1 className="text-2xl font-black text-slate-900 font-serif tracking-tight">
              {step === 'INFO'
                ? 'Register Operator Business'
                : step === 'OTP'
                ? 'Phone Number OTP Verification'
                : 'Your LUMO Merchant account is ready.'}
            </h1>
            <p className="text-xs font-medium text-slate-500 mt-1">
              {step === 'INFO'
                ? 'Set up your merchant profile, 4-digit PIN, and workspace access.'
                : step === 'OTP'
                ? `Enter the 6-digit SMS code sent to ${form.business_phone} to verify business ownership.`
                : 'Install LUMO Merchant for faster access to your delivery dashboard.'}
            </p>
          </div>

          {/* STEP 1: MERCHANT BUSINESS DETAILS */}
          {step === 'INFO' && (
            <form onSubmit={handleInitiateRegistration} className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.business_name}
                    onChange={(e) => {
                      setForm({ ...form, business_name: e.target.value });
                      if (fieldErrors.business_name) setFieldErrors({ ...fieldErrors, business_name: undefined });
                    }}
                    className={`w-full bg-white/90 border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 shadow-sm ${
                      fieldErrors.business_name
                        ? 'border-rose-500 focus:ring-rose-500/20 bg-rose-50/30'
                        : 'border-slate-200/90 focus:ring-emerald-600/20'
                    }`}
                    placeholder="e.g. Lotus Bloom Boutique"
                  />
                  {fieldErrors.business_name && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1">{fieldErrors.business_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Business Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.business_phone}
                    onChange={(e) => {
                      // Strictly sanitize non-numeric input (allow leading + and numbers only)
                      const sanitized = e.target.value.replace(/[^0-9+]/g, '');
                      setForm({ ...form, business_phone: sanitized });
                      if (fieldErrors.business_phone) setFieldErrors({ ...fieldErrors, business_phone: undefined });
                    }}
                    className={`w-full bg-white/90 border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 shadow-sm ${
                      fieldErrors.business_phone
                        ? 'border-rose-500 focus:ring-rose-500/20 bg-rose-50/30'
                        : 'border-slate-200/90 focus:ring-emerald-600/20'
                    }`}
                    placeholder="0627204980 or 255..."
                  />
                  {fieldErrors.business_phone ? (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1">{fieldErrors.business_phone}</p>
                  ) : (
                    <p className="text-[10px] font-medium text-slate-400 mt-1">Digits only (e.g. 0627204980)</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Operator Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => {
                      setForm({ ...form, name: e.target.value });
                      if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: undefined });
                    }}
                    className={`w-full bg-white/90 border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 shadow-sm ${
                      fieldErrors.name
                        ? 'border-rose-500 focus:ring-rose-500/20 bg-rose-50/30'
                        : 'border-slate-200/90 focus:ring-emerald-600/20'
                    }`}
                    placeholder="e.g. Hassan Juma"
                  />
                  {fieldErrors.name && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1">{fieldErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => {
                      setForm({ ...form, email: e.target.value });
                      if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                    }}
                    className={`w-full bg-white/90 border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 shadow-sm ${
                      fieldErrors.email
                        ? 'border-rose-500 focus:ring-rose-500/20 bg-rose-50/30'
                        : 'border-slate-200/90 focus:ring-emerald-600/20'
                    }`}
                    placeholder="info@business.com"
                  />
                  {fieldErrors.email && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1">{fieldErrors.email}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={form.password}
                      onChange={(e) => {
                        setForm({ ...form, password: e.target.value });
                        if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
                      }}
                      className={`w-full bg-white/90 border rounded-xl pl-3.5 pr-10 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 shadow-sm ${
                        fieldErrors.password
                          ? 'border-rose-500 focus:ring-rose-500/20 bg-rose-50/30'
                          : 'border-slate-200/90 focus:ring-emerald-600/20'
                      }`}
                      placeholder="Min 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                      title={showPassword ? 'Hide Password' : 'Show Password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1">{fieldErrors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    4-Digit Authorization PIN *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={form.pin}
                    onChange={(e) => {
                      const sanitizedPin = e.target.value.replace(/[^0-9]/g, '');
                      setForm({ ...form, pin: sanitizedPin });
                      if (fieldErrors.pin) setFieldErrors({ ...fieldErrors, pin: undefined });
                    }}
                    className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-sm font-mono font-black text-slate-900 focus:outline-none focus:ring-2 text-center tracking-widest shadow-sm ${
                      fieldErrors.pin
                        ? 'border-rose-500 focus:ring-rose-500/20 bg-rose-50/30'
                        : 'border-slate-200 focus:ring-emerald-600/20'
                    }`}
                    placeholder="1234"
                  />
                  {fieldErrors.pin && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1">{fieldErrors.pin}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !form.business_name || !form.business_phone || !form.name || !form.password}
                className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-semibold text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-3"
              >
                {loading ? 'Sending SMS OTP...' : 'CONTINUE TO OTP VERIFICATION'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* STEP 2: PHONE OTP VERIFICATION */}
          {step === 'OTP' && (
            <form onSubmit={handleCompleteRegistration} className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center space-y-1">
                <Phone className="w-5 h-5 text-emerald-700 mx-auto" />
                <p className="text-xs font-bold text-slate-800">Verification SMS Dispatched</p>
                <p className="text-[11px] text-slate-600 font-mono font-bold">{form.business_phone}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 text-center">
                  Enter 6-Digit Verification Code
                </label>
                <OtpInput
                  key={otpTimerKey}
                  value={otpCode}
                  onChange={setOtpCode}
                  onComplete={(code) => executeRegistrationWithOtp(code)}
                  length={6}
                  disabled={loading}
                  showCountdown={true}
                  countdownSeconds={60}
                  onResend={handleResendOtp}
                  resendLabel="Resend SMS Code"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => setStep('INFO')}
                  className="text-slate-500 hover:text-slate-800 font-semibold underline"
                >
                  ← Edit Phone Number
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? 'Verifying & Registering...' : 'VERIFY OTP & COMPLETE REGISTRATION'}
                <ShieldCheck className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* STEP 3: POST-REGISTRATION ONBOARDING PWA INSTALL */}
          {step === 'ONBOARDING' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-[#0B192C] text-white border border-[#1F3654] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF5500] text-white flex items-center justify-center font-black text-lg">
                    ⚡
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">LUMO Merchant App</h3>
                    <p className="text-[11px] text-slate-300">Fast home screen access to dashboard</p>
                  </div>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-white/10 text-xs text-slate-300">
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Instant dispatch & order tracking</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Receive real-time driver updates</span>
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="w-full py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] active:scale-95 text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
                >
                  <span>Install App</span>
                  <Sparkles className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <span>Continue to Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-slate-200/60 text-center text-xs font-medium text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-700 font-bold hover:underline">
              Sign In to Gateway
            </Link>
          </div>

          <div className="mt-4 text-center text-[10px] text-slate-400 font-medium">
            LUMO Delivery Notifications v1.0 · Merchant Portal
          </div>
        </div>
      </div>
    </div>
  );
}
