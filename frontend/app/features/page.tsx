import React from 'react';
import Link from 'next/link';
import { Shield, Smartphone, MessageSquare, Truck, CheckCircle2, ArrowRight, Package, MapPin, Zap } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateBreadcrumbSchema } from '@/lib/seo';

export const metadata = constructMetadata({
  title: 'Features | Delivery Tracking & SMS Notification Platform',
  description:
    'Explore LUMO Track features: automated SMS & WhatsApp delivery alerts, zero-install customer web tracking portal, driver status updates, and merchant analytics in Tanzania.',
  canonicalUrl: '/features',
  alternateSwahiliUrl: '/sw/fuatilia-mizigo',
});

export default function FeaturesPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', item: '/' },
    { name: 'Features', item: '/features' },
  ]);

  const featureList = [
    {
      title: 'Automated SMS & WhatsApp Delivery Alerts',
      description:
        'Instantly notify your customers via transactional SMS and WhatsApp as soon as their package is dispatched, on the way, or nearby.',
      icon: MessageSquare,
      color: 'text-amber-400',
    },
    {
      title: 'App-Free Web Tracking Portal',
      description:
        'Customers click a secure tracking link in their SMS/WhatsApp message to view live delivery status on any smartphone browser — no app installation or sign-up required.',
      icon: Smartphone,
      color: 'text-blue-400',
    },
    {
      title: 'Mobile Browser Driver Workflow',
      description:
        'Drivers receive secure action links to update delivery lifecycle states (Start Delivery, Arrived, Delivered) directly from their phone browser.',
      icon: Truck,
      color: 'text-emerald-400',
    },
    {
      title: 'Secure OTP Handover Verification',
      description:
        'Eliminate lost packages and dispute claims with 4-digit PIN verification codes entered by the driver upon delivery handover.',
      icon: Shield,
      color: 'text-purple-400',
    },
    {
      title: 'Merchant Control Dashboard',
      description:
        'Monitor active dispatches, track driver locations, review daily delivery completion rates, and manage customer communications in one central ledger.',
      icon: Package,
      color: 'text-orange-400',
    },
    {
      title: 'Custom Merchant Branding',
      description:
        'Display your business name, shop logo, brand colors, and support contact details on every customer tracking page.',
      icon: Zap,
      color: 'text-pink-400',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0B192C] font-sans text-white selection:bg-[#FF5500] selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 space-y-16">
        {/* Hero Banner */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] text-xs font-mono font-bold uppercase tracking-wider">
            LUMO TRACK FEATURES
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Complete Delivery Communication & Tracking Suite
          </h1>
          <p className="text-base sm:text-lg text-[#A0B8D0] leading-relaxed">
            Everything your Tanzanian business needs to keep customers informed, reduce support calls, and ensure smooth delivery handovers.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featureList.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-[#112239]/80 border border-[#1F3654] hover:border-[#FF5500]/50 transition-all hover:-translate-y-1 shadow-lg space-y-4"
              >
                <div className={`w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center ${feat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-black text-white">{feat.title}</h2>
                <p className="text-xs sm:text-sm text-[#A0B8D0] leading-relaxed">{feat.description}</p>
              </div>
            );
          })}
        </div>

        {/* CTA Banner */}
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-blue-950 via-[#112239] to-slate-950 border border-[#1F3654] text-center space-y-6 shadow-2xl">
          <h2 className="text-2xl sm:text-4xl font-black text-white">Ready to automate your delivery notifications?</h2>
          <p className="text-sm sm:text-base text-[#A0B8D0] max-w-2xl mx-auto">
            Start notifying your Tanzanian customers today with SMS, WhatsApp updates, and app-free web tracking.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-sm shadow-lg shadow-orange-500/20 transition-all"
            >
              Start Free Trial
            </Link>
            <Link
              href="/delivery-tracking"
              className="px-8 py-3.5 rounded-xl bg-[#162C4A] border border-[#2D4D77] hover:bg-[#1F3E68] text-white font-bold text-sm transition-all"
            >
              Learn About Tracking
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
