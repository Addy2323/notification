'use client';

import { useState, useEffect, useCallback } from 'react';

export interface PWAInstallState {
  isInstalled: boolean;
  canInstall: boolean;
  isIOS: boolean;
  isDismissed: boolean;
  promptInstall: () => Promise<boolean>;
  dismissInstall: () => void;
  trackAnalytics: (eventName: string, details?: any) => void;
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Helper analytics logger for PWA funnel tracking
  const trackAnalytics = useCallback((eventName: string, details?: any) => {
    try {
      console.log(`[PWA Analytics] ${eventName}`, details || '');
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', eventName, details);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Register Service Worker securely
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('[PWA ServiceWorker] Registered:', reg.scope))
        .catch((err) => console.warn('[PWA ServiceWorker] Registration failed:', err));
    }

    // 2. Detect Standalone / Already Installed Mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    setIsInstalled(isStandalone);

    if (isStandalone) {
      trackAnalytics('launch_standalone');
    }

    // 3. Detect iOS / Safari
    const ua = window.navigator.userAgent;
    const iosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(iosDevice);

    // 4. Check localStorage for dismissal
    const dismissed = localStorage.getItem('lumo_pwa_dismissed') === 'true';
    setIsDismissed(dismissed);

    // 5. Catch beforeinstallprompt Event (Chrome / Edge / Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
      trackAnalytics('install_prompt_shown');
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
      trackAnalytics('install_completed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [trackAnalytics]);

  // Execute Native PWA Install Prompt
  const promptInstall = useCallback(async (): Promise<boolean> => {
    trackAnalytics('install_cta_clicked');

    if (!deferredPrompt) {
      if (isIOS) {
        return false;
      }
      return false;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      trackAnalytics('install_outcome', { outcome });

      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setCanInstall(false);
        return true;
      } else {
        dismissInstall();
        return false;
      }
    } catch (err) {
      console.error('[PWA Install Prompt Error]', err);
      return false;
    }
  }, [deferredPrompt, isIOS, trackAnalytics]);

  // Dismiss Install Prompt
  const dismissInstall = useCallback(() => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lumo_pwa_dismissed', 'true');
    }
    trackAnalytics('install_dismissed');
  }, [trackAnalytics]);

  return {
    isInstalled,
    canInstall,
    isIOS,
    isDismissed,
    promptInstall,
    dismissInstall,
    trackAnalytics,
  };
}
