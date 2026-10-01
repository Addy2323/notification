'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, AlertTriangle } from 'lucide-react';

export function OfflineNotification() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Check initial status
    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-amber-600 text-white text-xs font-bold py-2 px-4 shadow-lg flex items-center justify-center gap-2 text-center animate-in slide-in-from-top-full duration-200">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>You're offline. Some delivery actions may be unavailable.</span>
    </div>
  );
}
