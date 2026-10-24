'use client';


import { T, useLanguage } from '@/components/LanguageProvider';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import OrderRefundDialog from '@/components/OrderRefundDialog';
import {
  ArrowLeft, CheckCircle2, Clock, Truck, MapPin, XCircle, Users, Package,
  Phone, User, ShoppingBag, Send, AlertCircle, X, ChevronRight, Copy, Share2, Check, ExternalLink, MessageSquare, RotateCw
} from 'lucide-react';

interface OrderDetail {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  product_name: string;
  image_url?: string | null;
  amount: string | null;
  status: string;
  payment_status: string;
  driver_name: string | null;
  driver_phone: string | null;
  driver_id: string | null;
  tracking_url: string | null;
  driver_url: string | null;
  created_at: string;
  confirmed_at: string | null;
  assigned_at: string | null;
  out_for_delivery_at: string | null;
  arrived_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  merchant: { business_name: string; logo_url: string | null; brand_color: string | null };
  events: { id: string; event_type: string; actor_type: string; timestamp: string; metadata: string | null }[];
  notifications: { id: string; event_type: string; recipient_type: string; recipient_phone: string; message_body: string; status: string; sent_at: string | null; created_at: string; failure_reason?: string | null }[];
}

interface Driver { id: string; name: string; phone: string; status: string; }

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PENDING: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock },
  CONFIRMED: { label: 'Confirmed', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: CheckCircle2 },
  DRIVER_ASSIGNED: { label: 'Driver Assigned', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', icon: Users },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200', icon: Truck },
  ARRIVED: { label: 'Arrived', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: MapPin },
  DELIVERED: { label: 'Delivered', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200', icon: XCircle },
};

const EVENT_LABELS: Record<string, string> = {
  ORDER_CREATED: 'Order Created',
  ORDER_CONFIRMED: 'Order Confirmed',
  DRIVER_ASSIGNED: 'Driver Assigned',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DRIVER_ARRIVED: 'Driver Arrived',
  ORDER_DELIVERED: 'Order Delivered',
  ORDER_CANCELLED: 'Order Cancelled',
};

const QUICK_ACTIONS: Record<string, { label: string; status: string; color: string }[]> = {
  PENDING: [
    { label: 'Confirm Order', status: 'CONFIRMED', color: 'bg-blue-600 hover:bg-blue-700' },
    { label: 'Cancel Order', status: 'CANCELLED', color: 'bg-rose-600 hover:bg-rose-700' },
  ],
  CONFIRMED: [
    { label: 'Mark Out for Delivery', status: 'OUT_FOR_DELIVERY', color: 'bg-teal-600 hover:bg-teal-700' },
    { label: 'Cancel Order', status: 'CANCELLED', color: 'bg-rose-600 hover:bg-rose-700' },
  ],
  DRIVER_ASSIGNED: [
    { label: 'Mark Out for Delivery', status: 'OUT_FOR_DELIVERY', color: 'bg-teal-600 hover:bg-teal-700' },
    { label: 'Mark Arrived / Driver Nearby', status: 'ARRIVED', color: 'bg-purple-600 hover:bg-purple-700' },
    { label: 'Cancel Order', status: 'CANCELLED', color: 'bg-rose-600 hover:bg-rose-700' },
  ],
  OUT_FOR_DELIVERY: [
    { label: 'Mark Driver Arrived', status: 'ARRIVED', color: 'bg-purple-600 hover:bg-purple-700' },
    { label: 'Mark Order Delivered', status: 'DELIVERED', color: 'bg-emerald-600 hover:bg-emerald-700' },
    { label: 'Cancel Order', status: 'CANCELLED', color: 'bg-rose-600 hover:bg-rose-700' },
  ],
  ARRIVED: [
    { label: 'Mark Order Delivered', status: 'DELIVERED', color: 'bg-emerald-600 hover:bg-emerald-700' },
    { label: 'Cancel Order', status: 'CANCELLED', color: 'bg-rose-600 hover:bg-rose-700' },
  ],
};

