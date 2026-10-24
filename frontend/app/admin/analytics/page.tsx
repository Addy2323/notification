'use client';


import { useLanguage, T } from '@/components/LanguageProvider';
import React, { useState, useEffect, useRef } from 'react';
import { PieChart, RefreshCw } from 'lucide-react';
import { fetchApi } from '@/lib/api';

type Series = { key: string; label: string; color: string };
function TrendChart({ title, rows, series, currency = false }: { title: string; rows: any[]; series: Series[]; currency?: boolean }) {
  const { t, label: uiLabel, locale } = useLanguage();

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
    <h2 className="text-white font-bold">{uiLabel(title)}</h2>
    <div className="flex flex-wrap gap-4 text-xs">{series.map(s => <span key={s.key} style={{ color: s.color }}>{uiLabel(s.label)}</span>)}</div>
    {!rows.length ? <p className="text-slate-400 py-12 text-center"><T k="admin.no_records_in_this_period" /></p> : <>
      <svg role="img" aria-label={uiLabel(title)} viewBox={`0 0 ${width} ${height}`} className="w-full" onMouseLeave={() => setHover(null)}>
        <title>{uiLabel(title)}</title>
        {[0, 0.25, 0.5, 0.75, 1].map(fraction => { const value = min + fraction * (max - min); return <g key={fraction}><line x1={left} x2={width - right} y1={y(value)} y2={y(value)} stroke="#334155" strokeDasharray="4 4" /><text x={left - 10} y={y(value) + 4} textAnchor="end" fill="#94a3b8" fontSize="11">{compact(value)}</text></g>; })}
        {series.map(s => <g key={s.key}><polyline points={rows.map((row, index) => `${x(index)},${y(Number(row[s.key] || 0))}`).join(' ')} fill="none" stroke={s.color} strokeWidth="2.5" />{rows.length === 1 && <circle cx={x(0)} cy={y(Number(rows[0][s.key] || 0))} r="4" fill={s.color} />}</g>)}
        {rows.map((row, index) => <g key={uiLabel(row.label)}>
          <rect x={x(index) - Math.max(2, (width - left - right) / Math.max(1, rows.length) / 2)} y={top} width={Math.max(4, (width - left - right) / Math.max(1, rows.length))} height={height - top - bottom} fill="transparent" onMouseEnter={() => setHover(index)} onClick={() => setHover(index)} />
          {(index % Math.max(1, Math.ceil(rows.length / 6)) === 0 || index === rows.length - 1) && <text x={x(index)} y={height - 25} textAnchor="middle" fill="#94a3b8" fontSize="10">{uiLabel(row.label)}</text>}
        </g>)}
        {hover !== null && rows[hover] && <line x1={x(hover)} x2={x(hover)} y1={top} y2={height - bottom} stroke="#94a3b8" pointerEvents="none" />}
      </svg>
      <p className="text-xs text-slate-300 min-h-5" aria-live="polite">{hover !== null && rows[hover] ? `${rows[hover].label} ? ${series.map(s => `${s.label}: ${format(rows[hover][s.key])}`).join(' ? ')}` : t("admin.hover_or_tap_the_graph_for_exact_values")}</p>
      <details className="text-xs text-slate-400"><summary className="cursor-pointer"><T k="admin.view_chart_data" /></summary><div className="overflow-x-auto max-h-64 mt-3"><table className="w-full text-left"><thead><tr><th className="p-2"><T k="admin.period" /></th>{series.map(s => <th className="p-2" key={s.key}>{uiLabel(s.label)}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={uiLabel(row.label)}><td className="p-2">{uiLabel(row.label)}</td>{series.map(s => <td className="p-2" key={s.key}>{format(row[s.key])}</td>)}</tr>)}</tbody></table></div></details>
    </>}
  </section>;
}

