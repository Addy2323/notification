'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PieChart, RefreshCw } from 'lucide-react';
import { fetchApi } from '@/lib/api';

type Series = { key: string; label: string; color: string };
function TrendChart({ title, rows, series, currency = false }: { title: string; rows: any[]; series: Series[]; currency?: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 800, height = 280, left = 75, right = 20, top = 20, bottom = 55;
  const values = rows.flatMap(row => series.map(s => Number(row[s.key] || 0)));
  const max = values.reduce((m, v) => Math.max(m, v), 1);
  const min = values.reduce((m, v) => Math.min(m, v), 0);
  const x = (index: number) => left + (rows.length <= 1 ? (width - left - right) / 2 : index / (rows.length - 1) * (width - left - right));
  const y = (value: number) => top + (max - value) / (max - min) * (height - top - bottom);
  const format = (value: number) => `${currency ? 'TZS ' : ''}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const compact = (value: number) => Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  return <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
    <h2 className="text-white font-bold">{title}</h2>
    <div className="flex flex-wrap gap-4 text-xs">{series.map(s => <span key={s.key} style={{ color: s.color }}>{s.label}</span>)}</div>
    {!rows.length ? <p className="text-slate-400 py-12 text-center">No records in this period.</p> : <>
      <svg role="img" aria-label={title} viewBox={`0 0 ${width} ${height}`} className="w-full" onMouseLeave={() => setHover(null)}>
        <title>{title}</title>
        {[0, 0.25, 0.5, 0.75, 1].map(fraction => { const value = min + fraction * (max - min); return <g key={fraction}><line x1={left} x2={width - right} y1={y(value)} y2={y(value)} stroke="#334155" strokeDasharray="4 4" /><text x={left - 10} y={y(value) + 4} textAnchor="end" fill="#94a3b8" fontSize="11">{compact(value)}</text></g>; })}
        {series.map(s => <g key={s.key}><polyline points={rows.map((row, index) => `${x(index)},${y(Number(row[s.key] || 0))}`).join(' ')} fill="none" stroke={s.color} strokeWidth="2.5" />{rows.length === 1 && <circle cx={x(0)} cy={y(Number(rows[0][s.key] || 0))} r="4" fill={s.color} />}</g>)}
        {rows.map((row, index) => <g key={row.label}>
          <rect x={x(index) - Math.max(2, (width - left - right) / Math.max(1, rows.length) / 2)} y={top} width={Math.max(4, (width - left - right) / Math.max(1, rows.length))} height={height - top - bottom} fill="transparent" onMouseEnter={() => setHover(index)} onClick={() => setHover(index)} />
          {(index % Math.max(1, Math.ceil(rows.length / 6)) === 0 || index === rows.length - 1) && <text x={x(index)} y={height - 25} textAnchor="middle" fill="#94a3b8" fontSize="10">{row.label}</text>}
        </g>)}
        {hover !== null && rows[hover] && <line x1={x(hover)} x2={x(hover)} y1={top} y2={height - bottom} stroke="#94a3b8" pointerEvents="none" />}
      </svg>
      <p className="text-xs text-slate-300 min-h-5" aria-live="polite">{hover !== null && rows[hover] ? `${rows[hover].label} ? ${series.map(s => `${s.label}: ${format(rows[hover][s.key])}`).join(' ? ')}` : 'Hover or tap the graph for exact values.'}</p>
      <details className="text-xs text-slate-400"><summary className="cursor-pointer">View chart data</summary><div className="overflow-x-auto max-h-64 mt-3"><table className="w-full text-left"><thead><tr><th className="p-2">Period</th>{series.map(s => <th className="p-2" key={s.key}>{s.label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.label}><td className="p-2">{row.label}</td>{series.map(s => <td className="p-2" key={s.key}>{format(row[s.key])}</td>)}</tr>)}</tbody></table></div></details>
    </>}
  </section>;
}

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState('THIS_MONTH');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const loadData = async () => {
    const request = ++requestId.current; setLoading(true); setError('');
    try { const result = await fetchApi(`/admin/analytics?period=${period}`); if (request === requestId.current) setData(result); }
    catch (err: any) { if (request === requestId.current) { setError(err.message || 'Failed to load analytics'); setData(null); } }
    finally { if (request === requestId.current) setLoading(false); }
  };
  useEffect(() => { loadData(); return () => { requestId.current++; }; }, [period]);
  const money = (value: number) => `TZS ${Number(value || 0).toLocaleString()}`;
  return <div className="space-y-6">
    <div className="flex flex-wrap justify-between gap-4 border-b border-slate-800 pb-5">
      <div><h1 className="text-2xl font-black text-white flex items-center gap-2"><PieChart className="w-6 h-6 text-amber-400" />Platform Analytics</h1><p className="text-xs text-slate-400 mt-1">Sales, order dispatches and SMS results from saved platform records.</p></div>
      <button disabled={loading} onClick={loadData} className="text-amber-400 flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
    </div>
    <div className="flex flex-wrap gap-2">{[['ALL', 'All Time'], ['TODAY', 'Today'], ['THIS_WEEK', 'This Week'], ['THIS_MONTH', 'This Month'], ['SEMI_ANNUAL', 'Semiannual']].map(([value, label]) => <button key={value} onClick={() => setPeriod(value)} aria-pressed={period === value} className={`px-4 py-2 rounded-xl text-xs font-bold ${period === value ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>{label}</button>)}</div>
    {error && <p role="alert" className="bg-rose-950 text-rose-300 rounded-xl p-4">{error}</p>}
    {loading ? <p role="status" className="text-slate-400 py-16 text-center">Loading platform analytics...</p> : data && <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          ['Merchant accounts (all time)', data.merchants.total, `${data.merchants.active} active ? ${data.merchants.engaged} with orders in this period`],
          ['Orders and fulfillment', data.summary.orders, `${data.summary.delivered} delivered / ${data.summary.dispatches} dispatches (including standalone deliveries)`],
          ['SMS delivery rate', data.notifications.deliveryRate === null ? 'No attempts' : `${data.notifications.deliveryRate}%`, `${data.notifications.delivered} delivered ? ${data.notifications.failed} failed ? ${data.notifications.queued} queued`],
          ['Sales after refunds', money(data.summary.sales), `Refunds: ${money(data.summary.refunds)}`],
          ['Product buying cost', money(data.summary.cost), 'Cost recovered for refunded goods returned to stock'],
          ['Gross profit', money(data.summary.profit), `${data.summary.missingCostCount} orders missing buying cost (profit excluded)`]
        ].map(([title, value, note]) => <div key={title} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3"><h2 className="text-xs font-bold uppercase text-slate-400">{title}</h2><p className="text-2xl font-black text-white">{value}</p><p className="text-xs text-slate-400">{note}</p></div>)}
      </div>
      <p className="text-xs text-slate-400">Timezone: {data.period.timezone}. Sales and fulfillment group orders by creation date and current status, including refunds recorded later. Standalone deliveries exclude records linked to orders. SMS delivery rate = delivered ? (sent + delivered + failed); queued messages are excluded. Semiannual means the current calendar half-year to date.</p>
      <TrendChart title="Sales and gross profit (TZS)" rows={data.trend} currency series={[{ key: 'sales', label: 'Sales after refunds', color: '#fbbf24' }, { key: 'profit', label: 'Gross profit', color: '#34d399' }]} />
      <TrendChart title="Orders and fulfillment by creation period" rows={data.trend} series={[{ key: 'orders', label: 'Orders created', color: '#60a5fa' }, { key: 'delivered', label: 'Delivered dispatches', color: '#34d399' }]} />
      <TrendChart title="SMS delivery results" rows={data.trend} series={[{ key: 'smsDelivered', label: 'Delivered SMS', color: '#34d399' }, { key: 'smsFailed', label: 'Failed SMS', color: '#fb7185' }]} />
      <div className="grid md:grid-cols-2 gap-4">{[['Dispatch statuses', data.dispatchStatuses], ['SMS statuses', data.notificationStatuses]].map(([title, counts]) => <section key={title as string} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3"><h2 className="text-white font-bold">{title as string}</h2>{Object.entries(counts as Record<string, number>).length ? Object.entries(counts as Record<string, number>).map(([status, count]) => <div key={status} className="text-xs text-slate-300"><div className="flex justify-between"><span>{status.replaceAll('_', ' ')}</span><strong>{count}</strong></div><div className="h-2 bg-slate-800 rounded mt-1"><div className="h-2 bg-amber-400 rounded" style={{ width: `${count / Math.max(1, ...Object.values(counts as Record<string, number>)) * 100}%` }} /></div></div>) : <p className="text-slate-400 text-sm">No records in this period.</p>}</section>)}</div>
    </>}
  </div>;
}
