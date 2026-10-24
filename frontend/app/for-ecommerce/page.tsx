import { localizedMetadata } from '@/lib/server-language';

import { T } from '@/components/LanguageProvider';
import React from 'react';
import Link from 'next/link';
import { ShoppingBag, MessageSquare, Globe, Smartphone, ShieldCheck, ArrowRight } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateBreadcrumbSchema } from '@/lib/seo';

export function generateMetadata() { return localizedMetadata(constructMetadata({
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
})); }

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
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] text-xs font-mono font-bold uppercase tracking-wider">{' '}<T k="public.e_commerce_delivery_tracking" />{' '}</span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">{' '}<T k="public.e_commerce_delivery_tracking_in_tanzania" />{' '}</h1>
          <p className="text-base sm:text-lg text-[#A0B8D0] leading-relaxed">{' '}<T k="public.sell_through_website_instagram_facebook_or_whatsapp_lumo_track_keeps_online_buyers_up" />{' '}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <ShoppingBag className="w-8 h-8 text-amber-400" />
            <h3 className="text-lg font-bold text-white"><T k="public.direct_social_sellers" /></h3>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">{' '}<T k="public.perfect_for_tanzanian_merchants_taking_orders_via_whatsapp_instagram_dm_phone_calls_o" />{' '}</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <MessageSquare className="w-8 h-8 text-emerald-400" />
            <h3 className="text-lg font-bold text-white"><T k="public.instant_sms_notifications" /></h3>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">{' '}<T k="public.automatically_message_buyers_with_their_tracking_link_as_soon_as_you_dispatch_their_p" />{' '}</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <ShieldCheck className="w-8 h-8 text-[#FF5500]" />
            <h3 className="text-lg font-bold text-white"><T k="public.build_brand_reputation" /></h3>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">{' '}<T k="public.show_professional_merchant_branding_on_the_tracking_web_portal_to_build_buyer_confide" />{' '}</p>
          </div>
        </div>

        <div className="text-center space-y-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-sm shadow-lg shadow-orange-500/20"
          >
            <span><T k="public.start_e_commerce_tracking" /></span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
