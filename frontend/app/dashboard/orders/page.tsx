'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import {
  Search, Plus, Filter, ChevronDown, Package, Clock, CheckCircle2, Truck, MapPin, XCircle,
  ArrowRight, RefreshCw, ShoppingBag, User, Phone, AlertCircle, X, Users, Check
} from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  product_name: string;
  amount: string | null;
  status: string;
  driver_name: string | null;
  driver_phone: string | null;
  delivery_address: string;
  created_at: string;
  customer?: { id: string; name: string; phone: string };
  driver?: { id: string; name: string; phone: string; status: string };
}

interface Customer { id: string; name: string; phone: string; delivery_address?: string; }
interface Driver { id: string; name: string; phone: string; status: string; _count?: { orders: number }; }

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PENDING: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock },
  CONFIRMED: { label: 'Confirmed', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: CheckCircle2 },
  DRIVER_ASSIGNED: { label: 'Driver Assigned', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', icon: Users },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200', icon: Truck },
  ARRIVED: { label: 'Arrived', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: MapPin },
  DELIVERED: { label: 'Delivered', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200', icon: XCircle },
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [meta, setMeta] = useState<any>({});
  const [showCreate, setShowCreate] = useState(false);

  // Create Order State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [showNewDriver, setShowNewDriver] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', delivery_address: '' });
  const [newDriver, setNewDriver] = useState({ name: '', phone: '' });
  const [orderForm, setOrderForm] = useState({ productName: '', amount: '', deliveryAddress: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const data = await fetchApi(`/orders?${params.toString()}`);
      setOrders(data.orders || []);
      setMeta(data.meta || {});
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const searchCustomers = async (q: string) => {
    setCustomerSearch(q);
    try {
      const data = await fetchApi(`/customers?q=${encodeURIComponent(q)}`);
      setCustomers(Array.isArray(data) ? data : []);
    } catch {}
  };

  const loadAllDrivers = async () => {
    try {
      const data = await fetchApi('/drivers');
      setDrivers(Array.isArray(data) ? data : []);
    } catch {}
  };

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setNewCustomer({ name: c.name, phone: c.phone, delivery_address: c.delivery_address || '' });
    setOrderForm(f => ({ ...f, deliveryAddress: c.delivery_address || f.deliveryAddress }));
    setShowNewCustomer(false);
    setCustomerSearch('');
  };

  const handleCreateOrder = async () => {
    setModalError(null);
    setCreating(true);

    try {
      let cust = selectedCustomer;
      let drv = selectedDriver;

      // Auto-create / auto-save customer if typed
      if (!cust) {
        const custName = newCustomer.name || customerSearch;
        const custPhone = newCustomer.phone;
        const custAddress = orderForm.deliveryAddress || newCustomer.delivery_address;

        if (!custName || !custPhone) {
          throw new Error('Please enter Customer Name and Phone Number (or select an existing customer).');
        }

        const savedCust = await fetchApi('/customers', {
          method: 'POST',
          body: JSON.stringify({
            name: custName,
            phone: custPhone,
            delivery_address: custAddress,
          }),
        });
        cust = savedCust;
      }

      // Validate product & address
      if (!orderForm.productName.trim()) {
        throw new Error('Please enter Product / Order Description.');
      }
      if (!orderForm.deliveryAddress.trim()) {
        throw new Error('Please enter Delivery Address.');
      }

      // Auto-create driver if typed
      if (!drv && (newDriver.name || newDriver.phone)) {
        if (!newDriver.name || !newDriver.phone) {
          throw new Error('Please enter both Driver Name and Phone Number.');
        }
        const savedDrv = await fetchApi('/drivers', {
          method: 'POST',
          body: JSON.stringify(newDriver),
        });
        drv = savedDrv;
      }

      if (!cust) {
        throw new Error('Please enter Customer Name and Phone Number (or select an existing customer).');
      }

      await fetchApi('/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerId: cust.id,
          customerName: cust.name,
          customerPhone: cust.phone,
          deliveryAddress: orderForm.deliveryAddress,
          productName: orderForm.productName,
          amount: orderForm.amount || undefined,
          driverId: drv?.id,
          driverName: drv?.name,
          driverPhone: drv?.phone,
        }),
      });

      setSuccess('Order created successfully! Customer SMS sent automatically.');
      setShowCreate(false);
      resetCreateForm();
      loadOrders();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setModalError(err.message || 'Failed to create order.');
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setSelectedCustomer(null);
    setSelectedDriver(null);
    setOrderForm({ productName: '', amount: '', deliveryAddress: '' });
    setCustomerSearch('');
    setNewCustomer({ name: '', phone: '', delivery_address: '' });
    setNewDriver({ name: '', phone: '' });
    setShowNewCustomer(false);
    setShowNewDriver(false);
    setModalError(null);
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="space-y-5">
      {/* Success & Error Alerts */}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-500 hover:text-emerald-700"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-rose-500 hover:text-rose-700"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Orders</h1>
          <p className="text-sm text-slate-500 font-medium">Manage customer orders and assign deliveries.</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); loadAllDrivers(); searchCustomers(''); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create Order</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search order ID, customer, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 min-w-[140px]"
        >
          <option value="ALL">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button onClick={loadOrders} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 shadow-sm transition-colors active:scale-90">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 rounded-xl bg-teal-100 animate-pulse mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-400">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-500">No orders yet</p>
            <p className="text-xs text-slate-400 mt-1">Create your first order to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-bold text-slate-600 uppercase tracking-wider">Order ID</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600 uppercase tracking-wider">Product</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600 uppercase tracking-wider">Driver</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600 uppercase tracking-wider">Created</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-600 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                  const StatusIcon = statusCfg.icon;
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{order.order_number}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-800">{order.customer_name}</p>
                        <p className="text-slate-400 font-medium">{order.customer_phone}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{order.product_name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold ${statusCfg.bg} ${statusCfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-600">{order.driver_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 font-medium">{timeAgo(order.created_at)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex justify-center gap-2 text-xs font-bold text-slate-500">
          <span>Page {meta.page} of {meta.totalPages}</span>
        </div>
      )}

      {/* CREATE ORDER MODAL */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">Create Order</h2>
                <p className="text-[11px] font-semibold text-slate-400">Fill in dispatch details for instant SMS tracking</p>
              </div>
              <button
                onClick={() => { setShowCreate(false); resetCreateForm(); }}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Modal Error Alert */}
              {modalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* CUSTOMER SECTION */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Customer Details *</label>

                {selectedCustomer ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-teal-50 border border-teal-200">
                    <div>
                      <p className="text-xs font-bold text-teal-800">{selectedCustomer.name}</p>
                      <p className="text-[10px] text-teal-600 font-medium">{selectedCustomer.phone}</p>
                    </div>
                    <button onClick={() => setSelectedCustomer(null)} className="text-teal-600 hover:text-teal-800 text-[10px] font-bold">Change</button>
                  </div>
                ) : (
                  <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    {/* Search / Select Existing */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search existing customer..."
                        value={customerSearch}
                        onChange={e => searchCustomers(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                      {customers.length > 0 && customerSearch && (
                        <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white max-h-32 overflow-y-auto rounded-xl border border-slate-200 shadow-lg divide-y divide-slate-100">
                          {customers.map(c => (
                            <button key={c.id} onClick={() => handleSelectCustomer(c)} className="w-full text-left px-3 py-2 hover:bg-teal-50 transition-colors">
                              <p className="text-xs font-bold text-slate-800">{c.name}</p>
                              <p className="text-[10px] text-slate-500">{c.phone}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Or Type New Customer Inline */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Customer Name *"
                        value={newCustomer.name}
                        onChange={e => setNewCustomer(p => ({ ...p, name: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                      <input
                        type="text"
                        placeholder="Customer Phone *"
                        value={newCustomer.phone}
                        onChange={e => setNewCustomer(p => ({ ...p, phone: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* PRODUCT */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Product / Order Description *</label>
                <input
                  type="text"
                  placeholder="e.g. iPhone 15, Nike Air Max..."
                  value={orderForm.productName}
                  onChange={e => setOrderForm(f => ({ ...f, productName: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              {/* AMOUNT */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Amount (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 2,400,000"
                  value={orderForm.amount}
                  onChange={e => setOrderForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              {/* DELIVERY ADDRESS */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Delivery Address *</label>
                <input
                  type="text"
                  placeholder="e.g. 57VJ+M9J, Nungwi"
                  value={orderForm.deliveryAddress}
                  onChange={e => setOrderForm(f => ({ ...f, deliveryAddress: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              {/* DRIVER SELECTION */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Driver (Optional)</label>
                {selectedDriver ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                    <div>
                      <p className="text-xs font-bold text-indigo-800">{selectedDriver.name}</p>
                      <p className="text-[10px] text-indigo-600 font-medium">{selectedDriver.phone}</p>
                    </div>
                    <button onClick={() => setSelectedDriver(null)} className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold">Change</button>
                  </div>
                ) : (
                  <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    {drivers.length > 0 && (
                      <div className="max-h-28 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100 bg-white">
                        {drivers.map(d => (
                          <button key={d.id} onClick={() => setSelectedDriver(d)} className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 transition-colors flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-800">{d.name}</p>
                              <p className="text-[10px] text-slate-500">{d.phone}</p>
                            </div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${d.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {d.status === 'AVAILABLE' ? '● Available' : '● Busy'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="New Driver Name (Optional)"
                        value={newDriver.name}
                        onChange={e => setNewDriver(p => ({ ...p, name: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                      <input
                        type="text"
                        placeholder="New Driver Phone (Optional)"
                        value={newDriver.phone}
                        onChange={e => setNewDriver(p => ({ ...p, phone: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky / Fixed Footer Action Bar */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-white shrink-0 shadow-lg pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <button
                onClick={handleCreateOrder}
                disabled={creating}
                className="w-full py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] active:scale-95 text-white font-extrabold text-sm shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                {creating ? 'Creating Order...' : 'Create Order'}
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
