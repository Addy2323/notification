import { localizedMetadata } from '@/lib/server-language';

import { T } from '@/components/LanguageProvider';
import React from 'react';
import Link from 'next/link';
import { Clock, User, ArrowLeft, ArrowRight } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateArticleSchema, generateBreadcrumbSchema } from '@/lib/seo';

export function generateMetadata() { return localizedMetadata(constructMetadata({
  title: 'Why WhatsApp Delivery Notifications Outperform Traditional Tracking | LUMO Blog',
  description:
    'Learn how WhatsApp messaging cards with merchant branding and one-tap web links drive customer satisfaction.',
  canonicalUrl: '/blog/whatsapp-delivery-notifications-guide',
  alternateSwahiliUrl: '/sw',
})); }

export default function Article3Page() {
  const articleSchema = generateArticleSchema({
    title: 'Why WhatsApp Delivery Notifications Outperform Traditional Tracking',
    description:
      'Learn how WhatsApp messaging cards with merchant branding and one-tap web links drive customer satisfaction.',
    publishedTime: '2026-09-25T08:00:00Z',
    authorName: 'LUMO Marketing Team',
    url: '/blog/whatsapp-delivery-notifications-guide',
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', item: '/' },
    { name: 'Blog', item: '/blog' },
    { name: 'WhatsApp Notifications Guide', item: '/blog/whatsapp-delivery-notifications-guide' },
  ]);

  return (
    <div className="min-h-screen bg-[#0B192C] font-sans text-white selection:bg-[#FF5500] selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 space-y-8">
        <Link href="/blog" className="inline-flex items-center gap-2 text-xs font-bold text-[#FF5500] hover:underline">
          <ArrowLeft className="w-4 h-4" />
          <span><T k="common.back_to_blog_index" /></span>
        </Link>

        <div className="space-y-4">
          <span className="px-3 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] text-xs font-mono font-bold">{' '}<T k="public.whatsapp_automation" />{' '}</span>
          <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight">{' '}<T k="public.why_whatsapp_delivery_notifications_outperform_traditional_tracking" />{' '}</h1>
          <div className="flex items-center gap-4 text-xs text-slate-400 border-b border-slate-800 pb-6">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#FF5500]" />
              <span><T k="public.lumo_marketing_team" /></span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>September 25, 2026</span>
            </span>
          </div>
        </div>

        <article className="prose prose-invert max-w-none text-slate-300 space-y-6 text-sm sm:text-base leading-relaxed">
          <p>{' '}<T k="public.whatsapp_is_the_default_communication_tool_across_east_africa_leveraging_whatsapp_for" />{' '}</p>

          <h2 className="text-xl font-bold text-white pt-4"><T k="public.rich_media_branding" /></h2>
          <p>{' '}<T k="public.unlike_plain_text_whatsapp_notification_cards_include_merchant_logos_item_titles_driv" />{' '}</p>

          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] my-8 space-y-3">
            <h3 className="font-bold text-white text-base"><T k="public.leverage_whatsapp_dispatch" /></h3>
            <p className="text-xs text-[#A0B8D0]">{' '}<T k="public.enable_whatsapp_delivery_updates_for_your_shop_with_lumo_track" />{' '}</p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-xs shadow-md"
            >
              <span><T k="public.enable_whatsapp_alerts" /></span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
