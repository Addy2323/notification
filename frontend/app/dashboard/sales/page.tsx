'use client';


import { useLanguage, T } from '@/components/LanguageProvider';
import React, { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import OrderEditor from '@/components/OrderEditor';
import { DollarSign, Search, Calendar, Filter, ArrowUpRight, TrendingUp, TrendingDown, Layers, ChevronDown, ChevronUp, Download, RefreshCw, ShoppingBag, Truck } from 'lucide-react';

export default function SalesLedgerPage() {
  const { t, label: uiLabel, locale } = useLanguage();

  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [refund, setRefund] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [restocked, setRestocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [salesData, setSalesData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const loadSales = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (range) params.append('range', range);
      if (searchQuery) params.append('q', searchQuery);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetchApi(`/sales?${params.toString()}`);
      setSalesData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("merchant.failed_to_load_sales_ledger"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, [range, statusFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadSales();
  };

  const summary = salesData?.summary || {
    totalOrders: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    deliveredCount: 0,
    pendingCount: 0,
  };

  const orders = salesData?.orders || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {editOrderId && <OrderEditor orderId={editOrderId} mode="edit" onClose={() => setEditOrderId(null)} onSaved={async () => { setEditOrderId(null); setSuccess(t("interactions.order_updated_buying_price_selling_price_and_profit_have_been_refreshed")); await loadSales(); }} />}
      {success && <p role="status" className="p-4 rounded-xl bg-emerald-50 text-emerald-800">{success}<button type="button" onClick={() => setSuccess('')} className="ml-3 underline"><T k="merchant.dismiss" /></button></p>}
      {error && <p role="alert" className="p-4 bg-rose-50 text-rose-700">{error}</p>}
      {refund && <form className="p-5 bg-white border rounded-xl space-y-3" onSubmit={async e => {
        e.preventDefault(); setSaving(true);
        try { await fetchApi(`/orders/${refund.id}/refund`, { method: 'POST', body: JSON.stringify({ reason, restocked }) }); setRefund(null); await loadSales(); }
        catch (err: any) { setError(err.message); } finally { setSaving(false); }
      }}>
        <p className="font-bold"><T k="merchant.record_full_refund" />{' '}{refund.order_number}{' '}<T k="merchant.tzs" />{' '}{Number(refund.total_revenue ?? refund.amount ?? 0).toLocaleString(locale)}</p>
        <input aria-label={t("merchant.refund_reason")} required maxLength={500} value={reason} onChange={e => setReason(e.target.value)} placeholder={t("merchant.reason_for_refund")} className="border rounded p-2 w-full" />
        <label className="block"><input type="checkbox" checked={restocked} onChange={e => setRestocked(e.target.checked)} />{' '}<T k="merchant.goods_returned_to_stock_recover_buying_cost" /></label>
        <p className="text-xs text-slate-500"><T k="merchant.recording_a_refund_updates_the_ledger_process_the_customer_payment_separately" /></p>
        <button disabled={saving || !reason.trim()} className="bg-rose-600 text-white px-4 py-2 rounded disabled:opacity-50">{saving ? t("common.saving") : t("merchant.record_refund")}</button>
        <button type="button" disabled={saving} onClick={() => setRefund(null)} className="px-4"><T k="common.cancel" /></button>
      </form>}
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF5500] to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight"><T k="merchant.digital_sales_ledger" /></h1>
              <p className="text-sm text-slate-400"><T k="merchant.buying_prices_selling_prices_automatic_profit_calculations" /></p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadSales}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-sm transition flex items-center gap-2 border border-slate-700"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />{' '}<T k="common.refresh" />{' '}</button>
        </div>
      </div>

      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider uppercase text-slate-500"><T k="merchant.total_buying_price" /></span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            TZS {summary.totalCost.toLocaleString(locale)}
          </p>
          <p className="text-xs text-slate-500 mt-1"><T k="merchant.buying_total_across" />{' '}{summary.totalOrders}{' '}<T k="merchant.recorded_orders" /></p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider uppercase text-slate-500"><T k="merchant.total_selling_price" /></span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            TZS {summary.totalRevenue.toLocaleString(locale)}
          </p>
          <p className="text-xs text-slate-500 mt-1"><T k="merchant.selling_total_after_refunds" /></p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider uppercase text-slate-500"><T k="common.gross_profit" /></span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">
            TZS {summary.totalProfit.toLocaleString(locale)}
          </p>
          <p className="text-xs text-emerald-700 font-medium mt-1"><T k="merchant.gross_profit_after_item_cost_and_refunds" /></p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider uppercase text-slate-500"><T k="merchant.delivery_status" /></span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-900">{summary.deliveredCount}</span>
            <span className="text-xs font-semibold text-emerald-600 uppercase"><T k="common.delivered" /></span>
            <span className="text-slate-300">/</span>
            <span className="text-lg font-bold text-amber-600">{summary.pendingCount}</span>
            <span className="text-xs font-medium text-slate-500"><T k="common.pending" /></span>
          </div>
          <p className="text-xs text-slate-500 mt-1"><T k="merchant.fulfillment_efficiency" /></p>
        </div>
      </div>

      <div className="p-4 rounded-xl border bg-white">
        <p className="font-bold"><T k="merchant.refunds_tzs_2" />{' '}{(summary.totalRefunds || 0).toLocaleString(locale)} ? {summary.refundedCount || 0}{' '}<T k="merchant.orders" /></p>
        <p className="text-xs text-slate-500"><T k="merchant.prices_shown_are_order_totals_including_quantity_and_discounts_selling_totals_are_aft" /></p>
        {!!summary.missingCostCount && <p className="text-amber-700 text-sm mt-2">{summary.missingCostCount}{' '}<T k="admin.orders_have_no_buying_cost_recorded_their_profit_is_excluded" /></p>}
      </div>
      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Period Selector Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'ALL', label: 'All Time' },
            { id: 'TODAY', label: 'Today' },
            { id: 'YESTERDAY', label: 'Yesterday' },
            { id: 'THIS_WEEK', label: 'This Week' },
            { id: 'THIS_MONTH', label: 'This Month' },
            { id: 'THIS_YEAR', label: 'This Year' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => { setPage(1); setRange(p.id); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                range === p.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {uiLabel(p.label)}
            </button>
          ))}
        </div>

        {/* Search & Status Filter */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t("merchant.search_order_customer_product")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5500] focus:border-transparent transition"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
          >
            <option value=""><T k="merchant.all_statuses" /></option>
            <option value="REFUNDED"><T k="common.refunded" /></option>
            <option value="CONFIRMED"><T k="common.confirmed" /></option>
            <option value="ARRIVED"><T k="common.arrived" /></option>
            <option value="DELIVERED"><T k="common.delivered" /></option>
            <option value="OUT_FOR_DELIVERY"><T k="common.out_for_delivery" /></option>
            <option value="DRIVER_ASSIGNED"><T k="common.driver_assigned" /></option>
            <option value="PENDING"><T k="common.pending" /></option>
            <option value="CANCELLED"><T k="common.cancelled" /></option>
          </select>
        </form>
      </div>

      <div className="flex items-center justify-end gap-3 text-sm">
        <button disabled={loading || page <= 1} onClick={() => setPage(p => p - 1)}><T k="common.previous" /></button>
        <span><T k="common.page" />{' '}{page}{' '}<T k="common.of" />{' '}{Math.max(1, salesData?.pagination?.totalPages || 1)}</span>
        <button disabled={loading || page >= (salesData?.pagination?.totalPages || 1)} onClick={() => setPage(p => p + 1)}><T k="common.next" /></button>
      </div>
      {/* Digital Sales Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4"><T k="merchant.order_id" /></th>
                <th className="py-3.5 px-4"><T k="merchant.date_time" /></th>
                <th className="py-3.5 px-4"><T k="common.customer" /></th>
                <th className="py-3.5 px-4"><T k="merchant.product_line_items" /></th>
                <th className="py-3.5 px-4 text-right"><T k="merchant.buying_price_tzs" /></th>
                <th className="py-3.5 px-4 text-right"><T k="merchant.selling_price_tzs" /></th>
                <th className="py-3.5 px-4 text-right"><T k="merchant.profit_tzs" /></th>
                <th className="py-3.5 px-4"><T k="common.driver" /></th>
                <th className="py-3.5 px-4"><T k="common.status" /></th>
                <th className="py-3.5 px-4 text-center"><T k="common.actions" /></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#FF5500]" />{' '}<T k="merchant.loading_sales_records" />{' '}</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">{' '}<T k="merchant.no_sales_records_found_for_the_selected_criteria" />{' '}</td>
                </tr>
              ) : (
                orders.map((ord: any) => {
                  const rev = Number(ord.net_revenue ?? 0);
                  const cost = ord.net_cost;
                  const profit = ord.net_profit;
                  const isExpanded = expandedOrderId === ord.id;

                  return (
                    <React.Fragment key={ord.id}>
                      <tr className="hover:bg-slate-50 transition cursor-pointer" onClick={() => setExpandedOrderId(isExpanded ? null : ord.id)}>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{ord.order_number}</td>
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(ord.created_at).toLocaleDateString(locale)} {new Date(ord.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800">{ord.customer_name}</p>
                          <p className="text-[11px] text-slate-400">{ord.customer_phone}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-slate-800 max-w-xs truncate">{ord.product_name}</p>
                          {ord.items && ord.items.length > 0 && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                              {t("common.item_count", { count: ord.items.length })}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                          {cost === null ? t("common.not_recorded") : Number(cost).toLocaleString(locale)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-500">
                          {rev.toLocaleString(locale)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                          {profit === null ? t("merchant.not_available") : Number(profit).toLocaleString(locale)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {ord.driver_name || <span className="text-slate-300 italic"><T k="common.unassigned" /></span>}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ord.status === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.status === 'CANCELLED' || ord.status === 'FAILED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {uiLabel(ord.payment_status === 'REFUNDED' ? 'REFUNDED' : ord.status)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-400">
                          <div className="flex items-center justify-center gap-2">
                            <button type="button" aria-label={t("interactions.edit_order_value0", { value0: (ord.order_number) ?? '' })} onClick={event => { event.stopPropagation(); setSuccess(''); setEditOrderId(ord.id); }} className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold"><T k="merchant.edit" /></button>
                            <button type="button" aria-label={t("interactions.value0_details_for_value1", { value0: (isExpanded ? t("admin.hide") : t("admin.show")) ?? '', value1: (ord.order_number) ?? '' })} aria-expanded={isExpanded} onClick={event => { event.stopPropagation(); setExpandedOrderId(isExpanded ? null : ord.id); }}>{isExpanded ? <ChevronUp className="w-4 h-4 mx-auto" /> : <ChevronDown className="w-4 h-4 mx-auto" />}</button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Order Items Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50 border-t border-b border-slate-200">
                          <td colSpan={10} className="p-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                              {ord.status === 'DELIVERED' && ord.payment_status !== 'REFUNDED' && <button onClick={() => { setRefund(ord); setReason(''); setRestocked(false); }} className="px-3 py-2 rounded bg-rose-50 text-rose-700 font-bold"><T k="common.record_full_refund" /></button>}
                              {ord.events?.map((event: any) => { let data: any = {}; try { data = JSON.parse(event.metadata || '{}'); } catch {} return <p key={event.id} className="text-rose-700"><T k="admin.refund" />{' '}{data.reason} ? {data.restocked ? t("common.returned_to_stock") : t("admin.cost_retained")} ? {new Date(event.timestamp).toLocaleString(locale)}</p>; })}
                              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                                <ShoppingBag className="w-4 h-4 text-[#FF5500]" />{' '}<T k="merchant.order_line_items" />{' '}</h4>

                              {ord.items && ord.items.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                  {ord.items.map((it: any) => (
                                    <div key={it.id} className="py-2 flex items-center justify-between text-xs">
                                      <div>
                                        <span className="font-bold text-slate-800">{it.product_name_snapshot}</span>
                                        {it.product_sku_snapshot && (
                                          <span className="ml-2 text-[10px] text-slate-400 font-mono">SKU: {it.product_sku_snapshot}</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-6 text-slate-600">
                                        <span><T k="merchant.qty" />{' '}<strong>{it.quantity}</strong></span>
                                        <span><T k="merchant.selling_price_unit_tzs" />{' '}<strong>{Number(it.unit_selling_price).toLocaleString(locale)}</strong></span>
                                        <span><T k="merchant.buying_price_unit_tzs" />{' '}<strong>{it.unit_cost_price === null ? t("common.not_recorded") : Number(it.unit_cost_price).toLocaleString(locale)}</strong></span>
                                        <span className="font-bold text-slate-900"><T k="merchant.subtotal_tzs" />{' '}{Number(it.subtotal).toLocaleString(locale)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-slate-400 italic text-xs"><T k="merchant.single_line_item_order" />{' '}{ord.product_name}</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
