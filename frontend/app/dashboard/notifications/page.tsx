'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, RefreshCw, CheckCircle2, Clock, AlertCircle, MessageSquare, Smartphone, ShieldCheck, Package, CheckCheck, ExternalLink } from 'lucide-react';
import { useLanguage, T } from '@/components/LanguageProvider';
import { fetchApi } from '@/lib/api';

interface NotificationItem {
  id: string;
  order_number: string;
  recipient_phone: string;
  recipient_type: string;
  event_type: string;
  channel: string;
  status: string;
  message_body: string;
  created_at: string;
}

export default function MerchantNotificationsPage() {
  const { t, label: uiLabel, locale } = useLanguage();
  const isSwahili = locale === 'sw';
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [orderAlerts, setOrderAlerts] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    total: 0,
    delivered: 0,
    queued: 0,
    failed: 0,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      // Load merchant new-order alerts and recent order SMS notifications
      const [res, alertsRes] = await Promise.all([
        fetchApi('/orders?limit=50'),
        fetchApi('/merchant-notifications?limit=50').catch(() => null),
      ]);
      const alertsData = alertsRes?.data || alertsRes;
      if (alertsData) {
        setOrderAlerts(alertsData.notifications || []);
        setUnreadCount(Number(alertsData.unreadCount || 0));
      }
      const orders = res?.orders || [];
      const notifs: NotificationItem[] = [];

      for (const ord of orders) {
        if (Array.isArray(ord.notifications)) {
          for (const n of ord.notifications) {
            notifs.push({
              id: n.id,
              order_number: ord.order_number,
              recipient_phone: n.recipient_phone,
              recipient_type: n.recipient_type,
              event_type: n.event_type,
              channel: n.channel || 'SMS',
              status: n.status || 'DELIVERED',
              message_body: n.message_body,
              created_at: n.created_at || ord.created_at,
            });
          }
        }
      }

      setNotifications(notifs);

      const total = notifs.length;
      const delivered = notifs.filter((n) => n.status === 'DELIVERED' || n.status === 'SENT').length;
      const queued = notifs.filter((n) => n.status === 'QUEUED').length;
      const failed = notifs.filter((n) => n.status === 'FAILED').length;

      setMetrics({ total, delivered, queued, failed });
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await fetchApi(`/merchant-notifications/${id}/read`, { method: 'PATCH' });
      setOrderAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, read_at: a.read_at || new Date().toISOString() } : a))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Non-fatal
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetchApi('/merchant-notifications/read-all', { method: 'POST' });
      setOrderAlerts((prev) => prev.map((a) => ({ ...a, read_at: a.read_at || new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      // Non-fatal
    }
  };

  const handleRetrySms = async (id: string) => {
    setRetryingId(id);
    try {
      await fetchApi(`/merchant-notifications/${id}/retry-sms`, { method: 'POST' });
      await loadData();
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#FF5500]" />
            <T k="common.notifications" />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            <T k="admin.track_sms_delivery_rates_queue_depth_recipient_status_and_provider_response_times" />
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all shadow-sm active:scale-95 disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-500' : ''}`} />
          <T k="common.refresh" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider"><T k="admin.total_sms_sent" /></span>
            <Smartphone className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">{metrics.total}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider"><T k="admin.delivered_sms" /></span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 font-mono">{metrics.delivered}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider"><T k="admin.queued_sms" /></span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-600 font-mono">{metrics.queued}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider"><T k="admin.failed_sms" /></span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-600 font-mono">{metrics.failed}</p>
        </div>
      </div>

      {/* Merchant New Order Alerts */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              New Order Alerts
            </h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#FF5500] text-white text-[10px] font-bold">
                {unreadCount} Unread
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all as read
            </button>
          )}
        </div>

        {orderAlerts.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            No new storefront order alerts yet.
          </p>
        ) : (
          <div className="space-y-2">
            {orderAlerts.map((alert) => {
              const isUnread = !alert.read_at;
              return (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isUnread ? 'border-orange-200 bg-orange-50/50' : 'border-slate-100 bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isUnread ? 'bg-[#FF5500] text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      <Package className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-900">{alert.title}</span>
                        {isUnread && (
                          <span className="px-1.5 py-0.5 rounded-full bg-[#FF5500] text-white text-[9px] font-bold">
                            NEW
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            alert.sms_status === 'SENT' || alert.sms_status === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-700'
                              : alert.sms_status === 'FAILED'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          SMS: {alert.sms_status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700">{alert.message}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {new Date(alert.created_at).toLocaleString()} • Attempts: {alert.delivery_attempts || 0}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {alert.sms_status === 'FAILED' && (
                      <button
                        type="button"
                        disabled={retryingId === alert.id}
                        onClick={() => handleRetrySms(alert.id)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold disabled:opacity-50"
                      >
                        {retryingId === alert.id ? 'Retrying...' : 'Retry SMS'}
                      </button>
                    )}
                    {isUnread && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(alert.id)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Mark Read
                      </button>
                    )}
                    <Link
                      href={alert.action_url || `/dashboard/orders/${alert.order_id}`}
                      onClick={() => {
                        if (isUnread) handleMarkRead(alert.id);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0F172A] text-white text-xs font-bold hover:bg-slate-800"
                    >
                      View Order
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Feed List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            <T k="merchant.notification_history" />
          </h2>
          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <T k="merchant.vodacom_tigo_airtel_halotel_verified" />
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-orange-500" />
            <T k="merchant.loading_workspace" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            <MessageSquare className="w-6 h-6 mx-auto mb-2 text-slate-300" />
            <T k="merchant.no_notifications_sent_yet" />
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-extrabold text-slate-900">#{item.order_number}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 uppercase">
                      {item.channel}
                    </span>
                    {item.event_type === 'RECEIPT_CONFIRMATION_REQUEST' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {isSwahili ? 'Uthibitisho Kiotomatiki' : 'Receipt Confirmation'}
                      </span>
                    )}
                    {item.event_type === 'RECEIPT_CONFIRMATION_RESENT' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        {isSwahili ? 'Uthibitisho Uliorudiwa' : 'Resent Confirmation'}
                      </span>
                    )}
                    {item.event_type === 'RECEIPT_CONFIRMATION_THANK_YOU' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                        {isSwahili ? 'Shukrani (YES)' : 'Thank-You (YES)'}
                      </span>
                    )}
                    {item.event_type === 'RECEIPT_CONFIRMATION_INVESTIGATION' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                        {isSwahili ? 'Uchunguzi (NO)' : 'Investigation (NO)'}
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-slate-500">
                      → {uiLabel(item.recipient_type)} ({item.recipient_phone})
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">{item.message_body}</p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.status === 'DELIVERED' || item.status === 'SENT'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.status === 'FAILED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {uiLabel(item.status)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(item.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
