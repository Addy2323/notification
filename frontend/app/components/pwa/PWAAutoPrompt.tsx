'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, ShieldCheck, Zap, Sparkles } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { PWAInstallModal } from '@/app/components/pwa/PWAInstallModal';

export function PWAAutoPrompt() {
  const { isInstalled, isIOS, promptInstall, dismissInstall } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Show prompt automatically after 300ms on first load if not installed
    if (!isInstalled) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isInstalled]);

  if (!isVisible || isInstalled) return null;

  const handleInstall = async () => {
    try {
      const outcome = await promptInstall();
      if (!outcome) {
        // Open visual installation modal if native dialog is unavailable (or on iOS)
        setShowModal(true);
      }
    } catch {
      setShowModal(true);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    dismissInstall();
  };

  return (
    <>
      {/* Floating Bottom Auto Prompt Bar for Mobile & Desktop */}
      <div className="fixed bottom-3 left-3 right-3 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-[99999] animate-in slide-in-from-bottom-8 duration-500">
        <div className="relative overflow-hidden rounded-2xl bg-[#0B192C] border-2 border-[#FF5500] p-4 shadow-2xl text-white">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#FF5500]/25 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF5500] to-[#E04B00] text-white flex items-center justify-center font-black text-xl shadow-xl shrink-0">
                ⚡
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black tracking-widest uppercase text-[#FF5500]">LUMO MERCHANT APP</span>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-extrabold">
                    <Sparkles className="w-2.5 h-2.5" /> FREE
                  </span>
                </div>
                <h3 className="text-base font-black text-white leading-tight">
                  Download LUMO App
                </h3>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  Install for 1-tap fast access on your phone
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-colors shrink-0"
              aria-label="Close app install banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-3.5 pt-3 border-t border-white/10 relative z-10">
            <button
              onClick={handleInstall}
              className="flex-1 py-3 px-4 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] active:scale-95 text-white font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              <Download className="w-4 h-4" />
              <span>{isIOS ? 'Install on iPhone / iOS' : 'Install / Download App'}</span>
            </button>

            <button
              onClick={handleClose}
              className="py-3 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-xs transition-all shrink-0"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Manual / iOS Installation Modal */}
      <PWAInstallModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onInstall={promptInstall}
        isIOS={isIOS}
      />
    </>
  );
}
