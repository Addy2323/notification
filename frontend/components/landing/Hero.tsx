'use client';

import { T, TLabel, useLanguage } from '@/components/LanguageProvider';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, MapPin } from 'lucide-react';

const SLIDES = [
  {
    id: 1,
    image: '/IMAGES/1.png',
    eyebrow: 'DELIVERY TRACKING & NOTIFICATIONS IN TANZANIA',
    tagline: 'AUTOMATED DISPATCH & APP-FREE CONSUMER PORTAL',
    headline: 'Delivery Tracking & Notifications for Tanzanian Businesses',
    subheadline: 'Keep Customers Informed From Dispatch to Doorstep',
    description: 'Keep customers informed from dispatch to delivery with automated SMS, WhatsApp updates and a simple web tracking portal — no customer app required.',
    features: ['Instant SMS Delivery Updates', 'WhatsApp Notifications', 'No App Download Required']
  },
  {
    id: 2,
    image: '/IMAGES/3.png',
    eyebrow: 'REAL-TIME DISPATCH UPDATES IN TANZANIA',
    tagline: 'ACCURATE STATUS & DIRECT DRIVER CONNECTIVITY',
    headline: 'SMS Delivery Notifications & Live Web Tracking',
    subheadline: 'Zero-Install Delivery Tracking Software',
    description: 'Keep customers updated effortlessly. Drivers update delivery progress right from their mobile browser, triggering instant SMS notifications and direct phone connectivity.',
    features: ['Instant SMS Alerts', 'Direct Driver Call Link', 'Instant Web Tracking']
  },
  {
    id: 3,
    image: '/IMAGES/4.png',
    eyebrow: 'WHATSAPP DISPATCH AUTOMATION',
    tagline: 'INTERACTIVE MESSAGING & MERCHANT BRANDING',
    headline: 'Branded WhatsApp Notifications & Tracking',
    subheadline: 'Direct Customer Delivery Communication',
    description: 'Send rich WhatsApp notification cards with your merchant shop logo, order summary, and dynamic "Track Package" buttons for maximum trust.',
    features: ['Verified WhatsApp Alerts', 'Custom Merchant Branding', 'One-Click Web Tracking']
  },
  {
    id: 4,
    image: '/IMAGES/5.png',
    eyebrow: 'SECURE OTP HANDOVER PROOF',
    tagline: 'FRAUD PREVENTION & DELIVERY VERIFICATION',
    headline: 'OTP Delivery Verification & Order Handover',
    subheadline: 'Secure Package Receipt Protocol for Tanzania',
    description: 'Ensure 100% successful handovers. Drivers confirm delivery completion on-site using secure customer 4-digit PIN verification codes.',
    features: ['4-Digit PIN Code', 'Instant Receipt SMS', 'Automated Ledger Sync']
  }
];

const SLIDE_INTERVAL = 5000;
const FADE_DURATION = 400;

