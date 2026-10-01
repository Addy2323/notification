'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '@/lib/api';
import {
  Search, Plus, Users, Phone, Truck, Package, CheckCircle2, AlertCircle, X, User
} from 'lucide-react';

interface DriverInfo {
  id: string;
  name: string;
  phone: string;
  status: string;
  created_at: string;
  orders: { id: string; order_number: string; status: string; customer_name: string }[];
  _count: { orders: number };
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<DriverInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newDriver, setNewDriver] = useState({ name: '', phone: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/drivers');
      setDrivers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  const handleCreate = async () => {
    if (!newDriver.name || !newDriver.phone) return;
    setCreating(true);
    setError(null);
    try {
      await fetchApi('/drivers', {
        method: 'POST',
        body: JSON.stringify(newDriver),
      });
      setSuccess('Driver created successfully!');
      setShowCreate(false);
      setNewDriver({ name: '', phone: '' });
      loadDrivers();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const filtered = drivers.filter(d => {
    if (!search) return true;
    const s = search.toLowerCase();
    return d.name.toLowerCase().includes(s) || d.phone.includes(s);
  });

  return (
    <div className="space-y-6 font-sans bg-white">
      {success && (
        <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#FF5500]" />
            <span>Driver Fleet</span>
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Manage and assign drivers for live dispatches.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#FF5500] hover:bg-[#E04B00] active:scale-95 text-white font-extrabold text-xs shadow-xs transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Create Driver</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Search drivers by name or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#FF5500] shadow-xs max-w-md"
        />
      </div>

      {/* Driver Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/2 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-black text-slate-700">No drivers found</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">Create your first driver to start assigning deliveries.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(driver => (
            <div key={driver.id} className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#0F172A] text-white flex items-center justify-center font-black">
                    {driver.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{driver.name}</p>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-[#FF5500]" /> {driver.phone}
                    </p>
                  </div>
                </div>
                <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-xl ${
                  driver.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                  driver.status === 'ON_DELIVERY' ? 'bg-orange-50 text-[#FF5500] border border-orange-200' :
                  'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {driver.status === 'AVAILABLE' ? '🟢 Available' : driver.status === 'ON_DELIVERY' ? '🚚 On Delivery' : '⚪ Inactive'}
                </span>
              </div>

              {driver.orders.length > 0 && (
                <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Active Order</p>
                  <p className="text-xs font-black text-slate-900 font-mono">{driver.orders[0].order_number}</p>
                  <p className="text-[10px] text-slate-500 font-bold">{driver.orders[0].customer_name}</p>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 font-bold border-t border-slate-100 pt-2.5">
                <span>{driver._count.orders} delivered</span>
                <span>Added {new Date(driver.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Driver Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">Create Driver</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Driver Name</label>
              <input type="text" placeholder="Driver full name" value={newDriver.name} onChange={e => setNewDriver(p => ({ ...p, name: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#FF5500]" />
            </div>
            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Phone Number</label>
              <input type="text" placeholder="+255712345678" value={newDriver.phone} onChange={e => setNewDriver(p => ({ ...p, phone: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-semibold focus:outline-none focus:bg-white focus:border-[#FF5500]" />
            </div>
            <button
              onClick={handleCreate}
              disabled={creating || !newDriver.name || !newDriver.phone}
              className="w-full py-3 rounded-2xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-black text-xs shadow-xs transition-all disabled:opacity-50"
            >
              {creating ? 'CREATING...' : 'SAVE DRIVER'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
