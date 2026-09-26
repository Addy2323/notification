'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Copy, Check, ExternalLink, RefreshCw, XCircle, UserPlus, Clock, Truck, MapPin, Package, Phone, CheckCircle2, Shield } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function DeliveryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Replace Driver Modal State
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');

  const loadDetail = async () => {
    setLoading(true);
    try {
      const data = await fetchApi(`/deliveries/${id}`);
      setDelivery(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this delivery? The driver will no longer be able to update status.')) return;
    setActionLoading(true);
    try {
      await fetchApi(`/deliveries/${id}/cancel`, { method: 'POST' });
      await loadDetail();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel delivery');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReplaceDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await fetchApi(`/deliveries/${id}/replace-driver`, {
        method: 'POST',
        body: JSON.stringify({ driver_name: newDriverName, driver_phone: newDriverPhone }),
      });
      setShowReplaceModal(false);
      await loadDetail();
    } catch (err: any) {
      alert(err.message || 'Failed to replace driver');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-lumo-800 animate-spin" />
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-center">
        <p className="text-slate-500">Delivery not found.</p>
        <Link href="/dashboard" className="text-lumo-800 font-bold underline text-sm mt-2 block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 text-slate-500 hover:text-slate-900 rounded-xl border border-slate-200 hover:bg-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 font-mono">
                REF: {delivery.tracking_token.slice(0, 12).toUpperCase()}
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {delivery.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Created on {new Date(delivery.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Action Triggers */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => copyText(delivery.tracking_url, 'track')}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5"
          >
            {copiedKey === 'track' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Customer Link</span>
          </button>

          <button
            onClick={() => copyText(delivery.driver_url, 'driver')}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5"
          >
            {copiedKey === 'driver' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Driver Link</span>
          </button>

          {delivery.status !== 'DELIVERED' && delivery.status !== 'CANCELLED' && (
            <>
              <button
                onClick={() => setShowReplaceModal(true)}
                className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Replace Driver</span>
              </button>

              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="px-3 py-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel Delivery</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Grid details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Customer Box */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card space-y-2">
          <div className="flex items-center gap-2 text-lumo-800 font-extrabold text-xs uppercase tracking-wider">
            <Phone className="w-4 h-4" />
            <span>Customer</span>
          </div>
          <p className="text-base font-bold text-slate-900">{delivery.customer_phone}</p>
          <div className="flex items-start gap-1.5 text-xs text-slate-600">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>{delivery.delivery_address}</span>
          </div>
        </div>

        {/* Product Box */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card space-y-2">
          <div className="flex items-center gap-2 text-lumo-800 font-extrabold text-xs uppercase tracking-wider">
            <Package className="w-4 h-4" />
            <span>Product</span>
          </div>
          <p className="text-base font-bold text-slate-900">{delivery.product_description}</p>
          <p className="text-xs text-slate-400">Merchant: {delivery.merchant?.business_name}</p>
        </div>

        {/* Driver Box */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card space-y-2">
          <div className="flex items-center gap-2 text-lumo-800 font-extrabold text-xs uppercase tracking-wider">
            <Truck className="w-4 h-4" />
            <span>Driver</span>
          </div>
          <p className="text-base font-bold text-slate-900">{delivery.driver_name}</p>
          <p className="text-xs text-slate-600 font-mono">{delivery.driver_phone}</p>
        </div>
      </div>

      {/* Event Timeline History */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Clock className="w-4 h-4 text-lumo-800" />
          <span>Delivery Event History Log</span>
        </h3>

        <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {delivery.events.map((evt: any) => (
            <div key={evt.id} className="flex items-start gap-4 relative">
              <div className="w-6 h-6 rounded-full bg-lumo-800 text-white flex items-center justify-center text-xs font-bold shrink-0 z-10">
                ✓
              </div>
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{evt.event_type}</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(evt.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Actor: {evt.actor_type} ({evt.actor_reference || 'System'})
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Replace Driver Modal */}
      {showReplaceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Replace Assigned Driver</h3>
            <p className="text-xs text-slate-500">
              Enter new driver details. The previous driver's link will be immediately revoked.
            </p>
            <form onSubmit={handleReplaceDriver} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Driver Name</label>
                <input
                  type="text"
                  required
                  value={newDriverName}
                  onChange={(e) => setNewDriverName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Driver Contact Phone</label>
                <input
                  type="text"
                  required
                  value={newDriverPhone}
                  onChange={(e) => setNewDriverPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 font-mono"
                  placeholder="07XXXXXXXX"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReplaceModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-lumo-800 text-white font-bold text-xs rounded-xl shadow-glow"
                >
                  Confirm & Generate New Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
