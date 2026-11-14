'use client';


import { T, useLanguage } from '@/components/LanguageProvider';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchApi, API_BASE } from '@/lib/api';
import OrderRefundDialog from '@/components/OrderRefundDialog';
import {
  ArrowLeft, CheckCircle2, Clock, Truck, MapPin, XCircle, Users, Package,
  Phone, User, ShoppingBag, Send, AlertCircle, X, ChevronRight, Copy, Share2, Check, ExternalLink, MessageSquare, RotateCw,
  FileText, Download, Ban, CreditCard, Eye
} from 'lucide-react';
import { getTransportMeta } from '@/lib/transport';

interface ConfirmationReceiptSummary {
  id: string;
  receipt_number: string;
  status: string;
  receipt_status_label?: string;
  sms_status: string;
  sms_status_label?: string;
  generated_at: string | null;
  sms_sent_at: string | null;
  sms_delivered_at: string | null;
  sms_failed_at: string | null;
  sms_failure_reason: string | null;
  sms_retry_count: number;
  sms_retry_history: Array<{
    attempt: number;
    type: string;
    timestamp: string;
    status: string;
    error?: string | null;
    triggeredBy?: string | null;
  }>;
  revoked_at: string | null;
  expires_at: string | null;
  public_token?: string | null;
  public_url?: string | null;
}

interface OrderDetail {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  product_name: string;
  image_url?: string | null;
  amount: string | null;
  delivery_fee?: string | number | null;
  discount_amount?: string | number | null;
  tax_amount?: string | number | null;
  amount_paid?: string | number | null;
  currency?: string | null;
  transaction_reference?: string | null;
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
  completed_at?: string | null;
  cancelled_at: string | null;
  vehicle_info?: string | null;
  transport_type?: string | null;
  confirmation_receipt?: ConfirmationReceiptSummary | null;
  merchant: { business_name: string; logo_url: string | null; brand_color: string | null };
  events: { id: string; event_type: string; actor_type: string; timestamp: string; metadata: string | null }[];
  notifications: { id: string; event_type: string; recipient_type: string; recipient_phone: string; message_body: string; status: string; sent_at: string | null; created_at: string; failure_reason?: string | null }[];
}

