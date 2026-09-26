'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Copy, Check, ExternalLink, ArrowLeft, Send, Truck, Phone, MapPin, Package, User } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function NewDeliveryPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    customer_phone: '',
    delivery_address: '',
    product_description: '',
    driver_name: '',
    driver_phone: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);

  const [copiedType, setCopiedType] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const data = await fetchApi('/deliveries', {
        method: 'POST',
        body: JSON.stringify(form),
      });

      setSuccessData(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create delivery.');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-2 text-slate-500 hover:text-slate-900 rounded-xl border border-slate-200 hover:bg-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Create New Delivery</h1>
          <p className="text-xs text-slate-500 font-medium">
            Fill in the 5 quick fields below to generate tracking and inform the customer via SMS
          </p>
        </div>
      </div>

      {/* Success Modal / Card Overlay */}
      {successData ? (
        <div className="bg-white border-2 border-emerald-500 rounded-3xl p-6 md:p-8 shadow-glow animate-fade-in space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">DELIVERY CREATED</h2>
            <p className="text-xs font-mono font-bold text-slate-500 mt-1">
              REF: {successData.delivery.tracking_token.slice(0, 12).toUpperCase()}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
              <span>SMS Notification Queued for Customer</span>
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-slate-100">
            {/* Customer Link Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Customer Tracking Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={successData.tracking_url}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => copyLink(successData.tracking_url, 'customer')}
                  className="px-3.5 py-2 bg-lumo-800 hover:bg-lumo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0"
                >
                  {copiedType === 'customer' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedType === 'customer' ? 'COPIED' : 'COPY'}</span>
                </button>
              </div>
            </div>

            {/* Driver Link Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Driver Secure Link (No Account Required)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={successData.driver_url}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => copyLink(successData.driver_url, 'driver')}
                  className="px-3.5 py-2 bg-lumo-800 hover:bg-lumo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0"
                >
                  {copiedType === 'driver' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedType === 'driver' ? 'COPIED' : 'COPY'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <a
              href={successData.tracking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 text-center"
            >
              <ExternalLink className="w-4 h-4 text-lumo-400" />
              <span>OPEN CUSTOMER TRACKING</span>
            </a>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="flex-1 py-3 px-4 rounded-xl bg-lumo-800 hover:bg-lumo-700 text-white font-bold text-xs text-center"
            >
              DONE & RETURN TO DASHBOARD
            </button>
          </div>
        </div>
      ) : (
        /* Form Card */
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            {/* Section 1: Customer Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold text-lumo-800 uppercase tracking-wider flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>1 & 2. Customer & Destination</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Customer Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.customer_phone}
                    onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-lumo-800 font-mono"
                    placeholder="e.g. 0712345678"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">SMS will be sent to this number</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Delivery Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.delivery_address}
                    onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-lumo-800"
                    placeholder="e.g. Mbezi Beach, Dar es Salaam"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Product Info */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-extrabold text-lumo-800 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span>3. Product Purchased</span>
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Product Description *
                </label>
                <input
                  type="text"
                  required
                  value={form.product_description}
                  onChange={(e) => setForm({ ...form, product_description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-lumo-800"
                  placeholder="e.g. 3-Seater Sofa / Samsung Smart TV 55 Inch"
                />
              </div>
            </div>

            {/* Section 3: Driver Info */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-extrabold text-lumo-800 uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4" />
                <span>4 & 5. Assigned Driver Details</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Driver Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.driver_name}
                    onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-lumo-800"
                    placeholder="e.g. Juma Hassan"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Driver Contact Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.driver_phone}
                    onChange={(e) => setForm({ ...form, driver_phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-lumo-800 font-mono"
                    placeholder="e.g. 0788112233"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-2xl bg-lumo-800 hover:bg-lumo-700 active:bg-lumo-900 text-white font-extrabold text-sm shadow-glow flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span>CREATING DELIVERY...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>CREATE DELIVERY & SEND SMS</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
