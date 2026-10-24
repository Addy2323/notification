import { localizedMetadata } from '@/lib/server-language';

import { T } from '@/components/LanguageProvider';
import React from 'react';
import Link from 'next/link';
import { Clock, User, ArrowLeft, ArrowRight } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateArticleSchema, generateBreadcrumbSchema } from '@/lib/seo';

export function generateMetadata() { return localizedMetadata(constructMetadata({
  title: 'How SMS Notifications Improve Customer Trust in Last-Mile Logistics | LUMO Blog',
  description:
    'Discover why SMS delivery notifications boast a 98% open rate in Tanzania and build customer trust for retail & e-commerce brands.',
  canonicalUrl: '/blog/sms-notifications-customer-communication',
  alternateSwahiliUrl: '/sw',
})); }

export default function Article2Page() {
  const articleSchema = generateArticleSchema({
    title: 'How SMS Notifications Improve Customer Trust in Last-Mile Logistics',
    description:
      'Discover why SMS delivery notifications boast a 98% open rate in Tanzania and build customer trust for retail & e-commerce brands.',
    publishedTime: '2026-09-28T08:00:00Z',
    authorName: 'LUMO Product Team',
    url: '/blog/sms-notifications-customer-communication',
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', item: '/' },
    { name: 'Blog', item: '/blog' },
    { name: 'SMS Customer Trust', item: '/blog/sms-notifications-customer-communication' },
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
          <span className="px-3 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] text-xs font-mono font-bold">{' '}<T k="public.customer_experience" />{' '}</span>
          <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight">{' '}<T k="public.how_sms_notifications_improve_customer_trust_in_last_mile_logistics" />{' '}</h1>
          <div className="flex items-center gap-4 text-xs text-slate-400 border-b border-slate-800 pb-6">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#FF5500]" />
              <span><T k="public.lumo_product_team" /></span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>September 28, 2026</span>
            </span>
          </div>
        </div>

        <article className="prose prose-invert max-w-none text-slate-300 space-y-6 text-sm sm:text-base leading-relaxed">
          <p>{' '}<T k="public.in_east_africa_sms_remains_the_most_reliable_communication_channel_with_a_98_open_rat" />{' '}</p>

          <h2 className="text-xl font-bold text-white pt-4"><T k="public.building_merchant_authority" /></h2>
          <p>{' '}<T k="public.when_a_customer_receives_an_automated_sms_confirming_their_purchase_dispatch_along_wi" />{' '}</p>

          <h2 className="text-xl font-bold text-white pt-4"><T k="public.reducing_delivery_failure_rates" /></h2>
          <p>{' '}<T k="public.unannounced_deliveries_often_result_in_absent_recipients_sending_an_sms_notification_" />{' '}</p>

          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] my-8 space-y-3">
            <h3 className="font-bold text-white text-base"><T k="public.boost_customer_trust_today" /></h3>
            <p className="text-xs text-[#A0B8D0]">{' '}<T k="public.automate_transactional_sms_delivery_alerts_with_lumo_track" />{' '}</p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-xs shadow-md"
            >
              <span><T k="public.start_sending_sms" /></span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