interface Driver { id: string; name: string; phone: string; status: string; vehicle_info?: string; }

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PENDING: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock },
  CONFIRMED: { label: 'Confirmed', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: CheckCircle2 },
  DRIVER_ASSIGNED: { label: 'Driver Assigned', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', icon: Users },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200', icon: Truck },
  ARRIVED: { label: 'Arrived', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: MapPin },
  DELIVERED: { label: 'Delivered', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  COMPLETED: { label: 'Completed', color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200', icon: XCircle },
};

const EVENT_LABELS: Record<string, string> = {
  ORDER_CREATED: 'Order Created',
  ORDER_CONFIRMED: 'Order Confirmed',
  DRIVER_ASSIGNED: 'Driver Assigned',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DRIVER_ARRIVED: 'Driver Arrived',
  ORDER_DELIVERED: 'Order Delivered',
  ORDER_COMPLETED: 'Order Completed',
  ORDER_PAYMENT_UPDATED: 'Payment Updated',
  ORDER_CANCELLED: 'Order Cancelled',
};

const QUICK_ACTIONS: Record<string, { label: string; status: string; color: string }[]> = {
  PENDING: [
    { label: 'Confirm Order', status: 'CONFIRMED', color: 'bg-blue-600 hover:bg-blue-700' },
    { label: 'Complete Order', status: 'COMPLETED', color: 'bg-teal-700 hover:bg-teal-800' },
    { label: 'Cancel Order', status: 'CANCELLED', color: 'bg-rose-600 hover:bg-rose-700' },
  ],
  CONFIRMED: [
    { label: 'Mark Out for Delivery', status: 'OUT_FOR_DELIVERY', color: 'bg-teal-600 hover:bg-teal-700' },
    { label: 'Complete Order', status: 'COMPLETED', color: 'bg-teal-700 hover:bg-teal-800' },
    { label: 'Cancel Order', status: 'CANCELLED', color: 'bg-rose-600 hover:bg-rose-700' },
  ],
  DRIVER_ASSIGNED: [
    { label: 'Mark Out for Delivery', status: 'OUT_FOR_DELIVERY', color: 'bg-teal-600 hover:bg-teal-700' },
    { label: 'Mark Arrived / Driver Nearby', status: 'ARRIVED', color: 'bg-purple-600 hover:bg-purple-700' },
    { label: 'Complete Order', status: 'COMPLETED', color: 'bg-teal-700 hover:bg-teal-800' },
    { label: 'Cancel Order', status: 'CANCELLED', color: 'bg-rose-600 hover:bg-rose-700' },
  ],
  OUT_FOR_DELIVERY: [
    { label: 'Mark Driver Arrived', status: 'ARRIVED', color: 'bg-purple-600 hover:bg-purple-700' },
    { label: 'Mark Order Delivered', status: 'DELIVERED', color: 'bg-emerald-600 hover:bg-emerald-700' },
    { label: 'Complete Order', status: 'COMPLETED', color: 'bg-teal-700 hover:bg-teal-800' },
    { label: 'Cancel Order', status: 'CANCELLED', color: 'bg-rose-600 hover:bg-rose-700' },
  ],
  ARRIVED: [
    { label: 'Mark Order Delivered', status: 'DELIVERED', color: 'bg-emerald-600 hover:bg-emerald-700' },
    { label: 'Complete Order', status: 'COMPLETED', color: 'bg-teal-700 hover:bg-teal-800' },
    { label: 'Cancel Order', status: 'CANCELLED', color: 'bg-rose-600 hover:bg-rose-700' },
  ],
  DELIVERED: [
    { label: 'Complete Order', status: 'COMPLETED', color: 'bg-teal-700 hover:bg-teal-800' },
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
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    paymentStatus: 'UNPAID',
    amountPaid: '',
    transactionReference: '',
  });

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
      setPaymentForm({
        paymentStatus: data.payment_status || 'UNPAID',
        amountPaid: data.amount_paid != null ? String(data.amount_paid) : '',
        transactionReference: data.transaction_reference || '',
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  const handleViewOrDownloadReceiptPdf = async (inline: boolean) => {
    if (!order || receiptBusy) return;
    setReceiptBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/orders/${order.id}/receipt/pdf${inline ? '?inline=1' : ''}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const errPayload = await res.json().catch(() => null);
        throw new Error(errPayload?.error?.message || 'Failed to load confirmation receipt PDF');
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      if (inline) {
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
      } else {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `Confirmation-Receipt-${order.confirmation_receipt?.receipt_number || order.order_number}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err: any) {
      setError(err.message || 'Failed to open PDF receipt');
    } finally {
      setReceiptBusy(false);
    }
  };

  const handleGenerateReceipt = async () => {
    if (!order || receiptBusy) return;
    setReceiptBusy(true);
    setError(null);
    try {
      await fetchApi(`/orders/${order.id}/receipt/generate`, { method: 'POST' });
      setSuccess('Confirmation receipt generated and SMS workflow processed.');
      await loadOrder();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to generate confirmation receipt');
    } finally {
      setReceiptBusy(false);
    }
  };

  const handleResendReceiptSms = async () => {
    if (!order || receiptBusy) return;
    setReceiptBusy(true);
    setError(null);
    try {
      const res = await fetchApi(`/orders/${order.id}/receipt/resend-sms`, { method: 'POST' });
      if (res?.smsSent) {
        setSuccess(res.message || 'Confirmation receipt SMS resent successfully.');
      } else {
        setError(res?.message || 'SMS provider could not send the confirmation SMS.');
      }
      await loadOrder();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to resend confirmation receipt SMS');
    } finally {
      setReceiptBusy(false);
    }
  };

  const handleRevokeReceipt = async () => {
    if (!order || receiptBusy) return;
    if (!window.confirm('Revoke this public confirmation receipt link? Customers will no longer be able to view or download via SMS link.')) {
      return;
    }
    setReceiptBusy(true);
    setError(null);
    try {
      await fetchApi(`/orders/${order.id}/receipt/revoke`, { method: 'POST', body: JSON.stringify({}) });
      setSuccess('Confirmation receipt link revoked.');
      await loadOrder();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to revoke confirmation receipt');
    } finally {
      setReceiptBusy(false);
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || paymentBusy) return;
    setPaymentBusy(true);
    setError(null);
    try {
      await fetchApi(`/orders/${order.id}/payment`, {
        method: 'PATCH',
        body: JSON.stringify({
          paymentStatus: paymentForm.paymentStatus,
          amountPaid: paymentForm.amountPaid === '' ? undefined : Number(paymentForm.amountPaid),
          transactionReference: paymentForm.transactionReference.trim() || null,
        }),
      });
      setSuccess('Payment status updated successfully.');
      await loadOrder();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update payment status');
    } finally {
      setPaymentBusy(false);
    }
  };

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

  const timelineSteps = ['ORDER_CREATED', 'ORDER_CONFIRMED', 'DRIVER_ASSIGNED', 'OUT_FOR_DELIVERY', 'DRIVER_ARRIVED', 'ORDER_DELIVERED', 'ORDER_COMPLETED'];
  const passedEvents = order.events.map(e => e.event_type);

  const cr = order.confirmation_receipt;
  const orderTotalNum = Number(order.amount || 0);
  const amountPaidNum = Number(order.amount_paid || 0);
  const outstandingNum = order.payment_status === 'REFUNDED' ? 0 : Math.max(0, orderTotalNum - amountPaidNum);
  const receiptStatusLabel = cr
    ? cr.status === 'REVOKED'
      ? 'RECEIPT REVOKED'
      : cr.status === 'FAILED'
      ? 'RECEIPT FAILED'
      : cr.status === 'GENERATED'
      ? 'RECEIPT GENERATED'
      : 'RECEIPT PENDING'
    : 'NOT GENERATED';
  const smsStatusLabel = cr
    ? cr.sms_status === 'SMS_DELIVERED'
      ? 'SMS DELIVERED'
      : cr.sms_status === 'SMS_SENT'
      ? 'SMS SENT'
      : cr.sms_status === 'SMS_FAILED'
      ? 'SMS FAILED'
      : 'SMS PENDING'
    : 'SMS PENDING';

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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider"><T k="common.driver" /></h3>
              {order.driver_name && (
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${getTransportMeta(order.vehicle_info).bg}`}>
                  <span>{getTransportMeta(order.vehicle_info).icon}</span>
                  <span>{getTransportMeta(order.vehicle_info).label}</span>
                </span>
              )}
            </div>
            {order.driver_name ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-xl">
                  {getTransportMeta(order.vehicle_info).icon}
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

          {/* Confirmation Receipt & SMS Notification Card */}
          {(order.status === 'COMPLETED' || order.status === 'DELIVERED' || cr) && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#FF5500]" />
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Confirmation Receipt
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      cr?.status === 'GENERATED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : cr?.status === 'REVOKED'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : cr?.status === 'FAILED'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {receiptStatusLabel}
                  </span>
                  {cr && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        cr.sms_status === 'SMS_DELIVERED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : cr.sms_status === 'SMS_SENT'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : cr.sms_status === 'SMS_FAILED'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {smsStatusLabel}
                    </span>
                  )}
                </div>
              </div>

              {cr ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Receipt Number</span>
                      <span className="font-mono font-bold text-slate-900">{cr.receipt_number}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Receipt Generated</span>
                      <span className="font-medium text-slate-700">
                        {cr.generated_at ? new Date(cr.generated_at).toLocaleString(locale) : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">SMS Sent</span>
                      <span className="font-medium text-slate-700">
                        {cr.sms_sent_at ? new Date(cr.sms_sent_at).toLocaleString(locale) : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">SMS Delivered</span>
                      <span className="font-medium text-slate-700">
                        {cr.sms_status === 'SMS_DELIVERED' && cr.sms_delivered_at
                          ? new Date(cr.sms_delivered_at).toLocaleString(locale)
                          : 'Awaiting confirmation'}
                      </span>
                    </div>
                  </div>

                  {cr.sms_status === 'SMS_FAILED' && cr.sms_failure_reason && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{cr.sms_failure_reason}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {cr.public_token && cr.status !== 'REVOKED' ? (
                      <a
                        href={`/receipt/${cr.public_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#FF5500]" />
                        <span>View Confirmation Receipt</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleViewOrDownloadReceiptPdf(true)}
                        disabled={receiptBusy}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#FF5500]" />
                        <span>View Confirmation Receipt</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleViewOrDownloadReceiptPdf(false)}
                      disabled={receiptBusy}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>

                    {cr.status !== 'REVOKED' && (
                      <button
                        type="button"
                        onClick={handleResendReceiptSms}
                        disabled={receiptBusy}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{receiptBusy ? 'Sending...' : 'Resend Confirmation Receipt SMS'}</span>
                      </button>
                    )}

                    {cr.status !== 'REVOKED' && (
                      <button
                        type="button"
                        onClick={handleRevokeReceipt}
                        disabled={receiptBusy}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-colors disabled:opacity-50 ml-auto"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Revoke Link</span>
                      </button>
                    )}
                  </div>

                  {Array.isArray(cr.sms_retry_history) && cr.sms_retry_history.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Receipt SMS Attempt History ({cr.sms_retry_history.length})
                      </span>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {cr.sms_retry_history.map((entry, idx) => (
                          <div
                            key={`${entry.attempt}-${idx}`}
                            className="flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1.5 rounded-lg"
                          >
                            <span className="font-medium text-slate-700">
                              #{entry.attempt} {entry.type.replace(/_/g, ' ')}
                              {entry.triggeredBy ? ` (${entry.triggeredBy})` : ''}
                            </span>
                            <span className="text-slate-400">
                              {new Date(entry.timestamp).toLocaleString(locale)} —{' '}
                              <strong
                                className={
                                  entry.status === 'SMS_FAILED'
                                    ? 'text-rose-600'
                                    : entry.status === 'SMS_DELIVERED'
                                    ? 'text-emerald-600'
                                    : 'text-blue-600'
                                }
                              >
                                {entry.status.replace(/_/g, ' ')}
                              </strong>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <p className="text-xs text-slate-600">
                    No confirmation receipt has been generated for this order yet.
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateReceipt}
                    disabled={receiptBusy}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-50"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#FF5500]" />
                    <span>{receiptBusy ? 'Generating...' : 'Generate Receipt & Send SMS'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

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

        {/* Right Column — Payment, Actions & Timeline */}
        <div className="space-y-4">
          {/* Payment Status & Settlement Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#FF5500]" />
                <span>Payment Status</span>
              </h3>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  order.payment_status === 'PAID'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : order.payment_status === 'PARTIALLY_PAID' || order.payment_status === 'PARTIALLY PAID'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : order.payment_status === 'REFUNDED'
                    ? 'bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {(order.payment_status || 'UNPAID').replace(/_/g, ' ')}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Order Total</span>
                <span className="font-mono font-bold text-slate-900">
                  {order.currency || 'TZS'} {orderTotalNum.toLocaleString(locale)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid</span>
                <span className="font-mono font-bold text-emerald-700">
                  {order.currency || 'TZS'} {amountPaidNum.toLocaleString(locale)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Outstanding</span>
                <span className={`font-mono font-bold ${outstandingNum > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                  {order.currency || 'TZS'} {outstandingNum.toLocaleString(locale)}
                </span>
              </div>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-2.5 pt-1">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Update Payment State
                </label>
                <select
                  value={paymentForm.paymentStatus}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentStatus: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                >
                  <option value="UNPAID">UNPAID</option>
                  <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
                  <option value="PAID">PAID</option>
                  <option value="REFUNDED">REFUNDED</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Amount Paid
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={paymentForm.amountPaid}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, amountPaid: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Transaction Ref
                  </label>
                  <input
                    type="text"
                    value={paymentForm.transactionReference}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, transactionReference: e.target.value }))}
                    placeholder="Optional ref"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={paymentBusy}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors disabled:opacity-50"
              >
                {paymentBusy ? 'Saving...' : 'Save Payment Details'}
              </button>
            </form>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider"><T k="common.actions" /></h3>
            <div className="space-y-2">
              {/* Always allow assigning/changing driver if not delivered/completed/cancelled */}
              {order.status !== 'DELIVERED' && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                <button
                  onClick={() => { setShowAssignDriver(true); loadDrivers(); }}
                  disabled={actionLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Users className="w-4 h-4" />
                  <span>{order.driver_id ? t("merchant.3_change_assigned_driver") : t("merchant.3_assign_driver")}</span>
                </button>
              )}

              {(order.status === 'DELIVERED' || order.status === 'COMPLETED') && order.payment_status !== 'REFUNDED' && <button onClick={() => setShowRefund(true)} className="w-full py-2.5 px-4 rounded-xl bg-rose-600 text-white font-bold text-xs"><T k="common.record_full_refund" /></button>}
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
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{getTransportMeta(d.vehicle_info).icon}</span>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{d.name}</p>
                        <p className="text-[10px] text-slate-500">{d.phone}</p>
                      </div>
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
