'use client';

import React, { useState } from 'react';
import { Download, ExternalLink, Smartphone } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { PWAInstallModal } from '@/app/components/pwa/PWAInstallModal';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'sidebar' | 'header' | 'menu';
}

export function PWAInstallButton({ className = '', variant = 'sidebar' }: PWAInstallButtonProps) {
  const { isInstalled, canInstall, isIOS, promptInstall } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  const handleClick = async () => {
    if (isInstalled) {
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

  if (isInstalled) {
    if (variant === 'menu' || variant === 'sidebar') {
      return (
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-bold">
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <span>LUMO App Active</span>
        </div>
      );
    }
    return null;
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
          variant === 'sidebar'
            ? 'bg-[#FF5500] hover:bg-[#E04B00] text-white shadow-md w-full justify-center'
            : variant === 'header'
            ? 'bg-[#FF5500] hover:bg-[#E04B00] text-white px-3 py-1.5 rounded-lg text-[11px]'
            : 'text-[#FF5500] hover:bg-[#FF5500]/10 w-full text-left'
        } ${className}`}
        title="Install LUMO Merchant App"
      >
        <Download className="w-4 h-4 stroke-[2.5]" />
        <span>Install LUMO App</span>
      </button>

      <PWAInstallModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onInstall={promptInstall}
        isIOS={isIOS}
      />
    </>
  );
}
