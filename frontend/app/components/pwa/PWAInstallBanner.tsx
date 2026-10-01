'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Smartphone, Download, ArrowRight, ExternalLink, ShieldCheck, Zap } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { PWAInstallModal } from '@/app/components/pwa/PWAInstallModal';

export function PWAInstallBanner() {
  const { isInstalled, canInstall, isIOS, isDismissed, promptInstall } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // If already dismissed or completely unsupported and not iOS, render minimal graceful CTA or hidden
  if (isDismissed) return null;

  const handleInstallClick = async () => {
    if (isInstalled) {
      window.location.href = '/dashboard';
      return;
    }
    if (canInstall) {
      const installed = await promptInstall();
      if (!installed && isIOS) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <section className="relative my-12 overflow-hidden rounded-3xl bg-[#0B192C] text-white border border-[#1F3654] p-6 sm:p-10 shadow-2xl">
        {/* Glow & Subtle Accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#FF5500]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FF5500] text-white text-[11px] font-black uppercase tracking-wider shadow-sm">
              <Zap className="w-3.5 h-3.5" />
              LUMO MERCHANT APP
            </span>

            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Manage Your Deliveries From One App
            </h2>

            <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
              Install LUMO Merchant for faster access to your delivery dashboard, notifications and delivery management tools.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2 text-xs text-slate-300 font-semibold">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> No App Store Download Required
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10">
                <Smartphone className="w-4 h-4 text-[#FF5500]" /> 1-Tap Home Screen Access
              </span>
            </div>
          </div>

          {/* Action Button Group */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full sm:w-auto shrink-0 text-center">
            {isInstalled ? (
              <Link
                href="/dashboard"
                className="px-6 py-4 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] active:scale-95 text-white font-extrabold text-sm shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                <span>Open LUMO Merchant</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </Link>
            ) : (
              <button
                onClick={handleInstallClick}
                className="px-6 py-4 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] active:scale-95 text-white font-extrabold text-sm shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                <Download className="w-5 h-5" />
                <span>{isIOS ? 'Add LUMO to Home Screen' : 'Install LUMO Merchant'}</span>
              </button>
            )}

            <Link
              href="/dashboard"
              className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              <span>Continue in Browser</span>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </div>
      </section>

      {/* Modal for iOS / Custom Install Instructions */}
      <PWAInstallModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onInstall={promptInstall}
        isIOS={isIOS}
      />
    </>
  );
}
