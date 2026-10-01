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
    // Check if user dismissed prompt in this session
    if (typeof window === 'undefined') return;
    const sessionDismissed = sessionStorage.getItem('lumo_pwa_prompt_dismissed') === 'true';

    // Show prompt automatically after 800ms on first load if not installed & not dismissed in session
    if (!isInstalled && !sessionDismissed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isInstalled]);

  if (!isVisible || isInstalled) return null;

  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (!outcome) {
      // If native prompt is not supported (or on iOS), open guidance modal
      setShowModal(true);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('lumo_pwa_prompt_dismissed', 'true');
    }
    dismissInstall();
  };

  return (
    <>
      {/* Floating Bottom Auto Prompt Bar */}
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-[120] animate-in slide-in-from-bottom-6 duration-500">
        <div className="relative overflow-hidden rounded-2xl bg-[#0B192C]/95 backdrop-blur-xl border border-[#FF5500]/40 p-4 sm:p-5 shadow-2xl text-white">
          {/* Subtle Orange Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF5500]/20 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF5500] to-[#E04B00] text-white flex items-center justify-center font-black text-xl shadow-lg shrink-0 animate-bounce-subtle">
                <Zap className="w-6 h-6 fill-white stroke-none" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black tracking-wider uppercase text-[#FF5500]">LUMO APP</span>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    <Sparkles className="w-3 h-3" /> FREE
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-white leading-tight">
                  Download LUMO App
                </h3>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  Instant 1-tap access on your device screen
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-colors shrink-0"
              aria-label="Close app install banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800">
            <button
              onClick={handleInstall}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] active:scale-95 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              <Download className="w-4 h-4" />
              <span>{isIOS ? 'Install on iOS' : 'Install / Download App'}</span>
            </button>

            <button
              onClick={handleClose}
              className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-xs transition-all shrink-0"
            >
              Later
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
