'use client';


import { useLanguage, T } from '@/components/LanguageProvider';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Store, Phone, XCircle, CheckCircle2, ShieldCheck, ArrowRight, Eye, EyeOff, Lock, Clock, Sparkles, KeyRound } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import LanguageSelector from '@/components/LanguageSelector';
import { OtpInput } from '@/app/components/OtpInput';

export default function ForgotPasswordPage() {
  const { t, label: uiLabel, locale } = useLanguage();

  const router = useRouter();

  // Step state: 1 ('PHONE') | 2 ('OTP') | 3 ('RESET') | 4 ('SUCCESS')
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form Inputs
  const [phone, setPhone] = useState<string>('');
  const [merchantDetails, setMerchantDetails] = useState<{ name?: string; business_name?: string } | null>(null);
  const [otpCode, setOtpCode] = useState<string>('');
  
  // Credentials Reset Inputs
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');

  // Password Visibility Toggles
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // OTP 60s Countdown Timer State
  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [timerActive, setTimerActive] = useState<boolean>(false);

  // Feedback State
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 60-Second Countdown Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  // STEP 1: Verify Phone Number Existence in Database
  const handleCheckPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Verify existence in DB
      const res = await fetchApi('/auth/check-phone', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });

      setMerchantDetails(res.data);

      // 2. Dispatch SMS OTP
      await fetchApi('/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });

      setStep(2);
      setTimerSeconds(60);
      setTimerActive(true);
      setSuccessMessage(t('auth.reset_otp_sent_to_phone', { phone }));
    } catch (err: any) {
      // Error message for un-registered phone numbers
      setErrorMessage(err.message || t("auth.the_phone_number_inserted_is_not_registered_in_our_system"));
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP Code
  const handleResendOtp = async () => {
    if (timerActive) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      await fetchApi('/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
      setTimerSeconds(60);
      setTimerActive(true);
      setSuccessMessage(t('auth.reset_otp_sent_to_phone', { phone }));
    } catch (err: any) {
      setErrorMessage(err.message || t("auth.failed_to_resend_sms_otp"));
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify 6-Digit OTP Code (Supports manual submit & auto-submit on 6th digit)
  const executeVerifyOtp = async (codeToVerify: string) => {
    if (loading) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      // Verify OTP code correctness
      await fetchApi('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, otp: codeToVerify }),
      });

      setStep(3);
      setSuccessMessage(t('auth.otp_verified_set_password'));
    } catch (err: any) {
      setErrorMessage(err.message || t("auth.invalid_otp_code_please_check_the_6_digit_sms_code"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeVerifyOtp(otpCode);
  };

  // STEP 3: Reset Password & Optional PIN
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage(t("interactions.new_password_and_confirm_password_do_not_match"));
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage(t("interactions.password_must_be_at_least_6_characters_long"));
      setLoading(false);
      return;
    }

    try {
      await fetchApi('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          phone,
          otp: otpCode,
          new_password: newPassword,
          new_pin: newPin || undefined,
        }),
      });

      setStep(4);
      setSuccessMessage(t('auth.password_reset_success'));
    } catch (err: any) {
      setErrorMessage(err.message || t("auth.failed_to_update_password"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-900 font-sans flex flex-col items-center justify-center p-3 sm:p-5 relative overflow-hidden selection:bg-emerald-600 selection:text-white">
      <div className="flex justify-end p-3"><LanguageSelector /></div>
      {/* Liquid Water Glowing Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-400/25 rounded-full blur-[120px] pointer-events-none animate-liquid-1" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-400/20 rounded-full blur-[140px] pointer-events-none animate-liquid-2" />

      {/* Floating Background Droplets */}
      <div className="bg-water-droplet w-3.5 h-6 left-[8%] animate-drop-flow-1" />
      <div className="bg-water-droplet w-2.5 h-4 left-[24%] animate-drop-flow-2" />
      <div className="bg-water-droplet w-4 h-7 left-[50%] animate-drop-flow-3" />
      <div className="bg-water-droplet w-3 h-5 left-[76%] animate-drop-flow-4" />

      <div className="w-full max-w-md z-10 flex flex-col items-center">
        {/* Error Banner */}
        {errorMessage && (
          <div className="w-full water-alert-banner rounded-2xl p-3 px-4 text-xs font-medium flex items-center justify-between gap-3 mb-3 shadow-xl border border-rose-900/60 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <XCircle className="w-4 h-4 text-rose-300 shrink-0" />
              <span className="text-rose-100 font-semibold">{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-300 hover:text-rose-100">✕</button>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && step !== 4 && (
          <div className="w-full mb-3 p-3 rounded-2xl bg-emerald-950/90 border border-emerald-800/60 text-emerald-100 text-xs font-medium flex items-center gap-2.5 shadow-xl backdrop-blur-md animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Glass Card Container */}
        <div className="w-full water-glass-card rounded-[32px] p-6 sm:p-7 shadow-2xl relative border border-white/80 overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-60" />

          {/* Droplets */}
          <div className="water-droplet w-3.5 h-3.5 top-4 right-6 animate-drop-pulse" />
          <div className="water-droplet w-2 h-2 top-12 left-5 opacity-75" />

          {/* Step Progress Visual Tracker */}
          <div className="flex items-center justify-between gap-2 mb-6 px-2">
            {[
              { num: 1, label: 'Phone Check' },
              { num: 2, label: 'SMS OTP' },
              { num: 3, label: 'New Password' },
            ].map((s) => {
              const isActive = step === s.num;
              const isCompleted = step > s.num;
              return (
                <div key={s.num} className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
                      isCompleted
                        ? 'bg-emerald-600 text-white shadow-md'
                        : isActive
                        ? 'bg-slate-900 text-white ring-4 ring-emerald-500/20 scale-105'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {isCompleted ? '✓' : s.num}
                  </div>
                  <span
                    className={`text-[10px] font-bold mt-1.5 transition-colors ${
                      isActive || isCompleted ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    {uiLabel(s.label)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* STEP 1: VERIFY REGISTERED PHONE NUMBER */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="text-center mb-4">
                <div className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 mx-auto mb-2 shadow-sm">
                  <Phone className="w-5 h-5 stroke-[2.2]" />
                </div>
                <h1 className="text-xl font-black text-slate-900 font-serif"><T k="auth.forgot_password" /></h1>
                <p className="text-xs text-slate-500 font-medium mt-1">{' '}<T k="auth.enter_your_registered_business_phone_number_to_verify_account_existence" />{' '}</p>
              </div>

              <form onSubmit={handleCheckPhone} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">{' '}<T k="auth.registered_business_phone_number_2" />{' '}</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => {
                        const sanitized = e.target.value.replace(/[^0-9+]/g, '');
                        setPhone(sanitized);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      className="w-full bg-white/90 border border-slate-200 rounded-xl px-9 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 shadow-sm"
                      placeholder="e.g. 0627204980"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                  <p className="text-[10px] font-medium text-slate-400 mt-1"><T k="auth.enter_your_registered_tanzanian_phone_number" /></p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !phone || phone.trim().length < 4}
                  className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? t("auth.verifying_registered_phone") : t("auth.verify_phone_send_sms_otp")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: 6-DIGIT OTP VERIFICATION WITH 60s TIMER */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="text-center mb-3">
                <div className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 mx-auto mb-2 shadow-sm">
                  <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                </div>
                <h1 className="text-xl font-black text-slate-900 font-serif"><T k="auth.enter_6_digit_sms_code" /></h1>
                <p className="text-xs text-slate-500 font-medium mt-1">{' '}<T k="auth.sms_code_dispatched_to" />{' '}<span className="font-mono font-bold text-emerald-700">{phone}</span>
                </p>
                {merchantDetails?.business_name && (
                  <p className="text-[11px] text-slate-400 font-bold mt-0.5">{' '}<T k="auth.store" />{' '}{merchantDetails.business_name}
                  </p>
                )}
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <OtpInput
                    value={otpCode}
                    onChange={setOtpCode}
                    onComplete={(code) => executeVerifyOtp(code)}
                    length={6}
                    disabled={loading}
                    showCountdown={true}
                    countdownSeconds={timerSeconds}
                    onResend={handleResendOtp}
                    resendLabel="Resend SMS Code"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
                  >{' '}<T k="auth.change_phone" />{' '}</button>

                  <button
                    type="submit"
                    disabled={loading || otpCode.length !== 6}
                    className="flex-1 h-10 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md disabled:opacity-50"
                  >
                    {loading ? t("auth.verifying") : t("auth.verify_code")}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: SET NEW PASSWORD & CONFIRM (WITH SHOW/HIDE EYE TOGGLE) */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="text-center mb-3">
                <div className="w-11 h-11 rounded-full bg-slate-900 text-white flex items-center justify-center mx-auto mb-2 shadow-sm">
                  <Lock className="w-5 h-5" />
                </div>
                <h1 className="text-xl font-black text-slate-900 font-serif"><T k="auth.create_new_password" /></h1>
                <p className="text-xs text-slate-500 font-medium mt-1">{' '}<T k="auth.set_a_secure_password_for_your_merchant_operator_account" />{' '}</p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-3.5">
                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{' '}<T k="auth.new_account_password" />{' '}</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-9 pr-10 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 shadow-sm"
                      placeholder={t("auth.min_6_characters")}
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{' '}<T k="auth.confirm_new_password" />{' '}</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-9 pr-10 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 shadow-sm"
                      placeholder={t("auth.repeat_password")}
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Optional PIN Reset */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{' '}<T k="auth.optional_update_4_digit_pin_passcode" />{' '}</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-center font-mono font-black text-slate-900 text-sm tracking-widest"
                    placeholder="e.g. 1234"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !newPassword || !confirmPassword}
                  className="w-full h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? t("auth.updating_credentials") : t("auth.reset_password_update_account")}
                  <ShieldCheck className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* STEP 4: SUCCESS CONFIRMATION */}
          {step === 4 && (
            <div className="text-center py-4 space-y-4 animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-8 h-8 stroke-[2]" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 font-serif"><T k="auth.password_updated" /></h2>
                <p className="text-xs text-slate-600 font-medium mt-1">{' '}<T k="auth.your_account_password_has_been_reset_successfully_you_may_now_sign_in_using_your_new_" />{' '}</p>
              </div>

              <Link
                href="/login"
                className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all"
              >{' '}<T k="auth.proceed_to_merchant_login" />{' '}<ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Footer Navigation Link */}
          {step !== 4 && (
            <div className="mt-5 pt-4 border-t border-slate-200/60 text-center text-xs font-medium text-slate-500">{' '}<T k="auth.remember_your_password" />{' '}
              <Link href="/login" className="text-emerald-700 font-bold hover:underline">{' '}<T k="auth.sign_in_to_gateway" />{' '}</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
