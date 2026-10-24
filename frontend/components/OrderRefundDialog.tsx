'use client';

import { useLanguage, T } from '@/components/LanguageProvider';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

export default function OrderRefundDialog({ orderId, onClose, onSaved }: { orderId: string; onClose: () => void; onSaved: () => void }) {
  const { t, label: uiLabel, locale } = useLanguage();

  const [order, setOrder] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [restocked, setRestocked] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    fetchApi(`/orders/${encodeURIComponent(orderId)}`).then(data => { if (active) setOrder(data); }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [orderId]);
  const eligible = order?.status === 'DELIVERED' && order?.payment_status !== 'REFUNDED';
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!eligible || saving || !reason.trim()) return;
    setSaving(true); setError('');
    try {
      await fetchApi(`/orders/${encodeURIComponent(orderId)}/refund`, { method: 'POST', body: JSON.stringify({ reason: reason.trim(), restocked, updatedAt: order.updated_at }) });
      onSaved();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4">
    <form role="dialog" aria-modal="true" aria-label={t("public.record_order_refund")} onSubmit={save} className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4">
      <h2 className="text-xl font-bold"><T k="common.record_full_refund" />{' '}{order?.order_number}</h2>
      {error && <p role="alert" className="text-rose-700 bg-rose-50 p-3 rounded-xl">{error}</p>}
      {!order ? <p>{error ? t("public.close_and_reopen_to_retry") : t("public.loading_order")}</p> : !eligible ? <p className="text-amber-700">{uiLabel(order.payment_status === 'REFUNDED' ? t("public.this_order_is_already_refunded") : t("public.only_delivered_orders_can_be_refunded"))}</p> : <>
        <p className="font-bold"><T k="public.refund_amount_tzs" />{' '}{Number(order.total_revenue ?? order.amount ?? 0).toLocaleString(locale)}</p>
        <label className="block text-sm font-semibold"><T k="merchant.refund_reason" /><textarea required maxLength={500} disabled={saving} value={reason} onChange={event => setReason(event.target.value)} className="w-full border rounded-xl p-3 mt-1" /></label>
        <label className="flex gap-2 text-sm"><input type="checkbox" disabled={saving} checked={restocked} onChange={event => setRestocked(event.target.checked)} /><T k="merchant.goods_returned_to_stock_recover_buying_cost" /></label>
        <p className="text-xs text-slate-500"><T k="public.this_records_the_refund_and_adjusts_sales_profit_and_reports_return_the_money_to_the_" /></p>
      </>}
      <div className="flex justify-end gap-3"><button type="button" disabled={saving} onClick={onClose} className="border rounded-xl px-4 py-2"><T k="common.cancel" /></button><button disabled={saving || !eligible || !reason.trim()} className="bg-rose-600 text-white rounded-xl px-4 py-2 disabled:opacity-50">{saving ? t("common.saving") : t("merchant.record_refund")}</button></div>
    </form>
  </div>;
}
