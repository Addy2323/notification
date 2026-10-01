'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { MarqueeTicker } from '@/components/landing/MarqueeTicker';
import { 
  TrustSection, 
  ProcessFlowSection, 
  DualFeatureCards, 
  FeatureGridSection, 
  AboutUsSection,
  CtaBanner, 
  Footer 
} from '@/components/landing/Sections';
import { LumoStartupLoader } from '@/components/common/LumoStartupLoader';

import { PWAInstallBanner } from '@/app/components/pwa/PWAInstallBanner';

export default function LandingPage() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#0B192C] font-sans antialiased text-white selection:bg-[#FF5500] selection:text-white">
      {/* Startup Loader Splash Overlay */}
      <LumoStartupLoader visible={showSplash} message="Loading LUMO Platform..." subtext="Track deliveries. Stay connected." />

      {/* 1. Header */}
      <Header />

      {/* Main Content */}
      <main className="w-full">
        {/* 2. Hero Section */}
        <Hero />

        {/* 2.5 Infinite Horizontal Marquee Ticker Banner */}
        <MarqueeTicker />

        {/* 3. Section 2: Delivery updates your customers can trust */}
        <TrustSection />

        {/* 4. Section 3: From your shop to your customer's door */}
        <ProcessFlowSection />

        {/* 5. Section 4: Dual Feature Highlight Cards */}
        <DualFeatureCards />

        {/* PWA App Install Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <PWAInstallBanner />
        </div>

        {/* 6. Section 5: Everything you need to keep customers informed */}
        <FeatureGridSection />

        {/* 7. Section 6: About Us Section */}
        <AboutUsSection />

        {/* 8. Section 7: Dark Pre-Footer CTA Banner */}
        <CtaBanner />
      </main>

      {/* 9. Footer */}
      <Footer />
    </div>
  );
}

