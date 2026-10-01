'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, Zap, MessageSquare, PhoneCall, CheckCircle2, Lock, ArrowRight, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';

const SLIDES = [
  {
    id: 1,
    image: '/IMAGES/1.png',
    eyebrow: 'AUTOMATED DELIVERY NOTIFICATIONS',
    tagline: 'INSTANT SMS DISPATCH & WEB PORTAL',
    headline: 'Delivery Notifications & Real-Time Web Tracking',
    subheadline: 'Automated Customer Dispatch Platform',
    description: 'Automated SMS and WhatsApp notifications with branded tracking web links for your customers from order creation to doorstep handover — no app download required.',
    features: ['Instant SMS Updates', 'WhatsApp Integration', 'No Customer App Required']
  },
  {
    id: 2,
    image: '/IMAGES/3.png',
    eyebrow: 'REAL-TIME DISPATCH UPDATES',
    tagline: 'ACCURATE STATUS & DIRECT DRIVER CALLS',
    headline: 'Automated SMS Alerts & Real-Time Web Tracking',
    subheadline: 'Zero-Install Delivery Status Sharing',
    description: 'Keep customers updated effortlessly. Drivers update delivery progress right from their mobile browser, triggering instant customer SMS notifications and direct phone connectivity.',
    features: ['Instant SMS Alerts', 'Direct Phone Call Link', 'Instant Web Tracking']
  },
  {
    id: 3,
    image: '/IMAGES/4.png',
    eyebrow: 'WHATSAPP BUSINESS AUTOMATION',
    tagline: 'INTERACTIVE MESSAGING & BRANDING',
    headline: 'Branded WhatsApp Dispatch & Media Alerts',
    subheadline: 'Direct Customer Engagement Channel',
    description: 'Send rich WhatsApp notification cards with your shop logo, order summary, and dynamic "Track Package" buttons for maximum trust.',
    features: ['Verified WhatsApp Bot', 'Custom Shop Branding', 'One-Click Live Web Tracking']
  },
  {
    id: 4,
    image: '/IMAGES/5.png',
    eyebrow: 'SECURE OTP DELIVERY PROOF',
    tagline: 'FRAUD PREVENTION & CONFIRMATION',
    headline: 'OTP Delivery Verification & Order Handover',
    subheadline: 'Foolproof Package Receipt Protocol',
    description: 'Ensure 100% successful handovers. Drivers confirm delivery completion on-site using secure customer 4-digit PIN verification codes.',
    features: ['4-Digit PIN Code', 'Instant Receipt SMS', 'Automated Ledger Sync']
  }
];

const SLIDE_INTERVAL = 5000; // 5 Seconds per slide
const FADE_DURATION = 400; // Smooth 400ms fade duration

export function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFading, setIsFading] = useState(false);

  // Auto-advance slides every 5 seconds
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
    <section className="relative overflow-hidden bg-lumo-grid bg-[#0B192C] pt-8 pb-16 sm:pt-12 sm:pb-24 lg:pt-16 lg:pb-32 text-white">
      {/* Background Radial Glow Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] sm:h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-[#0B192C]/60 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center relative z-10">
        
        {/* Left Column: Synchronized Content (Eyebrow, Tagline, Headline, Subheadline, Description, Features) */}
        <div className={`lg:col-span-7 space-y-5 sm:space-y-6 text-left transition-all duration-700 ease-in-out ${isFading ? 'opacity-0 -translate-y-1 blur-[1px]' : 'opacity-100 translate-y-0 blur-0'}`}>
          
          {/* LUMO Brand Orange Eyebrow Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/40 text-[#FF5500] text-[11px] sm:text-xs font-extrabold uppercase tracking-wider sm:tracking-widest shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-pulse"></span>
            <span>{activeSlide.eyebrow}</span>
          </div>

          {/* Real-time Dispatch Tag */}
          <div className="flex items-center gap-1.5 text-[#FF5500] text-[11px] sm:text-xs font-extrabold tracking-wider uppercase">
            <MapPin className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{activeSlide.tagline}</span>
          </div>

          {/* Main Headline & Subheadline aligned with active slide */}
          <div className="space-y-2 min-h-[120px] sm:min-h-[140px]">
            <h1 className="text-3xl sm:text-5xl lg:text-[56px] font-black text-white tracking-tight leading-[1.1] transition-all">
              {activeSlide.headline}
            </h1>
            <p className="text-xl sm:text-3xl font-extrabold text-[#FF5500] tracking-tight leading-snug">
              {activeSlide.subheadline}
            </p>
          </div>

          {/* Description Subtext */}
          <p className="text-sm sm:text-lg text-[#A0B8D0] leading-relaxed max-w-xl min-h-[60px]">
            {activeSlide.description}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 sm:gap-4 pt-2 sm:pt-4">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-[#FF5500] hover:bg-[#E04B00] text-white text-base font-extrabold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/35 transition-all active:scale-95"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-[#112239]/90 border border-[#1F3654] hover:border-[#2D4D77] text-[#C0D5EC] hover:text-white text-base font-bold transition-all hover:bg-[#162C4A]"
            >
              <span>Explore Features</span>
            </a>
          </div>

          {/* Dynamic Feature Checklist Footer */}
          <div className="pt-4 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-[#8A9EB8] font-semibold border-t border-[#182B46]">
            {activeSlide.features.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#FF5500] shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>

        </div>

        {/* Right Visual Column: Pure Automatic Floating Image Display */}
        <div className="lg:col-span-5 relative flex flex-col items-center lg:items-end pt-4 lg:pt-0">
          
          <div className="relative w-full max-w-[400px] sm:max-w-[500px] lg:max-w-[540px]">
            
            {/* Pure Floating Image — Smooth 700ms Ease-in-out Cross-fade */}
            <div className="relative flex justify-center group cursor-pointer" onClick={handleNextSlide}>
              <img 
                src={activeSlide.image} 
                alt={activeSlide.headline}
                className={`w-full h-auto object-contain drop-shadow-2xl transition-all duration-700 ease-in-out transform group-hover:scale-105 ${isFading ? 'opacity-0 scale-[0.97] blur-[2px]' : 'opacity-100 scale-100 blur-0'}`}
              />
            </div>

            {/* Interactive Slide Control Indicators (Pill Switcher) */}
            <div className="flex items-center justify-center gap-2 pt-6">
              {SLIDES.map((slide, index) => (
                <button
                  key={slide.id}
                  onClick={() => goToSlide(index)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    currentSlide === index
                      ? 'w-8 bg-[#FF5500] shadow-md shadow-orange-500/50'
                      : 'w-2.5 bg-[#1E3654] hover:bg-[#FF5500]/60 hover:w-5'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

          </div>

        </div>


      </div>
    </section>
  );
}





