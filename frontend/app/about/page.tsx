'use client';

import React from 'react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { 
  Building2, Sparkles, Target, ShieldCheck, 
  MapPin, HeartHandshake, CheckCircle2, ArrowRight, 
  Users, Smartphone, Bell, Globe, Award
} from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
  const pillars = [
    {
      icon: Smartphone,
      title: "Zero-Install Customer Experience",
      desc: "We believe delivery tracking should be instant. Customers click a web link in SMS or WhatsApp to view live maps — no app download or sign-up required."
    },
    {
      icon: Bell,
      title: "Instant Multi-Channel Dispatch",
      desc: "Sub-second notification delivery through localized SMS gateways and verified WhatsApp Business API integrations across Tanzania."
    },
    {
      icon: HeartHandshake,
      title: "Merchant Trust & Brand Loyalty",
      desc: "Built on our core motto 'Uhusiano Bora Na Wateja Wako'. Transparent delivery communication reduces customer anxiety and drives repeat orders."
    },
    {
      icon: ShieldCheck,
      title: "Enterprise Reliability & Security",
      desc: "Backed by 99.9% system uptime, encrypted OTP delivery verification, and enterprise-grade data security protocols."
    }
  ];

  const metrics = [
    { number: "50,000+", label: "Daily Dispatch Alerts Sent" },
    { number: "99.9%", label: "System SLA Reliability" },
    { number: "100%", label: "Browser Web-Based Tracking" },
    { number: "4+", label: "Tanzania Regions Covered" }
  ];

  const coverageCities = [
    { name: "Dar es Salaam", region: "Commercial Hub & Main Dispatch Center" },
    { name: "Arusha", region: "Northern Circuit Fleet Operations" },
    { name: "Mwanza", region: "Lake Zone Logistics Network" },
    { name: "Zanzibar", region: "Island Retail & Delivery Tracking" }
  ];

  return (
    <div className="min-[#0B192C] bg-[#0B192C] text-white selection:bg-[#FF5500] selection:text-white font-sans antialiased overflow-x-hidden">
      
      {/* Header Navigation */}
      <Header />

      <main className="w-full">
        
        {/* ==========================================================================
           1. HERO SECTION
           ========================================================================== */}
        <section className="relative overflow-hidden bg-lumo-grid pt-8 pb-16 sm:pt-12 sm:pb-24">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-[#0B192C]/60 to-transparent pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
            
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/40 text-[#FF5500] text-xs font-black uppercase tracking-widest shadow-sm">
              <Building2 className="w-4 h-4" />
              <span>ABOUT LUMO PLATFORM</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl mx-auto">
              Empowering Tanzania's Merchants with Delivery Transparency
            </h1>

            <p className="text-base sm:text-xl text-[#A0B8D0] max-w-2xl mx-auto leading-relaxed">
              LUMO is Tanzania's premier delivery notification and live map tracking platform, bridging the gap between merchants, dispatch drivers, and online customers.
            </p>

          </div>
        </section>

        {/* ==========================================================================
           2. SWAHILI MOTTO BANNER
           ========================================================================== */}
        <section className="bg-[#081220] py-12 border-y border-[#182B46]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-[#112239] border border-[#1E3A5F] rounded-2xl p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
              <div className="space-y-2 text-center md:text-left">
                <span className="text-[#FF5500] text-xs font-black uppercase tracking-widest">Core Brand Value</span>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
                  "Uhusiano Bora Na Wateja Wako"
                </h3>
                <p className="text-xs sm:text-sm text-[#A0B8D0]">
                  Great customer relationships start with transparent, real-time delivery updates.
                </p>
              </div>

              <Link 
                href="/#get-started"
                className="px-6 py-3 rounded-lg bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-sm shadow-lg shadow-orange-500/20 shrink-0 transition-transform active:scale-95"
              >
                Join LUMO Today
              </Link>
            </div>
          </div>
        </section>

        {/* ==========================================================================
           3. CORE PILLARS
           ========================================================================== */}
        <section className="py-16 sm:py-24 bg-[#0B192C]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-[#FF5500] text-xs font-black uppercase tracking-widest">OUR FOUNDATIONAL PILLARS</span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Why Merchants Choose LUMO
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {pillars.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="bg-[#112239]/90 border border-[#1E3A5F] rounded-2xl p-6 space-y-4 hover:border-[#FF5500]/50 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-[#0B192C] border border-[#1C365A] flex items-center justify-center text-[#FF5500]">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white">{item.title}</h3>
                    <p className="text-xs text-[#A0B8D0] leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>

          </div>
        </section>

        {/* ==========================================================================
           4. IMPACT METRICS
           ========================================================================== */}
        <section className="py-16 bg-[#081220] border-t border-[#182B46]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
              {metrics.map((m, i) => (
                <div key={i} className="bg-[#112239] border border-[#1E3A5F] p-6 rounded-2xl space-y-2">
                  <p className="text-3xl sm:text-4xl font-black text-[#FF5500]">{m.number}</p>
                  <p className="text-xs sm:text-sm text-[#8A9EB8] font-bold">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==========================================================================
           5. TANZANIA REGIONAL COVERAGE
           ========================================================================== */}
        <section className="py-16 sm:py-24 bg-[#0B192C] border-t border-[#182B46]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-[#FF5500] text-xs font-black uppercase tracking-widest">NATIONWIDE REACH</span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Active Operations Across Key Tanzania Hubs
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {coverageCities.map((city, idx) => (
                <div key={idx} className="bg-[#112239]/90 border border-[#1E3A5F] p-6 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-[#FF5500]">
                    <MapPin className="w-5 h-5" />
                    <h4 className="text-lg font-bold text-white">{city.name}</h4>
                  </div>
                  <p className="text-xs text-[#8A9EB8] font-medium">{city.region}</p>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ==========================================================================
           6. CALL TO ACTION
           ========================================================================== */}
        <section className="py-16 bg-[#081220] border-t border-[#182B46]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Ready to Upgrade Your Delivery Customer Experience?
            </h2>
            <p className="text-[#A0B8D0] text-base max-w-xl mx-auto">
              Get started with automated SMS, WhatsApp alerts, and live tracking links for your customers today.
            </p>
            <div className="pt-2 flex justify-center gap-4">
              <Link 
                href="/#get-started"
                className="px-8 py-3.5 rounded-lg bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-base shadow-lg shadow-orange-500/20 transition-all active:scale-95"
              >
                Get Started Free
              </Link>
              <Link 
                href="/contact"
                className="px-8 py-3.5 rounded-lg bg-[#112239] border border-[#1E3A5F] text-[#A0B8D0] hover:text-white font-bold text-base transition-colors"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <Footer />

    </div>
  );
}
