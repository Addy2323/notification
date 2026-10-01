import React from 'react';
import Link from 'next/link';
import { ShoppingBag, MessageSquare, Globe, Smartphone, ShieldCheck, ArrowRight } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateBreadcrumbSchema } from '@/lib/seo';

export const metadata = constructMetadata({
  title: 'E-commerce Delivery Tracking in Tanzania | LUMO Track',
  description:
    'Delivery tracking for online stores, Instagram sellers, WhatsApp shops, and e-commerce businesses in Tanzania. Notify buyers with live SMS and web tracking.',
  canonicalUrl: '/for-ecommerce',
  alternateSwahiliUrl: '/sw',
  keywords: [
    'ecommerce delivery tracking Tanzania',
    'online order tracking Tanzania',
    'Instagram shop delivery tracking',
    'WhatsApp seller delivery notification',
  ],
});

export default function ForEcommercePage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', item: '/' },
    { name: 'For E-commerce', item: '/for-ecommerce' },
  ]);

  return (
    <div className="min-h-screen bg-[#0B192C] font-sans text-white selection:bg-[#FF5500] selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] text-xs font-mono font-bold uppercase tracking-wider">
            E-COMMERCE DELIVERY TRACKING
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            E-commerce Delivery Tracking in Tanzania
          </h1>
          <p className="text-base sm:text-lg text-[#A0B8D0] leading-relaxed">
            Sell through website, Instagram, Facebook, or WhatsApp? LUMO Track keeps online buyers updated from purchase to doorstep.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <ShoppingBag className="w-8 h-8 text-amber-400" />
            <h3 className="text-lg font-bold text-white">Direct & Social Sellers</h3>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">
              Perfect for Tanzanian merchants taking orders via WhatsApp, Instagram DM, phone calls, or online storefronts.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <MessageSquare className="w-8 h-8 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">Instant SMS Notifications</h3>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">
              Automatically message buyers with their tracking link as soon as you dispatch their package with your driver.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <ShieldCheck className="w-8 h-8 text-[#FF5500]" />
            <h3 className="text-lg font-bold text-white">Build Brand Reputation</h3>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">
              Show professional merchant branding on the tracking web portal to build buyer confidence and repeat sales.
            </p>
          </div>
        </div>

        <div className="text-center space-y-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-sm shadow-lg shadow-orange-500/20"
          >
            <span>Start E-commerce Tracking</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
