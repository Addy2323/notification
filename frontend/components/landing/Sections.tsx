'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Send, ShieldCheck, MapPin, Truck, Bell, Clock, 
  Smartphone, BarChart3, Users, CheckCircle2, ArrowRight, Sparkles, Building2, Globe
} from 'lucide-react';
import { LumoLogo } from './LumoLogo';


/* ==========================================================================
   1. TRUST / VALUE PROPOSITION SECTION (Dark Navy Glass Cards)
   ========================================================================== */
export function TrustSection() {
  const cards = [
    {
      icon: Send,
      title: "1. Create Delivery",
      description: "Dispatch orders seamlessly via Web Dashboard or API. Generate unique customer tracking links automatically."
    },
    {
      icon: Bell,
      title: "2. Instant Notification",
      description: "Send automated SMS and WhatsApp alerts to customers with live tracking links — no app install needed."
    },
    {
      icon: MapPin,
      title: "3. Direct Web Tracking Portal",
      description: "Customers view real-time delivery status updates, driver contact details, and order details on a branded web page."
    }
  ];

  return (
    <section className="bg-[#0B192C] py-14 sm:py-20 lg:py-24 border-t border-[#182B46] text-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16 space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/40 text-[#FF5500] text-[11px] sm:text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Seamless Customer Experience</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            How LUMO Transforms Delivery Communication
          </h2>
          <p className="text-[#A0B8D0] text-sm sm:text-lg">
            Empower your Tanzania business with instant delivery notifications and zero-install web tracking.
          </p>
        </div>

        {/* 3 Dark Glass Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {cards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div 
                key={idx}
                className="bg-[#112239]/90 border border-[#1E3A5F] hover:border-[#FF5500]/60 rounded-2xl p-6 sm:p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-orange-500/15 group relative overflow-hidden shimmer-card active:scale-[0.98] cursor-pointer"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#0B192C] border border-[#1C365A] group-hover:border-[#FF5500]/50 group-hover:bg-[#FF5500]/10 flex items-center justify-center mb-5 sm:mb-6 text-[#FF5500] group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-md">
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7 group-hover:text-[#FF5500] transition-colors" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3 tracking-tight group-hover:text-[#FF5500] transition-colors">
                  {card.title}
                </h3>
                <p className="text-[#A0B8D0] text-xs sm:text-sm leading-relaxed">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

/* ==========================================================================
   2. PROCESS FLOW SECTION (Dispatch Pipeline)
   ========================================================================== */
export function ProcessFlowSection() {
  const steps = [
    { num: "01", title: "Order Placed", desc: "Merchant receives customer order" },
    { num: "02", title: "Driver Assigned", desc: "Fleet or driver dispatched" },
    { num: "03", title: "SMS Sent", desc: "Instant SMS with tracking URL" },
    { num: "04", title: "Live Tracking", desc: "Customer tracks driver on map" },
    { num: "05", title: "Delivered", desc: "Order fulfilled with OTP confirmation" }
  ];

  return (
    <section className="bg-lumo-grid bg-[#081220] py-14 sm:py-20 lg:py-24 text-white relative border-t border-[#182B46]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16 space-y-2 sm:space-y-3">
          <span className="text-[#FF5500] text-[11px] sm:text-xs font-black uppercase tracking-widest block">
            End-to-End Pipeline
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Automated From Dispatch to Doorstep
          </h2>
        </div>

        {/* Responsive Process Nodes with Horizontal Scroll Snap on Mobile + Hover Glow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 relative">
          {steps.map((step, index) => (
            <div 
              key={index}
              className="bg-[#112239]/90 border border-[#1E3A5F] rounded-xl p-4 sm:p-5 relative flex flex-col justify-between hover:border-[#FF5500]/60 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-orange-500/10 group cursor-pointer active:scale-95"
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#FF5500] text-white font-extrabold text-xs flex items-center justify-center shadow group-hover:scale-110 group-hover:shadow-orange-500/40 transition-all">
                  {step.num}
                </span>
                <div className="w-2 h-2 rounded-full bg-[#FF5500] group-hover:animate-ping" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-white mb-1 group-hover:text-[#FF5500] transition-colors">{step.title}</h4>
                <p className="text-xs text-[#8A9EB8] leading-snug">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

/* ==========================================================================
   3. DUAL FEATURE CARDS (SMS & WhatsApp Previews)
   ========================================================================== */
export function DualFeatureCards() {
  return (
    <section id="features" className="bg-[#0B192C] py-14 sm:py-20 lg:py-24 border-t border-[#182B46] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-16">
        
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <span className="text-[#FF5500] text-[11px] sm:text-xs font-black uppercase tracking-widest block">
            MULTICHANNEL DISPATCH
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Branded Notifications Across All Channels
          </h2>
          <p className="text-[#A0B8D0] text-sm sm:text-base">
            Deliver instant order status updates via SMS and WhatsApp directly to your customer's phone.
          </p>
        </div>

        {/* Grid of 2 Large Dark Glass Feature Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10">
          
          {/* Card 1: Instant SMS Notifications */}
          <div className="bg-[#112239]/90 border border-[#1E3A5F] hover:border-[#FF5500]/60 rounded-2xl sm:rounded-3xl p-6 sm:p-10 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-orange-500/15 group space-y-5 sm:space-y-6 shimmer-card">
            <div className="space-y-2 sm:space-y-3">
              <span className="text-[11px] sm:text-xs font-extrabold text-[#FF5500] uppercase tracking-wider block">
                SMS DISPATCH PROTOCOL
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white leading-snug group-hover:text-[#FF5500] transition-colors">High-Speed SMS Delivery Notifications</h3>
              <p className="text-[#A0B8D0] text-xs sm:text-sm leading-relaxed">
                Send localized SMS alerts with custom shop branding, driver contact details, and secure tracking links.
              </p>
            </div>

            {/* UI Mockup Container */}
            <div className="bg-[#081220] border border-[#1E3A5F] group-hover:border-[#FF5500]/40 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-2.5 sm:space-y-3 font-mono text-xs transition-all">
              <div className="flex items-center justify-between text-[#8A9EB8] text-[9px] sm:text-[10px] pb-2 border-b border-[#182B46]">
                <span>SENDER: LUMO-TRACK</span>
                <span className="text-[#FF5500] font-bold">DELIVERED</span>
              </div>
              <p className="text-slate-200 leading-relaxed font-sans text-xs">
                "Habari! Order yako #LM-8821 ipo njiani na dereva Ado Myamba (0784-000-111). Bofya hapa kuifuatilia kwenye ramani: <span className="text-[#FF5500] underline">lumo.co.tz/t/8821</span>"
              </p>
            </div>
          </div>

          {/* Card 2: WhatsApp Live Tracking */}
          <div className="bg-[#112239]/90 border border-[#1E3A5F] hover:border-[#25D366]/60 rounded-2xl sm:rounded-3xl p-6 sm:p-10 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-500/15 group space-y-5 sm:space-y-6 shimmer-card">
            <div className="space-y-2 sm:space-y-3">
              <span className="text-[11px] sm:text-xs font-extrabold text-[#25D366] uppercase tracking-wider block">
                WHATSAPP BUSINESS API
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white leading-snug group-hover:text-[#25D366] transition-colors">Interactive WhatsApp Tracking Link</h3>
              <p className="text-[#A0B8D0] text-xs sm:text-sm leading-relaxed">
                Connect your official WhatsApp Business account to send rich media dispatch updates with interactive action buttons.
              </p>
            </div>

            {/* UI Mockup Container */}
            <div className="bg-[#081220] border border-[#1E3A5F] group-hover:border-[#25D366]/40 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-2.5 sm:space-y-3 font-mono text-xs transition-all">
              <div className="flex items-center justify-between text-[#8A9EB8] text-[9px] sm:text-[10px] pb-2 border-b border-[#182B46]">
                <span>WHATSAPP BUSINESS</span>
                <span className="text-[#25D366] font-bold">VERIFIED BOT</span>
              </div>
              <div className="bg-[#112239] p-3 rounded-lg border border-[#1E3A5F] font-sans text-xs space-y-2">
                <p className="text-white font-bold">🚚 Delivery Update</p>
                <p className="text-[#A0B8D0]">Driver is 5 mins away from your location.</p>
                <div className="pt-1.5">
                  <span className="bg-[#25D366] hover:bg-[#1EBE57] text-slate-950 text-[10px] sm:text-[11px] font-extrabold px-3 py-1.5 rounded-md inline-block shadow-md transition-all group-hover:scale-105">
                    Open Live Map 📍
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}

/* ==========================================================================
   4. FEATURE GRID SECTION (Post-Purchase Capabilities)
   ========================================================================== */
export function FeatureGridSection() {
  const features = [
    {
      icon: MapPin,
      title: "Real-Time Map Tracking",
      desc: "Live GPS driver positioning rendered smoothly on customer tracking links."
    },
    {
      icon: Smartphone,
      title: "Zero App Installation",
      desc: "Customers track packages instantly inside their mobile web browser."
    },
    {
      icon: Bell,
      title: "Automated Dispatch Alerts",
      desc: "Trigger notifications automatically when order status changes to Dispatched."
    },
    {
      icon: ShieldCheck,
      title: "OTP Delivery Confirmation",
      desc: "Verify delivery completion using secure 4-digit driver pin verification."
    },
    {
      icon: BarChart3,
      title: "Fleet Performance Analytics",
      desc: "Monitor delivery times, driver speed, and customer satisfaction metrics."
    },
    {
      icon: Users,
      title: "Multi-Store Management",
      desc: "Manage multiple retail outlets or restaurant branches from one unified admin dashboard."
    }
  ];

  return (
    <section className="bg-[#081220] py-14 sm:py-20 lg:py-24 border-t border-[#182B46] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16 space-y-2 sm:space-y-3">
          <span className="text-[#FF5500] text-[11px] sm:text-xs font-black uppercase tracking-widest block">
            ENTERPRISE CAPABILITIES
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Built for High-Growth Merchants & Delivery Fleets
          </h2>
        </div>

        {/* 6 Grid Dark Glass Cards (1 col mobile, 2 sm, 3 lg) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div 
                key={idx}
                className="bg-[#112239]/90 border border-[#1E3A5F] hover:border-[#FF5500]/60 rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-orange-500/10 group cursor-pointer active:scale-95 shimmer-card"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#0B192C] border border-[#1C365A] group-hover:border-[#FF5500]/50 group-hover:bg-[#FF5500]/10 flex items-center justify-center text-[#FF5500] mb-4 group-hover:scale-110 transition-all duration-300 shadow-md">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h4 className="text-base sm:text-lg font-bold text-white mb-1.5 sm:mb-2 group-hover:text-[#FF5500] transition-colors">{feat.title}</h4>
                <p className="text-[#A0B8D0] text-xs leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

/* ==========================================================================
   5. ABOUT US SECTION
   ========================================================================== */
export function AboutUsSection() {
  return (
    <section id="about-us" className="bg-[#0B192C] py-14 sm:py-20 lg:py-24 border-t border-[#182B46] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          <div className="lg:col-span-6 space-y-4 sm:space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/40 text-[#FF5500] text-[11px] sm:text-xs font-bold uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5" />
              <span>ABOUT LUMO PLATFORM</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Transforming Customer Delivery Relations Across Tanzania
            </h2>

            <p className="text-[#A0B8D0] text-sm sm:text-base leading-relaxed">
              LUMO is Tanzania's premier customer delivery communication platform. We empower merchants, e-commerce shops, and logistics fleets to deliver exceptional post-purchase transparency through automated SMS, WhatsApp notifications, and live map tracking.
            </p>

            <div className="grid grid-cols-2 gap-4 sm:gap-6 pt-2">
              <div className="bg-[#112239] border border-[#1E3A5F] p-4 rounded-xl">
                <p className="text-xl sm:text-2xl font-black text-[#FF5500]">100%</p>
                <p className="text-[11px] sm:text-xs text-[#8A9EB8] font-bold pt-1">Web-Based Access</p>
              </div>
              <div className="bg-[#112239] border border-[#1E3A5F] p-4 rounded-xl">
                <p className="text-xl sm:text-2xl font-black text-[#FF5500]">99.9%</p>
                <p className="text-[11px] sm:text-xs text-[#8A9EB8] font-bold pt-1">Notification Reliability</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 pt-4 lg:pt-0">
            <div className="bg-[#112239] border border-[#1E3A5F] rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-5 sm:space-y-6 shadow-2xl relative overflow-hidden">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#FF5500] text-white flex items-center justify-center font-black text-lg sm:text-xl">
                L
              </div>
              <blockquote className="text-base sm:text-lg text-white font-medium italic leading-relaxed">
                "Uhusiano bora na wateja wako ni misingi yetu. Delivery transparency builds trust and repeat orders for every retail merchant."
              </blockquote>
              <div className="border-t border-[#1F3A60] pt-4 flex items-center justify-between text-xs text-[#8A9EB8]">
                <span className="font-bold text-white">LUMO Team</span>
                <span>Dar es Salaam, Tanzania</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   6. CTA BANNER SECTION (Pre-Footer Action Banner)
   ========================================================================== */
export function CtaBanner() {
  return (
    <section id="contact" className="bg-[#081220] py-14 sm:py-20 border-t border-[#182B46] text-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="bg-gradient-to-r from-[#112239] via-[#0E2036] to-[#152B47] border border-[#1F3D66] rounded-2xl sm:rounded-3xl p-6 sm:p-14 text-center space-y-6 sm:space-y-8 relative overflow-hidden shadow-2xl">
          
          {/* Decorative Background Accent */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-[#FF5500]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4 relative z-10">
            <h2 className="text-2xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Ready to Automate Your Delivery Notifications?
            </h2>
            <p className="text-[#A0B8D0] text-sm sm:text-lg">
              Start dispatching customer notifications and live map tracking links in under 5 minutes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5 sm:gap-4 relative z-10 pt-2">
            <a
              href="#get-started"
              className="px-7 py-3.5 sm:py-4 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-black text-sm sm:text-base shadow-xl shadow-orange-500/20 transition-all hover:scale-105"
            >
              Start Free Trial
            </a>
            <a
              href="mailto:support@lumo.co.tz"
              className="px-7 py-3.5 sm:py-4 rounded-xl bg-[#0B192C] border border-[#1E3A5F] text-[#A0B8D0] hover:text-white font-bold text-sm sm:text-base transition-colors"
            >
              Contact Support
            </a>
          </div>

        </div>

      </div>
    </section>
  );
}

/* ==========================================================================
   7. FOOTER COMPONENT
   ========================================================================== */
export function Footer() {
  return (
    <footer className="bg-[#050D1A] border-t border-[#162A45] py-10 sm:py-12 text-[#8A9EB8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 text-center md:text-left">
        
        {/* Brand Logo & Tagline */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
          <LumoLogo size={32} textColor="text-white" />
          <span className="text-xs text-[#8A9EB8]">
            | Customer Delivery Notifications & Tracking
          </span>
        </div>

        {/* Simplified Nav Links */}
        <div className="flex items-center gap-6 sm:gap-8 text-xs font-semibold text-[#A0B8D0]">
          <Link href="/#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="/about" className="hover:text-white transition-colors">About Us</Link>
          <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
        </div>


        {/* Copyright */}
        <div className="text-xs text-[#8A9EB8]">
          &copy; {new Date().getFullYear()} LUMO Technologies. All rights reserved.
        </div>

      </div>
    </footer>
  );
}

