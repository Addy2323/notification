import React from 'react';
import Link from 'next/link';
import { MessageSquare, CheckCheck, Shield, Sparkles, Smartphone, ArrowRight } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateBreadcrumbSchema } from '@/lib/seo';

export const metadata = constructMetadata({
  title: 'WhatsApp Delivery Notifications for Businesses | LUMO Track',
  description:
    'Send branded WhatsApp delivery updates to buyers. Include order details, driver info, and a one-click web tracking button.',
  canonicalUrl: '/whatsapp-notifications',
  alternateSwahiliUrl: '/sw/arifa-za-delivery',
  keywords: [
    'WhatsApp delivery notifications',
    'WhatsApp order tracking',
    'WhatsApp delivery software',
    'customer WhatsApp tracking Tanzania',
  ],
});

export default function WhatsappNotificationsPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', item: '/' },
    { name: 'WhatsApp Notifications', item: '/whatsapp-notifications' },
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
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
            WHATSAPP DISPATCH AUTOMATION
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            WhatsApp Delivery Notifications for Businesses
          </h1>
          <p className="text-base sm:text-lg text-[#A0B8D0] leading-relaxed">
            Enhance customer trust with interactive WhatsApp delivery updates featuring your merchant logo, order items, driver phone connectivity, and live web tracking.
          </p>
        </div>

        {/* Mock WhatsApp Card */}
        <div className="max-w-md mx-auto p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center">
              L
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <span>LUMO Dispatch</span>
                <CheckCheck className="w-4 h-4 text-emerald-400" />
              </h3>
              <p className="text-[10px] text-slate-400">Official Business Account</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-slate-200 space-y-2">
            <p className="font-bold text-white">🚚 Your order from HOME DECO is on the way!</p>
            <p className="text-slate-300">
              Driver <span className="font-bold text-emerald-400">Ado</span> has picked up your package.
            </p>
            <p className="text-[10px] text-slate-400 font-mono">Order #1024 • Nike Air Max Shoes</p>
          </div>

          <button className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg">
            <Sparkles className="w-4 h-4" />
            <span>Track Delivery Web Link</span>
          </button>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-sm shadow-lg shadow-orange-500/20"
          >
            <span>Enable WhatsApp Delivery Alerts</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
