import { localizedMetadata } from '@/lib/server-language';

import { T } from '@/components/LanguageProvider';
import React from 'react';
import Link from 'next/link';
import { MessageSquare, CheckCheck, Shield, Sparkles, Smartphone, ArrowRight } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateBreadcrumbSchema } from '@/lib/seo';

export function generateMetadata() { return localizedMetadata(constructMetadata({
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
})); }

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
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">{' '}<T k="public.whatsapp_dispatch_automation" />{' '}</span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">{' '}<T k="public.whatsapp_delivery_notifications_for_businesses" />{' '}</h1>
          <p className="text-base sm:text-lg text-[#A0B8D0] leading-relaxed">{' '}<T k="public.enhance_customer_trust_with_interactive_whatsapp_delivery_updates_featuring_your_merc" />{' '}</p>
        </div>

        {/* Mock WhatsApp Card */}
        <div className="max-w-md mx-auto p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center">
              L
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <span><T k="public.lumo_dispatch" /></span>
                <CheckCheck className="w-4 h-4 text-emerald-400" />
              </h3>
              <p className="text-[10px] text-slate-400"><T k="public.official_business_account" /></p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-slate-200 space-y-2">
            <p className="font-bold text-white"><T k="public.your_order_from_home_deco_is_on_the_way" /></p>
            <p className="text-slate-300">{' '}<T k="common.driver" />{' '}<span className="font-bold text-emerald-400">Ado</span>{' '}<T k="public.has_picked_up_your_package" />{' '}</p>
            <p className="text-[10px] text-slate-400 font-mono"><T k="public.order_1024_nike_air_max_shoes" /></p>
          </div>

          <button className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg">
            <Sparkles className="w-4 h-4" />
            <span><T k="public.track_delivery_web_link" /></span>
          </button>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-sm shadow-lg shadow-orange-500/20"
          >
            <span><T k="public.enable_whatsapp_delivery_alerts" /></span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
