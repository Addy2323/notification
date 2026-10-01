'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Store, XCircle, Phone, ArrowRight, CheckCircle2, KeyRound, ShieldCheck, RefreshCw, X, UserCheck, Plus } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface SavedMerchant {
  id: string;
  name: string;
  phone: string;
  business_name?: string;
}

export default function LoginPage() {
  const router = useRouter();

  // Auth Mode: 'PIN' | 'PASSWORD'
  const [authTab, setAuthTab] = useState<'PIN' | 'PASSWORD'>('PIN');
  
  // Saved accounts on this device (from localStorage)
  const [savedAccounts, setSavedAccounts] = useState<SavedMerchant[]>([]);
  
  // Current active login credentials
  const [phone, setPhone] = useState<string>('');
  const [matchedStore, setMatchedStore] = useState<{ name?: string; business_name?: string } | null>(null);
  const [checkingPhone, setCheckingPhone] = useState<boolean>(false);

  // Mode: 'ENTER_PHONE' (if phone not entered/matched) | 'KEYPAD' (ready for PIN)
  const [phoneConfirmed, setPhoneConfirmed] = useState<boolean>(false);

  // PIN Passcode State
  const [pin, setPin] = useState<string>('');
  
  // Password State
  const [password, setPassword] = useState<string>('');

  // Status & Feedback State
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load saved accounts from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('lumo_saved_merchants');
      if (raw) {
        const parsed: SavedMerchant[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedAccounts(parsed);
          // Pre-select the most recently used account on this device
          const recent = parsed[0];
          setPhone(recent.phone);
          setMatchedStore({ name: recent.name, business_name: recent.business_name });
          setPhoneConfirmed(true);
        }
      }
    } catch (e) {
      console.error('Error loading saved merchants:', e);
    }
  }, []);

  // Save account to localStorage on successful login
  const persistAccountToDevice = (acc: SavedMerchant) => {
    try {
      const existingRaw = localStorage.getItem('lumo_saved_merchants');
      let list: SavedMerchant[] = existingRaw ? JSON.parse(existingRaw) : [];
      // Filter out duplicate
      list = list.filter((item) => item.phone !== acc.phone);
      // Prepend recent account
      list.unshift(acc);
      // Store max 5 recent accounts
      if (list.length > 5) list = list.slice(0, 5);
      localStorage.setItem('lumo_saved_merchants', JSON.stringify(list));
    } catch (e) {
      console.error('Error saving account to device:', e);
    }
  };

  // Remove saved account from device
  const handleRemoveSavedAccount = (e: React.MouseEvent, phoneToRemove: string) => {
    e.stopPropagation();
    const updated = savedAccounts.filter((a) => a.phone !== phoneToRemove);
    setSavedAccounts(updated);
    try {
      localStorage.setItem('lumo_saved_merchants', JSON.stringify(updated));
    } catch (err) {}

    // If active phone was removed, reset active phone
    if (phone === phoneToRemove) {
      if (updated.length > 0) {
        handleSelectSavedAccount(updated[0]);
      } else {
        handleSwitchToNewPhone();
      }
    }
  };

  // Select a saved account chip
  const handleSelectSavedAccount = (acc: SavedMerchant) => {
    setPhone(acc.phone);
    setMatchedStore({ name: acc.name, business_name: acc.business_name });
    setPhoneConfirmed(true);
    setPin('');
    setErrorMessage(null);
  };

  // Switch to entering a new phone number
  const handleSwitchToNewPhone = () => {
    setPhone('');
    setMatchedStore(null);
    setPhoneConfirmed(false);
    setPin('');
    setErrorMessage(null);
  };

  // Check phone existence when entering a phone number
  const handleVerifyPhoneSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phone || phone.trim().length < 4) return;

    setCheckingPhone(true);
    setErrorMessage(null);

    try {
      const res = await fetchApi('/auth/check-phone', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });

      if (res) {
        setMatchedStore({
          name: res.name,
          business_name: res.business_name,
        });
        setPhoneConfirmed(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'The phone number inserted is not registered in our system.');
      setMatchedStore(null);
      setPhoneConfirmed(false);
    } finally {
      setCheckingPhone(false);
    }
  };

  // Handle Keypad Press for PIN
  const handleKeyPress = (digit: string) => {
    if (loading) return;
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setErrorMessage(null);

      // Auto submit on 4th digit
      if (nextPin.length === 4) {
        submitPin(nextPin);
      }
    }
  };

  const handleClearPin = () => {
    setPin('');
    setErrorMessage(null);
  };

  const handleDeletePin = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  // Submit PIN Passcode
  const submitPin = async (pinValue: string) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const data = await fetchApi('/auth/verify-pin', {
        method: 'POST',
        body: JSON.stringify({ phone, pin: pinValue }),
      });

      // Save successful login account to device memory
      persistAccountToDevice({
        id: data.user?.id || 'm-' + Date.now(),
        name: data.user?.name || matchedStore?.name || 'Merchant User',
        phone,
        business_name: data.user?.merchant?.business_name || matchedStore?.business_name || 'LUMO Merchant',
      });

      if (data.user?.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid PIN passcode');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  // Submit Password Access
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const data = await fetchApi('/auth/verify-password', {
        method: 'POST',
        body: JSON.stringify({ identifier: phone, password }),
      });

      persistAccountToDevice({
        id: data.user?.id || 'm-' + Date.now(),
        name: data.user?.name || matchedStore?.name || 'Merchant User',
        phone,
        business_name: data.user?.merchant?.business_name || matchedStore?.business_name || 'LUMO Merchant',
      });

      if (data.user?.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-900 font-sans flex flex-col items-center justify-center p-3 sm:p-5 relative overflow-hidden selection:bg-emerald-600 selection:text-white">
      {/* Ambient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[450px] h-[450px] bg-teal-400/25 rounded-full blur-[120px] pointer-events-none animate-liquid-1" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[450px] h-[450px] bg-cyan-400/20 rounded-full blur-[140px] pointer-events-none animate-liquid-2" />

      {/* Flowing Water Drops */}
      <div className="bg-water-droplet w-3.5 h-6 left-[8%] animate-drop-flow-1" />
      <div className="bg-water-droplet w-2.5 h-4 left-[22%] animate-drop-flow-2" />
      <div className="bg-water-droplet w-4 h-7 left-[48%] animate-drop-flow-3" />
      <div className="bg-water-droplet w-3 h-5 left-[75%] animate-drop-flow-4" />

      <div className="w-full max-w-sm z-10 flex flex-col items-center">
        {/* Error Banner */}
        {errorMessage && (
          <div className="w-full water-alert-banner rounded-xl p-2.5 px-3.5 text-xs font-medium flex items-center justify-between gap-2.5 mb-3 shadow-lg border border-rose-900/60 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center shrink-0">
                <XCircle className="w-3 h-3 text-rose-300" />
              </div>
              <span className="text-rose-100 font-semibold tracking-tight">{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-300/80 hover:text-rose-100 text-xs p-0.5">✕</button>
          </div>
        )}

        {/* Compact Glass Card */}
        <div className="w-full water-glass-card rounded-[26px] p-5 sm:p-6 shadow-2xl relative border border-white/80 overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-60" />

          {/* Droplets */}
          <div className="water-droplet w-3.5 h-3.5 top-3.5 right-5 animate-drop-pulse" />
          <div className="water-droplet w-2 h-2 top-10 left-4 opacity-75" />

          {/* Header */}
          <div className="flex flex-col items-center text-center mb-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 mb-1.5 shadow-sm">
              <Store className="w-4 h-4 stroke-[2.2]" />
            </div>

            <h1 className="text-xl font-black text-slate-900 font-serif tracking-tight">Merchant Portal</h1>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
              Sign in to manage delivery notifications & merchant orders.
            </p>
          </div>

          {/* DEVICE HISTORY QUICK CHIPS (If any saved accounts exist) */}
          {savedAccounts.length > 0 && (
            <div className="mb-3">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                Saved Accounts on this Device
              </label>
              <div className="flex flex-wrap gap-1.5">
                {savedAccounts.map((acc) => {
                  const isSelected = phone === acc.phone && phoneConfirmed;
                  return (
                    <div
                      key={acc.phone}
                      onClick={() => handleSelectSavedAccount(acc)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-emerald-800 text-white border-emerald-900 shadow-md ring-2 ring-emerald-500/20 scale-[1.02]'
                          : 'bg-white/80 text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <UserCheck className={`w-3 h-3 ${isSelected ? 'text-emerald-300' : 'text-slate-400'}`} />
                      <span className="truncate max-w-[120px]">{acc.business_name || acc.name}</span>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveSavedAccount(e, acc.phone)}
                        className={`hover:opacity-100 opacity-60 ml-0.5 p-0.5 rounded-full ${isSelected ? 'hover:bg-emerald-700' : 'hover:bg-slate-200'}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={handleSwitchToNewPhone}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200"
                >
                  <Plus className="w-3 h-3" />
                  <span>Other</span>
                </button>
              </div>
            </div>
          )}

          {/* ACTIVE STORE BANNER OR PHONE INPUT */}
          {phoneConfirmed && matchedStore ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 px-3 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                  {(matchedStore.business_name || matchedStore.name || 'M')[0]}
                </div>
                <div className="truncate">
                  <h3 className="text-xs font-bold text-slate-900 truncate">
                    {matchedStore.business_name || matchedStore.name}
                  </h3>
                  <p className="text-[10px] font-mono text-emerald-700 font-semibold">{phone}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSwitchToNewPhone}
                className="text-[10px] font-bold text-slate-500 hover:text-slate-900 underline shrink-0"
              >
                Change
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerifyPhoneSubmit} className="mb-3 space-y-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Registered Business Phone Number
                </label>
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
                    className="w-full bg-white/90 border border-slate-200/90 rounded-lg px-9 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 shadow-sm"
                    placeholder="e.g. 0627204980"
                  />
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                </div>
                <p className="text-[10px] font-medium text-slate-400 mt-1">Enter your registered Tanzanian phone number</p>
              </div>

              <button
                type="submit"
                disabled={checkingPhone || !phone || phone.trim().length < 4}
                className="w-full h-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                {checkingPhone ? 'Searching Store...' : 'CONTINUE TO SIGN IN'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* DUAL SEGMENTED TAB SWITCHER (PIN / PASSWORD) */}
          {phoneConfirmed && (
            <>
              <div className="bg-slate-200/50 p-1 rounded-xl flex items-center my-3 border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('PIN');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    authTab === 'PIN'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  PIN Passcode
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('PASSWORD');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    authTab === 'PASSWORD'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Password Access
                </button>
              </div>

              {/* TAB 1: PIN Passcode View */}
              {authTab === 'PIN' && (
                <div className="flex flex-col items-center animate-in fade-in duration-200">
                  {/* 4-Digit PIN Passcode Dots */}
                  <div className="flex items-center justify-center gap-3 my-1">
                    {[0, 1, 2, 3].map((idx) => {
                      const isFilled = pin.length > idx;
                      return (
                        <div
                          key={idx}
                          className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                            isFilled
                              ? 'bg-slate-800 ring-4 ring-slate-400/20 scale-110'
                              : 'border-2 border-slate-300 bg-transparent'
                          }`}
                        />
                      );
                    })}
                  </div>

                  <p className="text-[11px] font-medium text-slate-400 my-1">
                    {loading ? 'Authenticating...' : 'Enter 4-digit PIN'}
                  </p>

                  {/* Compact 3x4 Touch Keypad */}
                  <div className="w-full max-w-[240px] grid grid-cols-3 gap-2 my-1">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                      <button
                        key={num}
                        type="button"
                        disabled={loading}
                        onClick={() => handleKeyPress(num)}
                        className="water-keypad-btn"
                      >
                        {num}
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={loading || pin.length === 0}
                      onClick={handleClearPin}
                      className="water-keypad-btn text-slate-400 text-xs font-semibold disabled:opacity-40"
                    >
                      Clear
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleKeyPress('0')}
                      className="water-keypad-btn"
                    >
                      0
                    </button>

                    <button
                      type="button"
                      disabled={loading || pin.length === 0}
                      onClick={handleDeletePin}
                      className="water-keypad-btn text-slate-900 font-semibold text-xs disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>

                  {/* Forgot PIN / Password Link */}
                  <Link
                    href="/forgot-password"
                    className="mt-2.5 text-[11px] font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Forgot PIN Passcode / Password?</span>
                  </Link>
                </div>
              )}

              {/* TAB 2: Password Access View */}
              {authTab === 'PASSWORD' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <form onSubmit={handlePasswordLogin} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-white/90 border border-slate-200/90 rounded-lg px-9 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 shadow-sm"
                          placeholder="••••••••"
                        />
                        <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !password}
                      className="w-full h-10 flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-md transition-all disabled:opacity-50"
                    >
                      {loading ? 'Authenticating...' : 'SIGN IN WITH PASSWORD'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </form>

                  <div className="text-center pt-1">
                    <Link
                      href="/forgot-password"
                      className="text-[11px] font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Forgot Password? Reset via SMS OTP</span>
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Footer Navigation Link */}
          <div className="mt-4 pt-3 border-t border-slate-200/60 text-center text-xs font-medium text-slate-500">
            New merchant business?{' '}
            <Link href="/register" className="text-emerald-700 font-bold hover:underline">
              Register Merchant Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