export function Hero() {
  const { t, label: uiLabel } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      handleNextSlide();
    }, SLIDE_INTERVAL);

    return () => clearInterval(timer);
  }, [currentSlide]);

  const goToSlide = (index: number) => {
    if (index === currentSlide || isFading) return;
    setIsFading(true);
    setTimeout(() => {
      setCurrentSlide(index);
      setIsFading(false);
    }, FADE_DURATION);
  };

  const handleNextSlide = () => {
    goToSlide((currentSlide + 1) % SLIDES.length);
  };

  const activeSlide = SLIDES[currentSlide];

  return (
    <section className="relative overflow-hidden bg-lumo-grid bg-[#0B192C] pt-6 pb-12 sm:pt-12 sm:pb-20 lg:pt-16 lg:pb-28 text-white">
      {/* Background Radial Glow Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] sm:h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-[#0B192C]/60 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center relative z-10">
        
        {/* Left Column: Synchronized Content */}
        <div className={`lg:col-span-7 space-y-4 sm:space-y-6 text-left transition-all duration-700 ease-in-out ${isFading ? 'opacity-0 -translate-y-1 blur-[1px]' : 'opacity-100 translate-y-0 blur-0'}`}>
          
          {/* Single Concise Eyebrow Badge on Mobile; extended context on Desktop */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/40 text-[#FF5500] text-[11px] sm:text-xs font-extrabold uppercase tracking-wider sm:tracking-widest shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-pulse"></span>
              <span><TLabel value={activeSlide.eyebrow} /></span>
            </div>
            
            {/* Secondary Tagline displayed cleanly on tablet/desktop */}
            <div className="hidden sm:inline-flex items-center gap-1.5 text-[#FF5500] text-xs font-extrabold tracking-wider uppercase">
              <MapPin className="w-3.5 h-3.5 stroke-[2.5]" />
              <span><TLabel value={activeSlide.tagline} /></span>
            </div>
          </div>

          {/* Fluid Typography Headings */}
          <div className="space-y-2 sm:space-y-3">
            <h1 className="text-[clamp(1.85rem,5.5vw,3.5rem)] font-black text-white tracking-tight leading-[1.15] transition-all">
              <TLabel value={activeSlide.headline} />
            </h1>
            <p className="text-[clamp(1.15rem,3.2vw,1.875rem)] font-extrabold text-[#FF5500] tracking-tight leading-snug">
              <TLabel value={activeSlide.subheadline} />
            </p>
          </div>

          {/* Readable Description Text */}
          <p className="text-[15px] sm:text-base lg:text-lg text-[#A0B8D0] leading-relaxed max-w-xl font-normal">
            <TLabel value={activeSlide.description} />
          </p>

          {/* CTA Buttons: Full Width on Mobile, Touch Target >= 48px */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-1 sm:pt-3">
            <Link
              href="/register"
              className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white text-base font-extrabold shadow-lg shadow-orange-500/25 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <span><T k="public.get_started_free" /></span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>

            <a
              href="#features"
              className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-[#112239]/90 border border-[#1F3654] hover:border-[#2D4D77] text-[#C0D5EC] hover:text-white text-base font-bold transition-all hover:bg-[#162C4A] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5500]"
            >
              <span><T k="public.explore_features" /></span>
            </a>
          </div>

          {/* Clean Single-Column Feature Checklist on Mobile */}
          <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 border-t border-[#182B46]/80">
            {activeSlide.features.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#FF5500] shrink-0" />
                <span className="text-sm font-semibold text-[#A0B8D0] leading-normal"><TLabel value={feat} /></span>
              </div>
            ))}
          </div>

        </div>

        {/* Right Visual Column */}
        <div className="lg:col-span-5 relative flex flex-col items-center lg:items-end pt-2 sm:pt-4 lg:pt-0 w-full">
          <div className="relative w-full max-w-[340px] sm:max-w-[460px] lg:max-w-[540px]">
            
            {/* Pure Floating Image Display */}
            <div className="relative flex justify-center group cursor-pointer" onClick={handleNextSlide}>
              <img 
                src={activeSlide.image} 
                alt={uiLabel(activeSlide.headline)}
                className={`w-full h-auto object-contain drop-shadow-2xl transition-all duration-700 ease-in-out transform group-hover:scale-105 ${isFading ? 'opacity-0 scale-[0.97] blur-[2px]' : 'opacity-100 scale-100 blur-0'}`}
              />
            </div>

            {/* Slide Control Indicators */}
            <div className="flex items-center justify-center gap-2 pt-5 sm:pt-6">
              {SLIDES.map((slide, index) => (
                <button
                  key={slide.id}
                  onClick={() => goToSlide(index)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    currentSlide === index
                      ? 'w-8 bg-[#FF5500] shadow-md shadow-orange-500/50'
                      : 'w-2.5 bg-[#1E3654] hover:bg-[#FF5500]/60 hover:w-5'
                  }`}
                  aria-label={t('common.go_to_slide', { number: index + 1 })}
                />
              ))}
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
