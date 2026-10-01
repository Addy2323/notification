'use client';

import React from 'react';
import { X, Share, PlusSquare, Smartphone, Download, CheckCircle2 } from 'lucide-react';
import { LumoLogo } from '@/components/landing/LumoLogo';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall?: () => void;
  isIOS?: boolean;
}

export function PWAInstallModal({ isOpen, onClose, onInstall, isIOS = false }: PWAInstallModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#0B192C] text-white border border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-6 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LumoLogo size={36} showText={true} />
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LUMO Merchant Card Preview */}
        <div className="p-4 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#FF5500] text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
              ⚡
            </div>
            <div>
              <h3 className="text-base font-black text-white leading-tight">LUMO Merchant</h3>
              <p className="text-xs text-slate-300 font-medium">Manage your deliveries faster</p>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-white/10 text-xs text-slate-300 font-medium">
            <p className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Create deliveries & track driver fleet</span>
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Instant SMS customer notification updates</span>
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>1-Tap launch from home screen</span>
            </p>
          </div>
        </div>

        {/* iOS Step-by-Step Instructions OR Native Install Action */}
        {isIOS ? (
          <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
            <p className="text-xs font-black uppercase text-[#FF5500] tracking-wider">
              INSTALL ON SAFARI (iOS)
            </p>
            <ol className="space-y-2.5 text-xs text-slate-200 font-medium">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#FF5500] text-white text-[11px] font-black flex items-center justify-center shrink-0">1</span>
                <span>Tap the <Share className="w-4 h-4 inline text-blue-400 mx-1" /> <strong>Share</strong> icon in your Safari toolbar.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#FF5500] text-white text-[11px] font-black flex items-center justify-center shrink-0">2</span>
                <span>Scroll down and tap <PlusSquare className="w-4 h-4 inline text-emerald-400 mx-1" /> <strong>Add to Home Screen</strong>.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#FF5500] text-white text-[11px] font-black flex items-center justify-center shrink-0">3</span>
                <span>Tap <strong>Add</strong> at top right to complete installation.</span>
              </li>
            </ol>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => {
                if (onInstall) onInstall();
                onClose();
              }}
              className="w-full py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] active:scale-95 text-white font-extrabold text-sm shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              <Download className="w-5 h-5" />
              <span>Install LUMO Merchant</span>
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
