'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight } from 'lucide-react';
import { LumoLogo } from './LumoLogo';
import { PWAInstallButton } from '@/app/components/pwa/PWAInstallButton';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#0B192C]/95 backdrop-blur-md border-b border-[#1B2E4B] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        
        {/* Brand Logo with White Wordmark */}
        <Link href="/" className="flex items-center gap-3 group">
          <LumoLogo size={36} textColor="text-white" />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8 font-semibold text-[#A0B8D0]">
          <Link href="/features" className="hover:text-white transition-colors py-2">Features</Link>
          <Link href="/contact" className="hover:text-white transition-colors py-2">Contact Us</Link>
          <Link href="/about" className="hover:text-white transition-colors py-2">About Us</Link>
        </nav>

        {/* Right Desktop Action Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <PWAInstallButton variant="header" />

          <Link 
            href="/login" 
            className="text-sm font-semibold text-[#A0B8D0] hover:text-white transition-colors px-2 py-2"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="px-5 py-2.5 rounded-lg bg-[#FF5500] hover:bg-[#E04B00] text-white text-sm font-bold transition-all shadow-md hover:shadow-orange-500/25 active:scale-95 flex items-center justify-center gap-2"
          >
            <span>Start free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <div className="flex md:hidden items-center gap-2">
          <PWAInstallButton variant="header" />

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-[#112239] border border-[#1E3A5F] text-[#A0B8D0] hover:text-white focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0B192C] border-b border-[#1B2E4B] px-6 py-6 space-y-4 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-3 font-semibold text-base text-[#A0B8D0]">
            <Link 
              href="/#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-[#162A45] hover:text-white transition-colors"
            >
              Features
            </Link>
            <Link 
              href="/about" 
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-[#162A45] hover:text-white transition-colors"
            >
              About Us
            </Link>
            <Link 
              href="/contact" 
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-[#162A45] hover:text-white transition-colors"
            >
              Contact
            </Link>
            <Link 
              href="/login" 
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-[#162A45] text-white hover:text-[#FF5500] transition-colors"
            >
              Log in to Dashboard
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}




