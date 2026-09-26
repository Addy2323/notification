'use client';

import React, { useState, useEffect } from 'react';
import { Palette, Store, Check, Save, Phone, MessageSquare, Eye } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function BrandingPage() {
  const [form, setForm] = useState({
    business_name: '',
    logo_url: '',
    brand_color: '#1E40AF',
    whatsapp_number: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    fetchApi('/auth/me')
      .then((data) => {
        if (data.merchant) {
          setForm({
            business_name: data.merchant.business_name || '',
            logo_url: data.merchant.logo_url || '',
            brand_color: data.merchant.brand_color || '#1E40AF',
            whatsapp_number: data.merchant.whatsapp_number || '',
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetchApi('/deliveries/branding', {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update branding settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Merchant Branding & Portal Preview</h1>
        <p className="text-xs text-slate-500 font-medium">
          Customize your business identity seen by customers on SMS tracking links
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Branding Form */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2 text-lumo-800 font-extrabold text-xs uppercase tracking-wider">
            <Palette className="w-4 h-4" />
            <span>Brand Settings</span>
          </div>

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Branding settings updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Business Name</label>
              <input
                type="text"
                required
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-lumo-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Business Logo Image URL</label>
              <input
                type="text"
                value={form.logo_url}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-lumo-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Primary Brand Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.brand_color}
                  onChange={(e) => setForm({ ...form, brand_color: e.target.value })}
                  className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={form.brand_color}
                  onChange={(e) => setForm({ ...form, brand_color: e.target.value })}
                  className="w-32 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900"
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-lumo-800 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl bg-lumo-800 hover:bg-lumo-700 active:bg-lumo-900 text-white font-bold text-xs shadow-glow flex items-center justify-center gap-2 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'SAVING...' : 'SAVE BRANDING'}</span>
            </button>
          </form>
        </div>

        {/* Live Customer Portal Preview Mockup */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <Eye className="w-4 h-4 text-lumo-400" />
              <span>LIVE CUSTOMER PORTAL PREVIEW</span>
            </div>
            <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
              Mobile Preview
            </span>
          </div>

          {/* Simulated Mobile Portal View */}
          <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 space-y-4 shadow-inner">
            {/* Merchant Logo / Header */}
            <div className="flex items-center gap-3">
              {form.logo_url ? (
                <img src={form.logo_url} alt="Logo" className="w-10 h-10 rounded-xl object-cover border border-slate-700" />
              ) : (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-white text-lg shadow-md"
                  style={{ backgroundColor: form.brand_color }}
                >
                  {form.business_name?.[0] || 'L'}
                </div>
              )}
              <div>
                <h4 className="font-extrabold text-sm text-white">{form.business_name || 'Your Merchant Name'}</h4>
                <p className="text-[10px] text-slate-400">Delivery Status Portal</p>
              </div>
            </div>

            {/* Status Card Hero */}
            <div
              className="rounded-xl p-4 text-white space-y-1 shadow-glow transition-all"
              style={{ backgroundColor: form.brand_color }}
            >
              <div className="text-[10px] uppercase font-bold tracking-widest opacity-80">CURRENT STATUS</div>
              <div className="text-lg font-black tracking-tight">● ON THE WAY</div>
              <p className="text-xs opacity-90">Your 3-Seater Sofa is currently being delivered.</p>
            </div>

            {/* Timeline */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold text-slate-400">Delivery Progress</div>
              <div className="flex items-center justify-between text-[11px] bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-emerald-400 font-bold">✓ Created</span>
                <span className="text-amber-400 font-bold">● On The Way</span>
                <span className="text-slate-500">○ Arrived</span>
                <span className="text-slate-500">○ Delivered</span>
              </div>
            </div>

            {/* Support Buttons */}
            <div className="pt-2 flex gap-2">
              <div className="flex-1 py-2 px-3 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs font-semibold text-slate-300 flex items-center justify-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                <span>Call Support</span>
              </div>
              {form.whatsapp_number && (
                <div className="flex-1 py-2 px-3 bg-emerald-950 border border-emerald-800 rounded-xl text-center text-xs font-semibold text-emerald-300 flex items-center justify-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WhatsApp</span>
                </div>
              )}
            </div>

            <div className="text-center pt-2 border-t border-slate-900 text-[10px] text-slate-500">
              Powered by LUMO Delivery Portal
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
