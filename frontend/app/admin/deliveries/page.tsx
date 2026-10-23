'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Package, RefreshCw, X } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function AdminDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [source, setSource] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>({ total: 0, totalPages: 0 });
  const [selected, setSelected] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updated, setUpdated] = useState('');
  const listRequest = useRef(0);
  const detailRequest = useRef(0);
  const date = (value: string) => value ? new Date(value).toLocaleString() : 'Not recorded';
  const loadData = async (background = false) => {
    const request = ++listRequest.current;
    if (!background) setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ search, status, source, page: String(page), limit: '25' });
      const result = await fetchApi(`/admin/deliveries?${params}`);
      if (request !== listRequest.current) return;
      setDeliveries(result.deliveries); setPagination(result.pagination); setUpdated(new Date().toLocaleTimeString());
    } catch (err: any) {
      if (request === listRequest.current) { setError(err.message || 'Failed to load deliveries'); if (!background) setDeliveries([]); }
    } finally { if (request === listRequest.current) setLoading(false); }
  };
  useEffect(() => {
    const timer = setTimeout(() => loadData(), 250);
    const refresh = setInterval(() => { if (document.visibilityState === 'visible') loadData(true); }, 30000);
    return () => { clearTimeout(timer); clearInterval(refresh); listRequest.current++; };
  }, [search, status, source, page]);
  const openDetails = async (row: any) => {
    const request = ++detailRequest.current;
    setDetailLoading(true); setSelected(null); setError('');
    try {
      const detail = await fetchApi(`/admin/deliveries/${row.source}/${encodeURIComponent(row.id)}`);
      if (request === detailRequest.current) setSelected(detail);
    } catch (err: any) { if (request === detailRequest.current) setError(err.message); }
    finally { if (request === detailRequest.current) setDetailLoading(false); }
  };
  const inputClass = 'bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white';
  return <div className="space-y-6">
    <div className="flex justify-between gap-4 border-b border-slate-800 pb-5">
      <div><h1 className="text-2xl font-black text-white flex items-center gap-2"><Package className="w-6 h-6 text-purple-400" />Deliveries Command Centre</h1>
        <p className="text-xs text-slate-400 mt-1">Order dispatches and standalone deliveries across all merchants. Refreshes every 30 seconds.</p></div>
      <button disabled={loading} onClick={() => loadData()} className="text-amber-400 flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
    </div>
    {error && <p role="alert" className="p-4 bg-rose-950 text-rose-300 rounded-xl">{error}{updated ? ` ? Last successful refresh: ${updated}` : ''}</p>}
    {detailLoading && <p role="status" className="text-amber-300">Loading delivery details...</p>}
    <div className="flex flex-wrap gap-3">
      <input aria-label="Search deliveries" placeholder="Search reference, merchant, customer, driver, address..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className={`${inputClass} flex-1 min-w-64`} />
      <select aria-label="Delivery status" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className={inputClass}>
        {[['ALL', 'All statuses'], ['PENDING', 'Pending / Assigned'], ['IN_TRANSIT', 'In transit'], ['ARRIVED', 'Arrived / Nearby'], ['DELIVERED', 'Delivered'], ['FAILED', 'Failed / Cancelled']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <select aria-label="Delivery source" value={source} onChange={e => { setSource(e.target.value); setPage(1); }} className={inputClass}>
        <option value="ALL">All sources</option><option value="ORDER">Order dispatches</option><option value="DELIVERY">Standalone deliveries</option>
      </select>
    </div>
    <p className="text-xs text-slate-400">{pagination.total} matching records{updated && ` ? Updated ${updated}`}</p>
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="bg-slate-950 uppercase"><tr>{['Reference / Source', 'Merchant', 'Customer / Address', 'Product', 'Driver', 'Status', 'Created', 'Details'].map(label => <th key={label} className="p-4">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-800">
          {loading ? <tr><td colSpan={8} className="p-12 text-center">Loading deliveries...</td></tr> : error && !deliveries.length ? <tr><td colSpan={8} className="p-12 text-center">Delivery data could not be loaded. Use Refresh to retry.</td></tr> : !deliveries.length ? <tr><td colSpan={8} className="p-12 text-center">No deliveries found for these filters.</td></tr> : deliveries.map(row => <tr key={`${row.source}-${row.id}`}>
            <td className="p-4"><p className="font-bold text-white break-all">{row.reference}</p><p className="text-slate-500">{row.source === 'ORDER' ? 'Order dispatch' : 'Standalone delivery'}</p></td>
            <td className="p-4 text-amber-400">{row.merchant?.business_name}</td>
            <td className="p-4"><p>{row.customer_name || 'Name not recorded'}</p><p>{row.customer_phone}</p><p className="text-slate-500">{row.delivery_address}</p></td>
            <td className="p-4">{row.product_description}</td>
            <td className="p-4">{row.driver_name || 'Unassigned'}<p>{row.driver_phone}</p></td>
            <td className="p-4 font-bold">{row.status.replaceAll('_', ' ')}</td>
            <td className="p-4">{date(row.created_at)}</td>
            <td className="p-4"><button onClick={() => openDetails(row)} className="text-amber-400">View</button></td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <div className="flex justify-end gap-4 text-sm text-slate-300">
      <button disabled={loading || page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
      <span>Page {page} of {Math.max(1, pagination.totalPages)}</span>
      <button disabled={loading || page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
    </div>
    {selected && <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-label="Delivery details" className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto text-sm text-slate-300 space-y-4">
        <div className="flex justify-between"><h2 className="font-bold text-white break-all">{selected.reference}</h2><button aria-label="Close details" onClick={() => setSelected(null)}><X /></button></div>
        <p>{selected.merchant?.business_name} ? {selected.status.replaceAll('_', ' ')}</p>
        <p>{selected.customer_name} ? {selected.customer_phone}<br />{selected.delivery_address}</p>
        <p>Product: {selected.product_description}<br />Driver: {selected.driver_name || 'Unassigned'} {selected.driver_phone}</p>
        <div className="space-y-1">{[['Created', selected.created_at], ['Assigned', selected.assigned_at], ['Started', selected.started_at || selected.out_for_delivery_at], ['Arrived', selected.arrived_at], ['Delivered', selected.delivered_at], ['Cancelled', selected.cancelled_at]].filter(([, value]) => value).map(([label, value]) => <p key={label}>{label}: {date(value)}</p>)}</div>
        <h3 className="font-bold text-white">Saved timeline</h3>
        {selected.events?.length ? selected.events.map((event: any) => <p key={event.id}>{event.event_type.replaceAll('_', ' ')} ? {date(event.timestamp)} ? {event.actor_type}</p>) : <p>No timeline events recorded.</p>}
      </div>
    </div>}
  </div>;
}
