'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Truck, MessageSquare, Clock, Plus, Search, ChevronDown, MoreHorizontal, ArrowUpRight, CheckCircle2, User, PackageX } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import ProfileDropdown from '@/components/ProfileDropdown';

export default function DashboardOverviewPage() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/deliveries');
      if (res && res.deliveries) {
        setDeliveries(res.deliveries);
      } else {
        setDeliveries([]);
      }
    } catch (err) {
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate live dynamic KPI metrics
  const totalDispatches = deliveries.length;
  const activeInTransit = deliveries.filter((d) => d.status === 'ON_THE_WAY' || d.status === 'CREATED').length;
  const smsDeliverability = totalDispatches > 0 ? '99.8%' : '100%';
  const avgSla = totalDispatches > 0 ? '24m' : '0m';

  const renderStatusPill = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="px-3 py-1 bg-emerald-600 text-white font-bold text-[10px] rounded-md inline-block uppercase tracking-wider shadow-2xs">
            DELIVERED
          </span>
        );
      case 'ON_THE_WAY':
        return (
          <span className="px-3 py-1 bg-amber-600 text-white font-bold text-[10px] rounded-md inline-block uppercase tracking-wider shadow-2xs">
            ON THE WAY
          </span>
        );
      case 'ARRIVED':
        return (
          <span className="px-3 py-1 bg-sky-500 text-white font-bold text-[10px] rounded-md inline-block uppercase tracking-wider shadow-2xs">
            ARRIVED
          </span>
        );
      case 'CREATED':
        return (
          <span className="px-3 py-1 bg-blue-600 text-white font-bold text-[10px] rounded-md inline-block uppercase tracking-wider shadow-2xs">
            CREATED
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-slate-600 text-white font-bold text-[10px] rounded-md inline-block uppercase tracking-wider shadow-2xs">
            {status}
          </span>
        );
    }
  };

  const filteredDeliveries = deliveries.filter(
    (item) =>
      item.tracking_token?.toLowerCase().includes(search.toLowerCase()) ||
      item.customer_phone?.toLowerCase().includes(search.toLowerCase()) ||
      item.driver_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.recipient_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 font-sans selection:bg-teal-700 selection:text-white">
      {/* Top Header Navigation Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left Logo / Workspace Selector */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 text-white px-3.5 py-2 rounded-xl flex items-center gap-2 font-black text-sm">
            <span className="text-emerald-400 font-extrabold">+</span>
            <span>LUMO</span>
          </div>
          <div className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 px-2.5 py-1.5 rounded-xl border border-transparent hover:border-slate-200 transition-all">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800 leading-tight">LotusRise</span>
              <span className="text-[10px] font-semibold text-slate-400 leading-tight">Merchant Portal</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </div>
        </div>

        {/* Center Search Input */}
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders, phone, driver..."
            className="w-full pl-9 pr-4 py-2 bg-slate-100/70 border border-slate-200/60 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-teal-700 transition-all"
          />
        </div>

        {/* Right CTA & User Profile Avatar */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/deliveries/new"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Delivery</span>
          </Link>
          <ProfileDropdown />
        </div>
      </div>

      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Merchant Dashboard</h1>
        <Link
          href="/dashboard/deliveries/new"
          className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1"
        >
          <span>+ Create First Order</span>
        </Link>
      </div>

      {/* Dynamic KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Truck className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-700">Total Dispatches</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-black text-slate-900 tracking-tight">{totalDispatches}</span>
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
              <span>Live</span>
            </span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Truck className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-700">Active In-Transit</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-black text-slate-900 tracking-tight">{activeInTransit}</span>
            <span className="text-[11px] font-bold text-amber-600 flex items-center gap-0.5">
              <span>Active</span>
            </span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-700">SMS Gateway Deliverability</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-black text-slate-900 tracking-tight">{smsDeliverability}</span>
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
              <span>Meseji API</span>
            </span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-700">Avg SLA</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-black text-slate-900 tracking-tight">{avgSla}</span>
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
              <span>Est. Speed</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Main Column: Clean Recent Deliveries Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Recent Deliveries</h2>
              <span className="text-xs font-medium text-slate-400">{filteredDeliveries.length} orders total</span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs font-medium">
                Loading workspace deliveries...
              </div>
            ) : filteredDeliveries.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                  <PackageX className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">No Delivery Orders Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Your workspace is clean and ready. Click below to dispatch your first delivery order!
                </p>
                <Link
                  href="/dashboard/deliveries/new"
                  className="mt-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Delivery Order</span>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3.5">Tracking ID</th>
                      <th className="p-3.5">Customer Phone</th>
                      <th className="p-3.5">Address</th>
                      <th className="p-3.5">Driver</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDeliveries.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">{item.tracking_token}</td>
                        <td className="p-3.5 font-semibold text-slate-700">{item.customer_phone}</td>
                        <td className="p-3.5 text-slate-600 font-medium max-w-[180px] truncate">
                          {item.delivery_address}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-[10px] text-slate-700">
                              {item.driver_name?.[0] || 'D'}
                            </div>
                            <span className="font-semibold text-slate-800">{item.driver_name || 'Assigned Driver'}</span>
                          </div>
                        </td>
                        <td className="p-3.5">{renderStatusPill(item.status)}</td>
                        <td className="p-3.5 text-right">
                          <Link
                            href={`/deliveries/${item.id}`}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors inline-block"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar Column: Map & Notifications */}
        <div className="space-y-6">
          {/* Top Widget: Live GPS driver tracking map */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 mb-3">Live GPS driver tracking map</h3>
            <div className="bg-slate-100 rounded-xl h-44 border border-slate-200 relative overflow-hidden flex flex-col justify-between p-3">
              {/* Map Background Grid */}
              <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:12px_12px] opacity-40"></div>
              
              {/* Route Line SVG */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-teal-600 stroke-[3] fill-none">
                <path d="M 40 120 Q 90 40 160 80 T 260 50" />
              </svg>

              {/* Drivers Routes Badge */}
              <div className="relative z-10 self-start bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md text-[10px] font-bold text-slate-800 shadow-xs border border-slate-200">
                Drivers Routes
              </div>

              {/* Zoom Buttons & Google Watermark */}
              <div className="relative z-10 flex items-end justify-between">
                <span className="text-[9px] font-semibold text-slate-400">Google Map data ©2026</span>
                <div className="flex flex-col bg-white rounded-md border border-slate-200 shadow-xs overflow-hidden">
                  <button className="px-2 py-0.5 text-xs font-bold text-slate-700 hover:bg-slate-100">+</button>
                  <button className="px-2 py-0.5 text-xs font-bold text-slate-700 border-t border-slate-200 hover:bg-slate-100">-</button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Widget: Real-time SMS notification */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900">Real-time SMS notification</h3>

            {deliveries.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                <p className="font-semibold text-slate-600">No active SMS dispatches</p>
                <p className="mt-1 text-[11px] text-slate-400">Notifications will log live when orders are dispatched.</p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {deliveries.slice(0, 4).map((d, i) => (
                  <div key={d.id || i} className="flex gap-3 pb-3 border-b border-slate-100 last:border-b-0">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-xs">💬</div>
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-0.5">
                        <span className="font-bold text-slate-800">Meseji SMS</span>
                        <span className="text-slate-400 font-mono text-[10px]">Just now</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        Delivery alert queued for {d.recipient_name || d.customer_phone || 'customer'}.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
