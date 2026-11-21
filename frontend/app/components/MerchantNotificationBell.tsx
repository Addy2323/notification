'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, ExternalLink, Package, Clock } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export function MerchantNotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetchApi('/merchant-notifications?limit=10');
      const d = res?.data || res;
      if (d) {
        setNotifications(d.notifications || []);
        setUnreadCount(Number(d.unreadCount || 0));
      }
    } catch {
      // Non-fatal background polling
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 20000);
    return () => clearInterval(timer);
  }, [loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenNotification = async (notif: any) => {
    if (!notif.read_at) {
      try {
        await fetchApi(`/merchant-notifications/${notif.id}/read`, { method: 'PATCH' });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // Non-fatal
      }
    }
    setOpen(false);
    const targetUrl = notif.action_url || (notif.order_id ? `/dashboard/orders/${notif.order_id}` : '/dashboard/orders');
    router.push(targetUrl);
  };

  const handleMarkAllRead = async () => {
    try {
      await fetchApi('/merchant-notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      // Non-fatal
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) loadNotifications();
        }}
        aria-label="Merchant notifications"
        className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition active:scale-95"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF5500] text-white text-[10px] font-black flex items-center justify-center shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-900">Order Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#FF5500]/10 text-[#FF5500] text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-8 px-4 text-center space-y-1.5">
                <Bell className="w-7 h-7 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">No order notifications yet</p>
                <p className="text-[11px] text-slate-400">New customer orders will appear here automatically.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.read_at;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleOpenNotification(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition flex items-start gap-3 ${
                      isUnread ? 'bg-orange-50/40' : 'bg-white'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isUnread ? 'bg-[#FF5500] text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Package className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-extrabold text-slate-900 truncate">{n.title}</p>
                        {isUnread && <span className="w-2 h-2 rounded-full bg-[#FF5500] shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2">{n.message}</p>
                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                        <span className="font-bold text-[#FF5500] inline-flex items-center gap-0.5">
                          View Order <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-center">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-bold text-[#0F172A] hover:text-[#FF5500]"
            >
              View All Notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

