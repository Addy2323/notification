import { localizedMetadata } from '@/lib/server-language';

import { T } from '@/components/LanguageProvider';
import React from 'react';
import Link from 'next/link';
import { Store, UserCheck, Truck, BarChart3, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateBreadcrumbSchema } from '@/lib/seo';

export function generateMetadata() { return localizedMetadata(constructMetadata({
  title: 'Delivery Tracking Software for Merchants in Tanzania | LUMO Track',
  description:
    'LUMO Track helps merchants register businesses, create deliveries, assign drivers, send customer SMS alerts, and track daily fulfillment.',
  canonicalUrl: '/for-merchants',
  alternateSwahiliUrl: '/sw',
  keywords: [
    'delivery tracking for merchants Tanzania',
    'merchant delivery software',
    'delivery software Dar es Salaam',
    'retail delivery tracking Tanzania',
  ],
})); }

export default function ForMerchantsPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', item: '/' },
    { name: 'For Merchants', item: '/for-merchants' },
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
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] text-xs font-mono font-bold uppercase tracking-wider">{' '}<T k="public.merchant_delivery_solution" />{' '}</span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">{' '}<T k="public.delivery_tracking_software_for_merchants" />{' '}</h1>
          <p className="text-base sm:text-lg text-[#A0B8D0] leading-relaxed">{' '}<T k="public.register_your_shop_create_deliveries_in_seconds_assign_drivers_and_give_your_customer" />{' '}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <Store className="w-8 h-8 text-amber-400" />
            <h3 className="font-bold text-base text-white"><T k="public.1_business_registration" /></h3>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">{' '}<T k="public.create_your_merchant_account_upload_your_shop_logo_and_set_up_brand_details_in_under_" />{' '}</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <UserCheck className="w-8 h-8 text-blue-400" />
            <h3 className="font-bold text-base text-white"><T k="public.2_create_deliveries" /></h3>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">{' '}<T k="public.enter_customer_phone_number_destination_address_product_description_and_driver_detail" />{' '}</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <Truck className="w-8 h-8 text-emerald-400" />
            <h3 className="font-bold text-base text-white"><T k="public.3_assign_driver_link" /></h3>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">{' '}<T k="public.drivers_receive_a_mobile_link_to_update_status_on_the_way_arrived_delivered_without_a" />{' '}</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <BarChart3 className="w-8 h-8 text-purple-400" />
            <h3 className="font-bold text-base text-white"><T k="public.4_live_merchant_dashboard" /></h3>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">{' '}<T k="public.track_completion_rates_active_deliveries_daily_revenue_and_customer_feedback_in_real_" />{' '}</p>
          </div>
        </div>

        <div className="text-center space-y-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-sm shadow-lg shadow-orange-500/20"
          >
            <span><T k="auth.register_merchant_account" /></span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