export default function AdminAnalyticsPage() {
  const { t, label: uiLabel, locale } = useLanguage();

  const [period, setPeriod] = useState('THIS_MONTH');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const loadData = async () => {
    const request = ++requestId.current; setLoading(true); setError('');
    try { const result = await fetchApi(`/admin/analytics?period=${period}`); if (request === requestId.current) setData(result); }
    catch (err: any) { if (request === requestId.current) { setError(err.message || t("admin.failed_to_load_analytics")); setData(null); } }
    finally { if (request === requestId.current) setLoading(false); }
  };
  useEffect(() => { loadData(); return () => { requestId.current++; }; }, [period]);
  const money = (value: number) => `TZS ${Number(value || 0).toLocaleString(locale)}`;
  return <div className="space-y-6">
    <div className="flex flex-wrap justify-between gap-4 border-b border-slate-800 pb-5">
      <div><h1 className="text-2xl font-black text-white flex items-center gap-2"><PieChart className="w-6 h-6 text-amber-400" /><T k="admin.platform_analytics" /></h1><p className="text-xs text-slate-400 mt-1"><T k="admin.sales_order_dispatches_and_sms_results_from_saved_platform_records" /></p></div>
      <button disabled={loading} onClick={loadData} className="text-amber-400 flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /><T k="common.refresh" /></button>
    </div>
    <div className="flex flex-wrap gap-2">{[['ALL', 'All Time'], ['TODAY', 'Today'], ['THIS_WEEK', 'This Week'], ['THIS_MONTH', 'This Month'], ['SEMI_ANNUAL', 'Semiannual']].map(([value, label]) => <button key={value} onClick={() => setPeriod(value)} aria-pressed={period === value} className={`px-4 py-2 rounded-xl text-xs font-bold ${period === value ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>{uiLabel(label)}</button>)}</div>
    {error && <p role="alert" className="bg-rose-950 text-rose-300 rounded-xl p-4">{error}</p>}
    {loading ? <p role="status" className="text-slate-400 py-16 text-center"><T k="admin.loading_platform_analytics" /></p> : data && <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          ['Merchant accounts (all time)', data.merchants.total, t("interactions.value0_active_value1_with_orders_in_this_period", { value0: (data.merchants.active) ?? '', value1: (data.merchants.engaged) ?? '' })],
          ['Orders and fulfillment', data.summary.orders, t("interactions.value0_delivered_value1_dispatches_including_standalone_deliveries", { value0: (data.summary.delivered) ?? '', value1: (data.summary.dispatches) ?? '' })],
          ['SMS delivery rate', data.notifications.deliveryRate === null ? t("admin.no_attempts") : `${data.notifications.deliveryRate}%`, t("interactions.value0_delivered_value1_failed_value2_queued", { value0: (data.notifications.delivered) ?? '', value1: (data.notifications.failed) ?? '', value2: (data.notifications.queued) ?? '' })],
          ['Sales after refunds', money(data.summary.sales), t("interactions.refunds_value0", { value0: (money(data.summary.refunds)) ?? '' })],
          ['Product buying cost', money(data.summary.cost), 'Cost recovered for refunded goods returned to stock'],
          ['Gross profit', money(data.summary.profit), t("interactions.value0_orders_missing_buying_cost_profit_excluded", { value0: (data.summary.missingCostCount) ?? '' })]
        ].map(([title, value, note]) => <div key={uiLabel(title)} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3"><h2 className="text-xs font-bold uppercase text-slate-400">{uiLabel(title)}</h2><p className="text-2xl font-black text-white">{value}</p><p className="text-xs text-slate-400">{uiLabel(note)}</p></div>)}
      </div>
      <p className="text-xs text-slate-400"><T k="admin.timezone" />{' '}{data.period.timezone}<T k="admin.sales_and_fulfillment_group_orders_by_creation_date_and_current_status_including_refu" /></p>
      <TrendChart title={t("admin.sales_and_gross_profit_tzs")} rows={data.trend} currency series={[{ key: 'sales', label: 'Sales after refunds', color: '#fbbf24' }, { key: 'profit', label: 'Gross profit', color: '#34d399' }]} />
      <TrendChart title={t("admin.orders_and_fulfillment_by_creation_period")} rows={data.trend} series={[{ key: 'orders', label: 'Orders created', color: '#60a5fa' }, { key: 'delivered', label: 'Delivered dispatches', color: '#34d399' }]} />
      <TrendChart title={t("admin.sms_delivery_results")} rows={data.trend} series={[{ key: 'smsDelivered', label: 'Delivered SMS', color: '#34d399' }, { key: 'smsFailed', label: 'Failed SMS', color: '#fb7185' }]} />
      <div className="grid md:grid-cols-2 gap-4">{[['Dispatch statuses', data.dispatchStatuses], ['SMS statuses', data.notificationStatuses]].map(([title, counts]) => <section key={title as string} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3"><h2 className="text-white font-bold">{title as string}</h2>{Object.entries(counts as Record<string, number>).length ? Object.entries(counts as Record<string, number>).map(([status, count]) => <div key={status} className="text-xs text-slate-300"><div className="flex justify-between"><span>{uiLabel(status.replaceAll('_', ' '))}</span><strong>{count}</strong></div><div className="h-2 bg-slate-800 rounded mt-1"><div className="h-2 bg-amber-400 rounded" style={{ width: `${count / Math.max(1, ...Object.values(counts as Record<string, number>)) * 100}%` }} /></div></div>) : <p className="text-slate-400 text-sm"><T k="admin.no_records_in_this_period" /></p>}</section>)}</div>
    </>}
  </div>;
}
