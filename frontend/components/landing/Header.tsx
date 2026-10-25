'use client';

import { T, useLanguage } from '@/components/LanguageProvider';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight } from 'lucide-react';
import { LumoLogo } from './LumoLogo';
import LanguageSelector from '@/components/LanguageSelector';
import { PWAInstallButton } from '@/app/components/pwa/PWAInstallButton';

export function Header() {
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    if (mobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-50 bg-[#0B192C]/95 backdrop-blur-md border-b border-[#1B2E4B] shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        
        {/* Brand Logo with White Wordmark */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5500] rounded-lg">
          <LumoLogo size={32} textColor="text-white" />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8 font-semibold text-[#A0B8D0]">
          <Link href="/features" className="hover:text-white transition-colors py-2"><T k="common.features" /></Link>
          <Link href="/contact" className="hover:text-white transition-colors py-2"><T k="public.contact_us" /></Link>
          <Link href="/about" className="hover:text-white transition-colors py-2"><T k="common.about_us" /></Link>
        </nav>

        {/* Right Desktop Action Buttons */}
        <div className="hidden md:flex items-center gap-3 lg:gap-4">
          <LanguageSelector />
          <PWAInstallButton variant="header" />

          <Link 
            href="/login" 
            className="text-sm font-semibold text-[#A0B8D0] hover:text-white transition-colors px-2 py-2"
          >{' '}<T k="public.log_in" />{' '}</Link>
          <Link
            href="/register"
            className="px-5 py-2.5 rounded-lg bg-[#FF5500] hover:bg-[#E04B00] text-white text-sm font-bold transition-all shadow-md hover:shadow-orange-500/25 active:scale-95 flex items-center justify-center gap-2"
          >
            <span><T k="public.start_free" /></span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Mobile Header Controls: Clean, uncompressed, works seamlessly down to 320px */}
        <div className="flex md:hidden items-center gap-1.5 sm:gap-2">
          {/* Compact Language Selector takes minimal space */}
          <LanguageSelector compact={true} />

          {/* Show PWA install button only on larger screens (sm+) to avoid cramming narrow screens */}
          <div className="hidden sm:block">
            <PWAInstallButton variant="header" />
          </div>

          {/* Accessible Hamburger Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-menu"
            className="p-2 rounded-xl bg-[#112239] border border-[#1E3A5F] text-[#A0B8D0] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5500] active:scale-95 transition-all"
            aria-label={mobileMenuOpen ? t("common.close") : t("public.toggle_navigation_menu")}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          id="mobile-navigation-menu"
          className="md:hidden bg-[#0B192C] border-b border-[#1B2E4B] px-4 py-5 space-y-4 shadow-2xl animate-in slide-in-from-top-2 duration-200"
        >
          {/* Prominent App Install CTA in Mobile Menu on narrow screens */}
          <div className="sm:hidden pb-2 border-b border-[#162A45]">
            <PWAInstallButton variant="sidebar" />
          </div>

          <nav className="flex flex-col space-y-1 font-semibold text-base text-[#A0B8D0]">
            <Link 
              href="/#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="py-3 px-2 rounded-lg border-b border-[#162A45]/60 hover:bg-white/5 hover:text-white transition-colors"
            >{' '}<T k="common.features" />{' '}</Link>
            <Link 
              href="/about" 
              onClick={() => setMobileMenuOpen(false)}
              className="py-3 px-2 rounded-lg border-b border-[#162A45]/60 hover:bg-white/5 hover:text-white transition-colors"
            >{' '}<T k="common.about_us" />{' '}</Link>
            <Link 
              href="/contact" 
              onClick={() => setMobileMenuOpen(false)}
              className="py-3 px-2 rounded-lg border-b border-[#162A45]/60 hover:bg-white/5 hover:text-white transition-colors"
            >{' '}<T k="public.contact" />{' '}</Link>
            <Link 
              href="/login" 
              onClick={() => setMobileMenuOpen(false)}
              className="py-3 px-2 rounded-lg text-white hover:text-[#FF5500] hover:bg-white/5 transition-colors"
            >{' '}<T k="public.log_in_to_dashboard" />{' '}</Link>
          </nav>

          {/* Prominent Start Free CTA */}
          <div className="pt-2">
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-3 px-4 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-bold text-center flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all"
            >
              <span><T k="public.start_free" /></span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
