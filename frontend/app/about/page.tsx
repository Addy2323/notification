import { localizedMetadata } from '@/lib/server-language';

import { T } from '@/components/LanguageProvider';
import React from 'react';
import Link from 'next/link';
import { Shield, Globe, Award, Heart, CheckCircle2, ArrowRight } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateBreadcrumbSchema } from '@/lib/seo';

export function generateMetadata() { return localizedMetadata(constructMetadata({
  title: 'About LUMO Track | East Africa Delivery Communication Platform',
  description:
    'LUMO Track is a product of LotusRise Limited dedicated to modernizing last-mile delivery tracking and customer communication in Tanzania and East Africa.',
  canonicalUrl: '/about',
  alternateSwahiliUrl: '/sw',
  keywords: [
    'About LUMO Track',
    'LotusRise Limited Tanzania',
    'delivery technology Dar es Salaam',
  ],
})); }

export default function AboutPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', item: '/' },
    { name: 'About Us', item: '/about' },
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
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] text-xs font-mono font-bold uppercase tracking-wider">{' '}<T k="public.about_lotusrise_lumo" />{' '}</span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">{' '}<T k="public.connecting_merchants_buyers_across_tanzania" />{' '}</h1>
          <p className="text-base sm:text-lg text-[#A0B8D0] leading-relaxed">{' '}<T k="public.lumo_track_was_built_to_solve_last_mile_delivery_anxiety_for_tanzanian_businesses_by_" />{' '}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <Globe className="w-8 h-8 text-amber-400" />
            <h2 className="text-lg font-bold text-white"><T k="public.east_africa_focus" /></h2>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">{' '}<T k="public.designed_specifically_for_local_merchant_workflows_mobile_phone_usage_and_delivery_re" />{' '}</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <Shield className="w-8 h-8 text-emerald-400" />
            <h2 className="text-lg font-bold text-white"><T k="public.zero_app_friction" /></h2>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">{' '}<T k="public.neither_drivers_nor_customers_need_to_install_an_app_everything_works_seamlessly_insi" />{' '}</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <Award className="w-8 h-8 text-purple-400" />
            <h2 className="text-lg font-bold text-white">LotusRise Excellence</h2>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">{' '}<T k="public.backed_by_lotusrise_limited_focused_on_building_enterprise_digital_infrastructure_and" />{' '}</p>
          </div>
        </div>

        <div className="text-center space-y-4">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-sm shadow-lg shadow-orange-500/20"
          >
            <span><T k="public.get_in_touch_with_us" /></span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
