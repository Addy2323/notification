'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Generate a random ID for visitor/session fingerprinting.
 */
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Get or create a persistent visitor ID (stored in localStorage).
 */
function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem('lumo_visitor_id');
    if (!id) {
      id = 'v_' + generateId();
      localStorage.setItem('lumo_visitor_id', id);
    }
    return id;
  } catch {
    return 'v_' + generateId();
  }
}

/**
 * Get or create a session ID (stored in sessionStorage, resets per tab).
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = sessionStorage.getItem('lumo_session_id');
    if (!id) {
      id = 's_' + generateId();
      sessionStorage.setItem('lumo_session_id', id);
    }
    return id;
  } catch {
    return 's_' + generateId();
  }
}

/**
 * Detect device type from user agent.
 */
function getDeviceType(): string {
  if (typeof navigator === 'undefined') return 'Desktop';
  const ua = navigator.userAgent;
  if (/Mobi|Android/i.test(ua)) return 'Mobile';
  if (/Tablet|iPad/i.test(ua)) return 'Tablet';
  return 'Desktop';
}

/**
 * Detect browser name from user agent.
 */
function getBrowser(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Other';
}

/**
 * Detect OS from user agent.
 */
function getOS(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Android')) return 'Android';
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  return 'Other';
}

/**
 * Determine event type based on path.
 */
function getEventType(path: string): string {
  if (path === '/' || path === '/sw') return 'LANDING_PAGE_VIEW';
  if (path.startsWith('/track')) return 'TRACKING_PAGE_VIEW';
  if (path.includes('/register')) return 'REGISTRATION_PAGE_VIEW';
  if (path.includes('/login') || path.includes('/forgot')) return 'LOGIN_PAGE_VIEW';
  if (path.startsWith('/dashboard')) return 'DASHBOARD_PAGE_VIEW';
  if (path.startsWith('/admin')) return 'ADMIN_PAGE_VIEW';
  return 'PAGE_VIEW';
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * PageTracker component: silently tracks every page navigation.
 * Place this once in the root layout.
 */
export default function PageTracker() {
  const pathname = usePathname();
  const lastTracked = useRef<string>('');

  useEffect(() => {
    // Avoid duplicate tracking for same path
    if (pathname === lastTracked.current) return;
    lastTracked.current = pathname;

    const trackPageView = async () => {
      try {
        await fetch(`${API_BASE}/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: getEventType(pathname),
            sessionId: getSessionId(),
            visitorId: getVisitorId(),
            page: pathname,
            referrer: typeof document !== 'undefined' ? document.referrer : '',
            deviceType: getDeviceType(),
            browser: getBrowser(),
            os: getOS(),
          }),
          keepalive: true,
        });
      } catch {
        // Tracking errors must never affect user experience
      }
    };

    // Small delay to avoid blocking initial render
    const timer = setTimeout(trackPageView, 300);
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
