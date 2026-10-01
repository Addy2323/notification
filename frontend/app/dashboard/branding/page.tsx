'use client';

import React, { useState, useEffect } from 'react';
import {
  Palette, Store, Check, Save, Phone, MessageSquare, Eye, Upload, Mail, MapPin,
  Smartphone, Sparkles, Building2, Image as ImageIcon, ShieldCheck
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { LumoLogo } from '@/components/landing/LumoLogo';

// LUMO Official 3-Color Design System (Navy Blue #0F172A, Vibrant Orange #FF5500, White #FFFFFF)
const LUMO_BRAND_ORANGE = '#FF5500';
const LUMO_BRAND_NAVY = '#0F172A';

export default function BrandingPage() {
  const [form, setForm] = useState({
    business_name: '',
    logo_url: '',
    brand_color: LUMO_BRAND_ORANGE,
    whatsapp_number: '',
    business_phone: '',
    email: '',
    location: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    fetchApi('/auth/me')
      .then((data) => {
        if (data.merchant) {
          const m = data.merchant;
          setForm({
            business_name: m.business_name || '',
            logo_url: m.logo_url || '',
            brand_color: m.brand_color || LUMO_BRAND_ORANGE,
            whatsapp_number: m.whatsapp_number || '',
            business_phone: m.business_phone || m.phone || '',
            email: m.email || '',
            location: m.location || '',
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, logo_url: reader.result as string }));
      setUploadingLogo(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetchApi('/deliveries/branding', {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update branding settings.');
    } finally {
      setSaving(false);
    }
  };

  const currentBusinessName = form.business_name.trim() || 'David Sportware';
  const currentPhone = form.business_phone.trim() || form.whatsapp_number.trim() || '+255712345678';
  const currentEmail = form.email.trim() || 'info@davidsportware.co.tz';
  const currentAddress = form.location.trim() || 'Sam Nujoma Road, Dar es Salaam';
  const activeBrandColor = form.brand_color || LUMO_BRAND_ORANGE;

  return (
    <div className="space-y-6 font-sans max-w-6xl">
      {/* Top Header matching 3-color rule (Navy, Orange, White) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <LumoLogo size={34} showText={false} />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Business Branding & 3-Color Design Rules
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Complies with LUMO design principles: Navy Blue ("Blue Bahari"), Logo Orange, and Clean White.
          </p>
        </div>

        {/* 3-Color Swatch Selector */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 p-2 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Brand Colors:</span>
          {[
            { name: 'Logo Orange', hex: '#FF5500' },
            { name: 'Navy Blue (Blue Bahari)', hex: '#0F172A' },
            { name: 'Ocean Blue', hex: '#0284C7' },
            { name: 'Pure White', hex: '#FFFFFF' },
          ].map((preset) => (
            <button
              key={preset.hex}
              type="button"
              onClick={() => setForm({ ...form, brand_color: preset.hex })}
              className="w-6 h-6 rounded-lg transition-transform hover:scale-110 active:scale-95 shadow-xs flex items-center justify-center border border-slate-300"
              style={{ backgroundColor: preset.hex }}
              title={preset.name}
            >
              {activeBrandColor.toUpperCase() === preset.hex.toUpperCase() && (
                <Check className={`w-3 h-3 ${preset.hex === '#FFFFFF' ? 'text-slate-900' : 'text-white'}`} />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT BRANDING FORM (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
              <Building2 className="w-4.5 h-4.5 text-[#FF5500]" />
              <span>Business Branding Settings</span>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-orange-50 text-[#FF5500] border-orange-200">
              3-Color System
            </span>
          </div>

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Branding settings saved successfully! All previews updated.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Business Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Business Name <span className="text-[#FF5500]">*</span>
              </label>
              <input
                type="text"
                required
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                placeholder="e.g. David Sportware"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-[#FF5500] transition-all"
              />
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Upload Logo</label>
              <div className="flex items-center gap-3">
                {form.logo_url ? (
                  <img
                    src={form.logo_url}
                    alt="Logo Preview"
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-xs"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-base shadow-xs"
                    style={{ backgroundColor: activeBrandColor }}
                  >
                    {currentBusinessName[0]}
                  </div>
                )}
                <div className="flex-1 space-y-1">
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl cursor-pointer transition-all">
                    <Upload className="w-3.5 h-3.5 text-[#FF5500]" />
                    <span>{uploadingLogo ? 'Uploading...' : 'Upload Logo Image'}</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                  <p className="text-[10px] text-slate-400">Supported formats: PNG, JPG, SVG logo</p>
                </div>
              </div>
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={form.business_phone}
                    onChange={(e) => setForm({ ...form, business_phone: e.target.value })}
                    placeholder="+255712345678"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-[#FF5500] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="info@davidsportware.co.tz"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-[#FF5500] transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Business Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Business Address</label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Sam Nujoma Road, Dar es Salaam"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-[#FF5500] transition-all"
                />
              </div>
            </div>

            {/* Brand Color & WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Primary Brand Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.brand_color}
                    onChange={(e) => setForm({ ...form, brand_color: e.target.value })}
                    className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white shadow-xs"
                  />
                  <input
                    type="text"
                    value={form.brand_color}
                    onChange={(e) => setForm({ ...form, brand_color: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Support Number</label>
                <input
                  type="text"
                  value={form.whatsapp_number}
                  onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                  placeholder="+255712345678"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            {/* Primary Action Button in Vibrant Orange (#FF5500) */}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 rounded-2xl bg-[#FF5500] hover:bg-[#E04B00] active:scale-98 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-4"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'SAVING BRANDING...' : 'SAVE BUSINESS BRANDING'}</span>
            </button>
          </form>
        </div>

        {/* RIGHT PREVIEW COLUMN (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* LIVE SMS PREVIEW CARD */}
          <div className="bg-[#0F172A] rounded-3xl p-5 shadow-xl border border-slate-800 space-y-3 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 text-[#FF5500] text-xs font-bold uppercase tracking-wider">
                <MessageSquare className="w-4 h-4" />
                <span>SMS Preview</span>
              </div>
              <span className="text-[9px] font-mono bg-[#FF5500]/15 text-[#FF5500] px-2.5 py-0.5 rounded-full border border-[#FF5500]/30 font-bold">
                Dynamic Preview
              </span>
            </div>

            {/* Simulated Phone Message Card */}
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800/90 space-y-3 shadow-inner">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#FF5500]" />
                  <span>Meseji SMS Dispatch</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Just now</span>
              </div>

              {/* Exact SMS Body requested by user */}
              <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 text-xs font-sans leading-relaxed space-y-2.5 shadow-sm text-slate-100">
                <p className="font-extrabold text-sm text-[#FF5500]">
                  Hello Ado, thank you for shopping with {currentBusinessName}!
                </p>
                <p className="text-slate-200 font-medium">
                  🚚 Your order <span className="font-mono text-amber-300 font-black">#LUMO-8241</span> is on the way!
                </p>
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px] space-y-1">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Track My Order:</p>
                  <p className="font-mono underline font-bold text-[#FF5500]">
                    lumo.co.tz/track/LUMO-8241
                  </p>
                </div>
                <p className="text-[10px] text-slate-400 border-t border-slate-800 pt-2">
                  Need help? Contact {currentBusinessName} at <span className="text-slate-200 font-mono font-bold">{currentPhone}</span> or <span className="text-slate-200">{currentEmail}</span>.
                </p>
              </div>
            </div>
          </div>

          {/* CUSTOMER PORTAL HEADER PREVIEW CARD */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2 text-slate-900 text-xs font-extrabold uppercase tracking-wider">
                <Eye className="w-4 h-4 text-[#FF5500]" />
                <span>Customer Tracking Header</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400">3-Color Rule</span>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-center gap-3">
                {form.logo_url ? (
                  <img
                    src={form.logo_url}
                    alt="Logo"
                    className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-xs"
                  />
                ) : (
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-xs"
                    style={{ backgroundColor: activeBrandColor }}
                  >
                    {currentBusinessName[0]}
                  </div>
                )}
                <div>
                  <h4 className="font-black text-sm text-slate-900">{currentBusinessName}</h4>
                  <p className="text-[10px] text-slate-500 font-medium">{currentAddress}</p>
                </div>
              </div>

              {/* Status Banner matched with Brand Color */}
              <div
                className="rounded-xl p-3 text-white font-bold text-xs flex items-center justify-between shadow-xs"
                style={{ backgroundColor: activeBrandColor }}
              >
                <span>🚚 Order Out for Delivery</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider">
                  Live Status
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
