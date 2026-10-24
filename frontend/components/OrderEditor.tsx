'use client';

import { useLanguage, T } from '@/components/LanguageProvider';
import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { X } from 'lucide-react';

type Line = { id?: string; name: string; price: string; cost: string; quantity: string; discount: string };
export default function OrderEditor({ orderId, mode, onClose, onSaved }: { orderId: string; mode: 'edit' | 'delete'; onClose: () => void; onSaved: (message: string) => void }) {
  const { t, label: uiLabel, locale } = useLanguage();

  const [order, setOrder] = useState<any>(null);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [image, setImage] = useState<string | null>(null);
  const [imageChanged, setImageChanged] = useState(false);
  const [priceChanged, setPriceChanged] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState('');
  useEffect(() => {
    let active = true;
    fetchApi(`/orders/${encodeURIComponent(orderId)}`).then(data => {
      if (!active) return;
      setOrder(data); setDriverName(data.driver_name || ''); setDriverPhone(data.driver_phone || ''); setImage(data.image_url || null);
      setLines(data.items?.length ? data.items.map((item: any) => ({ id: item.id, name: item.product_name_snapshot, price: String(item.unit_selling_price), cost: item.unit_cost_price === null ? '' : String(item.unit_cost_price), quantity: String(item.quantity), discount: String(item.discount || 0) })) : [{ name: data.product_name, price: String(data.total_revenue ?? data.amount ?? 0), cost: data.total_cost === null ? '' : String(data.total_cost), quantity: '1', discount: '0' }]);
    }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [orderId]);
  const selectImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    setError('');
    if (file.size > 5 * 1024 * 1024) { setError(t("interactions.choose_a_photo_up_to_5_mb")); return; }
    if (file.type && !file.type.startsWith('image/')) { setError(t("interactions.choose_an_image_file")); return; }
    setProcessing(true); const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error(t("public.unable_to_open_this_photo_choose_a_jpeg_or_png_image"))); img.src = url; });
      const scale = Math.min(1, 800 / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(img.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const context = canvas.getContext('2d'); if (!context) throw new Error(t("public.unable_to_prepare_image"));
      context.drawImage(img, 0, 0, canvas.width, canvas.height); setImage(canvas.toDataURL('image/jpeg', 0.8)); setImageChanged(true);
    } catch (err: any) { setError(err.message); }
    finally { URL.revokeObjectURL(url); setProcessing(false); }
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!order || saving || processing) return;
    setError(''); setSaving(true);
    try {
      const body: any = { updatedAt: order.updated_at };
      if (mode === 'edit') {
        if (driverName !== (order.driver_name || '') || driverPhone !== (order.driver_phone || '')) { body.driverName = driverName; body.driverPhone = driverPhone; }
        if (imageChanged) body.imageUrl = image;
        if (priceChanged) body.items = lines.map(line => ({ id: line.id, unitSellingPrice: Number(line.price), unitCostPrice: line.cost === '' ? null : Number(line.cost), quantity: Number(line.quantity), discount: Number(line.discount) }));
      }
      await fetchApi(`/orders/${encodeURIComponent(orderId)}`, { method: mode === 'edit' ? 'PATCH' : 'DELETE', body: JSON.stringify(body) });
      onSaved(mode === 'edit' ? t("public.order_updated_successfully") : t("public.order_deleted_successfully"));
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };
  const updateLine = (index: number, field: keyof Line, value: string) => { setPriceChanged(true); setLines(prev => prev.map((line, i) => i === index ? { ...line, [field]: value } : line)); };
  const revenue = lines.reduce((sum, line) => sum + Math.round(Number(line.price) * 100) * Number(line.quantity) - Math.round(Number(line.discount) * 100), 0) / 100;
  const cost = lines.reduce((sum, line) => sum + Math.round(Number(line.cost) * 100) * Number(line.quantity), 0) / 100;
  const field = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';
  return <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
    <form onSubmit={save} role="dialog" aria-modal="true" aria-label={mode === 'edit' ? t("public.edit_order") : t("public.delete_order")} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 space-y-4">
      <div className="flex justify-between items-center"><h2 className="text-xl font-bold">{mode === 'edit' ? t("public.edit_order_2") : t("public.delete_order_2")} {order?.order_number}</h2><button type="button" aria-label={t("common.close")} disabled={saving || processing} onClick={onClose}><X /></button></div>
      {error && <p role="alert" className="p-3 bg-rose-50 text-rose-700 rounded-xl">{error}</p>}
      {!order ? <p>{error ? t("public.close_and_try_again_to_reload_this_order") : t("public.loading_order")}</p> : mode === 'delete' ? <>
        <p><T k="public.this_permanently_deletes" />{' '}{order.order_number}<T k="public.its_line_items_tracking_history_notifications_and_any_linked_delivery_it_will_be_remo" /></p>
        <label className="block text-sm font-semibold"><T k="public.type" />{' '}{order.order_number}{' '}<T k="public.to_confirm" /><input autoFocus value={confirm} onChange={e => setConfirm(e.target.value)} className={field} /></label>
      </> : <>
        <fieldset disabled={saving || processing} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm font-semibold"><T k="public.driver_name" /><input value={driverName} maxLength={150} onChange={e => setDriverName(e.target.value)} className={field} /></label>
            <label className="text-sm font-semibold"><T k="public.driver_phone" /><input type="tel" placeholder="07XXXXXXXX" value={driverPhone} onChange={e => setDriverPhone(e.target.value)} className={field} /></label>
          </div>
          <p className="text-xs text-slate-500"><T k="public.driver_corrections_are_saved_to_this_order_and_the_driver_directory_changing_the_phon" /></p>
          <fieldset disabled={order.payment_status === 'REFUNDED'} className="space-y-3">
            <legend className="font-bold"><T k="public.product_prices_tzs" /></legend>
            {order.payment_status === 'REFUNDED' && <p className="text-sm text-amber-700"><T k="public.prices_are_locked_because_this_order_has_been_refunded" /></p>}
            {lines.map((line, index) => <div key={line.id || index} className="p-3 border rounded-xl space-y-2"><p className="font-semibold">{line.name}</p><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <label className="text-xs"><T k="public.selling_unit" /><input required type="number" min="0" max="9999999999.99" step="0.01" value={line.price} onChange={e => updateLine(index, 'price', e.target.value)} className={field} /></label>
              <label className="text-xs"><T k="public.buying_unit" /><input type="number" min="0" max="9999999999.99" step="0.01" placeholder={t("common.not_recorded")} value={line.cost} onChange={e => updateLine(index, 'cost', e.target.value)} className={field} /></label>
              <label className="text-xs"><T k="public.quantity" /><input required type="number" min="1" max="100000" step="1" value={line.quantity} onChange={e => updateLine(index, 'quantity', e.target.value)} className={field} /></label>
              <label className="text-xs"><T k="public.discount_total" /><input required type="number" min="0" step="0.01" value={line.discount} onChange={e => updateLine(index, 'discount', e.target.value)} className={field} /></label>
            </div></div>)}
            <p className="text-sm font-bold"><T k="public.sales_tzs" />{' '}{revenue.toLocaleString(locale)}{' '}<T k="admin.gross_profit" />{' '}{lines.some(line => line.cost === '') ? t("public.enter_buying_costs_to_calculate") : `TZS ${(revenue - cost).toLocaleString(locale)}`}</p>
          </fieldset>
          <div className="space-y-2"><p className="font-bold"><T k="public.product_photo" /></p>{image && <img src={image} alt={t("public.order_product")} className="w-24 h-24 object-cover rounded-lg" />}<label className="block text-sm"><T k="public.choose_replacement_photo_up_to_5_mb" /><input type="file" accept="image/*" onChange={selectImage} className="block mt-1" /></label>{image && <button type="button" onClick={() => { setImage(null); setImageChanged(true); }} className="text-rose-700 text-sm"><T k="public.remove_photo" /></button>}</div>
        </fieldset>
      </>}
      <div className="flex justify-end gap-3"><button type="button" disabled={saving || processing} onClick={onClose} className="px-4 py-2 rounded-xl border"><T k="common.cancel" /></button><button disabled={!order || saving || processing || (mode === 'delete' && confirm !== order.order_number)} className={`px-4 py-2 rounded-xl text-white disabled:opacity-50 ${mode === 'delete' ? 'bg-rose-600' : 'bg-emerald-600'}`}>{processing ? t("merchant.preparing_photo") : saving ? t("common.saving") : mode === 'delete' ? t("public.delete_order_permanently") : t("public.save_changes")}</button></div>
    </form>
  </div>;
}