export default function OrderDetailPage() {
  const { t, label: uiLabel, locale } = useLanguage();

  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [showRefund, setShowRefund] = useState(false);
  const [showAssignDriver, setShowAssignDriver] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleRetryNotification = async (notificationId: string) => {
    if (!order || retryingId) return;
    setRetryingId(notificationId);
    setError(null);
    try {
      const res: any = await fetchApi(`/orders/${order.id}/notifications/${notificationId}/retry`, {
        method: 'POST',
      });
      setSuccess(res?.message || 'SMS sent successfully!');
      setOrder(prev => {
        if (!prev) return null;
        return {
          ...prev,
          notifications: prev.notifications.map(n => n.id === notificationId ? { ...n, ...(res?.notification || {}), status: 'SENT' } : n)
        };
      });
    } catch (err: any) {
      setError(err.message || 'Failed to resend SMS');
    } finally {
      setRetryingId(null);
    }
  };

  const loadOrder = useCallback(async () => {
    try {
      const data = await fetchApi(`/orders/${id}`);
      setOrder(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  const handleStatusChange = async (newStatus: string) => {
    setActionLoading(true);
    setError(null);
    try {
      await fetchApi(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
      setSuccess(t("interactions.status_updated_to_value0_sms_sent_automatically", { value0: uiLabel(String(STATUS_CONFIG[newStatus]?.label ?? '')) }));
      loadOrder();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignDriver = async (driverId: string) => {
    setActionLoading(true);
    try {
      await fetchApi(`/orders/${id}/assign-driver`, { method: 'POST', body: JSON.stringify({ driverId }) });
      setSuccess(t("interactions.driver_assigned_customer_driver_sms_sent_automatically"));
      setShowAssignDriver(false);
      loadOrder();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const loadDrivers = async () => {
    try {
      const data = await fetchApi('/drivers');
      setDrivers(Array.isArray(data) ? data : []);
    } catch {}
  };

  const handleCopyLink = () => {
    if (!order?.tracking_url) return;
    navigator.clipboard.writeText(order.tracking_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleShareWhatsApp = () => {
    if (!order?.tracking_url) return;
    const merchantName = order.merchant.business_name || 'LUMO';
    const text = t('public.share_order_message', { order: order.order_number, merchant: merchantName, link: order.tracking_url });
    const cleanPhone = order.customer_phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <div className="w-8 h-8 rounded-xl bg-teal-100 animate-pulse" />
    </div>
  );

  if (!order) return (
    <div className="p-12 text-center">
      <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
      <p className="text-sm font-bold text-slate-600"><T k="merchant.order_not_found" /></p>
    </div>
  );

  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusCfg.icon;
  const actions = QUICK_ACTIONS[order.status] || [];
  const showDriverAssignment = (order.status === 'CONFIRMED' || order.status === 'PENDING') && !order.driver_id;

  const timelineSteps = ['ORDER_CREATED', 'ORDER_CONFIRMED', 'DRIVER_ASSIGNED', 'OUT_FOR_DELIVERY', 'DRIVER_ARRIVED', 'ORDER_DELIVERED'];
  const passedEvents = order.events.map(e => e.event_type);

  return (
    <div className="space-y-5">
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {showRefund && <OrderRefundDialog orderId={order.id} onClose={() => setShowRefund(false)} onSaved={() => { setShowRefund(false); setSuccess(t("interactions.refund_recorded_sales_and_profit_have_been_updated")); loadOrder(); }} />}
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/orders')} className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-black text-slate-900 tracking-tight font-mono">{order.order_number}</h1>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold mt-1 ${statusCfg.bg} ${statusCfg.color}`}>
            <StatusIcon className="w-3 h-3" />
            {uiLabel(statusCfg.label)}
          </span>
          {order.payment_status === 'REFUNDED' && <span className="ml-2 text-xs font-bold text-rose-700"><T k="common.refunded" /></span>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column — Order Info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Share Tracking Link Suite */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider"><T k="merchant.customer_tracking_link" /></h3>
              <a href={order.tracking_url || '#'} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-teal-700 hover:underline flex items-center gap-1">
                <span><T k="merchant.preview" /></span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleShareWhatsApp}
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <MessageSquare className="w-4 h-4 fill-white" />
                <span><T k="merchant.share_whatsapp" /></span>
              </button>
              <button
                onClick={handleCopyLink}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? t("merchant.copied_link") : t("merchant.copy_link")}</span>
              </button>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3"><T k="common.customer" /></h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center">
                <User className="w-4 h-4 text-teal-700" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{order.customer_name}</p>
                <p className="text-xs text-slate-500 font-medium">{order.customer_phone}</p>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
              <p className="text-xs font-medium text-slate-600">{order.delivery_address}</p>
            </div>
          </div>

          {/* Product Info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider"><T k="common.product" /></h3>
            <div className="flex items-center gap-3">
              {order.image_url ? (
                <img
                  src={order.image_url}
                  alt={order.product_name}
                  className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-sm shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-indigo-700" />
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-slate-900">{order.product_name}</p>
                {order.amount && <p className="text-xs font-semibold text-slate-500">TZS {Number(order.amount).toLocaleString(locale)}</p>}
              </div>
            </div>
          </div>

          {/* Driver Info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3"><T k="common.driver" /></h3>
            {order.driver_name ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <Truck className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{order.driver_name}</p>
                  <p className="text-xs text-slate-500 font-medium">{order.driver_phone}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-slate-400 font-semibold mb-2"><T k="merchant.no_driver_assigned" /></p>
                {showDriverAssignment && (
                  <button
                    onClick={() => { setShowAssignDriver(true); loadDrivers(); }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all"
                  >{' '}<T k="merchant.assign_driver" />{' '}</button>
                )}
              </div>
            )}
          </div>

          {/* Notification History */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3"><T k="merchant.notification_history" /></h3>
            {order.notifications.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium text-center py-4"><T k="merchant.no_notifications_sent_yet" /></p>
            ) : (
              <div className="space-y-2">
                {order.notifications.map(n => (
                  <div key={n.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{uiLabel(EVENT_LABELS[n.event_type] || n.event_type)} → {uiLabel(n.recipient_type)}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${n.status === 'SENT' || n.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' : n.status === 'FAILED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                          {uiLabel(n.status)}
                        </span>
                        {n.status === 'FAILED' && (
                          <button
                            onClick={() => handleRetryNotification(n.id)}
                            disabled={retryingId === n.id}
                            className="px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-[10px] font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                            title="Retry sending SMS"
                          >
                            <RotateCw className={`w-3 h-3 ${retryingId === n.id ? 'animate-spin' : ''}`} />
                            <span>Retry</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{n.message_body}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>{n.recipient_phone}</span>
                      <span>{n.sent_at ? new Date(n.sent_at).toLocaleString(locale) : n.status === 'FAILED' ? 'Failed' : t("admin.queued")}</span>
                    </div>
                    {n.failure_reason && (
                      <div className="text-[10px] text-rose-700 bg-rose-50/80 border border-rose-200/60 p-2 rounded-lg flex items-start gap-1.5 leading-snug">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <span>{n.failure_reason}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column — Actions & Timeline */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider"><T k="common.actions" /></h3>
            <div className="space-y-2">
              {/* Always allow assigning/changing driver if not delivered/cancelled */}
              {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                <button
                  onClick={() => { setShowAssignDriver(true); loadDrivers(); }}
                  disabled={actionLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Users className="w-4 h-4" />
                  <span>{order.driver_id ? t("merchant.3_change_assigned_driver") : t("merchant.3_assign_driver")}</span>
                </button>
              )}

              {order.status === 'DELIVERED' && order.payment_status !== 'REFUNDED' && <button onClick={() => setShowRefund(true)} className="w-full py-2.5 px-4 rounded-xl bg-rose-600 text-white font-bold text-xs"><T k="common.record_full_refund" /></button>}
              {order.events.filter(event => event.event_type === 'ORDER_REFUNDED').map(event => { let detail: any = {}; try { detail = JSON.parse(event.metadata || '{}'); } catch {} return <div key={event.id} className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs space-y-1"><p className="font-bold"><T k="merchant.refund_recorded" />{' '}{new Date(event.timestamp).toLocaleString(locale)}</p><p>{detail.reason}</p><p>TZS {Number(detail.amount || 0).toLocaleString(locale)} ? {detail.restocked ? t("common.returned_to_stock") : t("merchant.buying_cost_retained")}</p></div>; })}
              {/* Status specific transition buttons */}
              {actions.map(a => (
                <button
                  key={a.status}
                  onClick={() => handleStatusChange(a.status)}
                  disabled={actionLoading}
                  className={`w-full py-2.5 px-4 rounded-xl text-white font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${a.color}`}
                >
                  <span>{uiLabel(a.label)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3"><T k="merchant.order_timeline" /></h3>
            <div className="space-y-3">
              {timelineSteps.map((step, idx) => {
                const passed = passedEvents.includes(step);
                const isCurrent = !passed && (idx === 0 || passedEvents.includes(timelineSteps[idx - 1]));
                return (
                  <div key={step} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${passed ? 'bg-emerald-600 text-white' : isCurrent ? 'bg-amber-100 border-2 border-amber-400 text-amber-600' : 'bg-slate-100 border border-slate-200 text-slate-400'}`}>
                      {passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="text-[8px] font-bold">{idx + 1}</span>}
                    </div>
                    <span className={`text-xs font-bold ${passed ? 'text-slate-800' : isCurrent ? 'text-amber-700' : 'text-slate-400'}`}>
                      {uiLabel(EVENT_LABELS[step] || step)}
                    </span>
                  </div>
                );
              })}
              {order.status === 'CANCELLED' && (
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
                    <XCircle className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-rose-700"><T k="merchant.order_cancelled" /></span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Assign Driver Modal */}
      {showAssignDriver && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900"><T k="merchant.assign_driver" /></h2>
              <button onClick={() => setShowAssignDriver(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            {drivers.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4"><T k="merchant.no_drivers_found_create_a_driver_first" /></p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {drivers.map(d => (
                  <button
                    key={d.id}
                    onClick={() => handleAssignDriver(d.id)}
                    disabled={actionLoading}
                    className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center justify-between disabled:opacity-50"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">{d.name}</p>
                      <p className="text-[10px] text-slate-500">{d.phone}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${d.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {d.status === 'AVAILABLE' ? t("merchant.available") : t("merchant.busy")}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
