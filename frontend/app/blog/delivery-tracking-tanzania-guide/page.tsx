import { localizedMetadata } from '@/lib/server-language';

import { T } from '@/components/LanguageProvider';
import React from 'react';
import Link from 'next/link';
import { Clock, User, ArrowLeft, ArrowRight } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateArticleSchema, generateBreadcrumbSchema } from '@/lib/seo';

export function generateMetadata() { return localizedMetadata(constructMetadata({
  title: 'Complete Guide to Delivery Tracking for Tanzanian Businesses | LUMO Blog',
  description:
    'Learn how Tanzanian e-commerce and retail merchants eliminate customer delivery anxiety using automated SMS alerts and app-free web tracking links.',
  canonicalUrl: '/blog/delivery-tracking-tanzania-guide',
  alternateSwahiliUrl: '/sw',
})); }

export default function Article1Page() {
  const articleSchema = generateArticleSchema({
    title: 'Complete Guide to Delivery Tracking for Tanzanian Businesses',
    description:
      'Learn how Tanzanian e-commerce and retail merchants eliminate customer delivery anxiety using automated SMS alerts and app-free web tracking links.',
    publishedTime: '2026-10-01T08:00:00Z',
    authorName: 'LUMO Logistics Team',
    url: '/blog/delivery-tracking-tanzania-guide',
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', item: '/' },
    { name: 'Blog', item: '/blog' },
    { name: 'Delivery Tracking Guide', item: '/blog/delivery-tracking-tanzania-guide' },
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
          <span className="px-3 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] text-xs font-mono font-bold">{' '}<T k="public.delivery_strategy" />{' '}</span>
          <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight">{' '}<T k="public.complete_guide_to_delivery_tracking_for_tanzanian_businesses" />{' '}</h1>
          <div className="flex items-center gap-4 text-xs text-slate-400 border-b border-slate-800 pb-6">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#FF5500]" />
              <span><T k="public.lumo_logistics_team" /></span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>October 1, 2026</span>
            </span>
          </div>
        </div>

        <article className="prose prose-invert max-w-none text-slate-300 space-y-6 text-sm sm:text-base leading-relaxed">
          <p>{' '}<T k="public.in_tanzania_s_rapidly_growing_retail_and_e_commerce_landscape_delivery_speed_alone_is" />{' '}</p>

          <h2 className="text-xl font-bold text-white pt-4"><T k="public.the_cost_of_delivery_anxiety" /></h2>
          <p>{' '}<T k="public.without_automated_delivery_tracking_merchants_face_dozens_of_daily_phone_calls_asking" />{' '}<em><T k="public.legacy_where_is_my_package" /></em><T k="public.this_creates_operational_overhead_for_shop_owners_and_frustration_for_buyers_waiting_" />{' '}</p>

          <h2 className="text-xl font-bold text-white pt-4"><T k="public.why_zero_install_web_tracking_wins" /></h2>
          <p>{' '}<T k="public.forcing_tanzanian_consumers_to_download_mobile_applications_for_single_deliveries_cre" />{' '}</p>

          <h2 className="text-xl font-bold text-white pt-4"><T k="public.key_steps_to_implementing_delivery_tracking" /></h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><T k="public.register_order_details_customer_phone_address_item_summary" /></li>
            <li><T k="public.send_transactional_sms_with_clickable_tracking_token_link" /></li>
            <li><T k="public.allow_drivers_to_update_status_on_the_way_arrived_directly_via_mobile_browser" /></li>
            <li><T k="public.secure_handovers_using_customer_4_digit_pin_verification" /></li>
          </ul>

          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] my-8 space-y-3">
            <h3 className="font-bold text-white text-base"><T k="public.transform_your_business_deliveries_today" /></h3>
            <p className="text-xs text-[#A0B8D0]">{' '}<T k="public.start_sending_automated_sms_updates_and_web_tracking_links_to_your_tanzanian_customer" />{' '}</p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-xs shadow-md"
            >
              <span><T k="public.get_started_free" /></span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
