import { localizedMetadata } from '@/lib/server-language';

import { T } from '@/components/LanguageProvider';
import React from 'react';
import Link from 'next/link';
import { Truck, Smartphone, Users, MapPin, CheckCircle2, ArrowRight } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateBreadcrumbSchema } from '@/lib/seo';

export function generateMetadata() { return localizedMetadata(constructMetadata({
  title: 'Delivery Management Software for Delivery Businesses | LUMO Track',
  description:
    'LUMO Track offers mobile delivery management software for delivery fleets and couriers in Tanzania. Empower drivers with browser-based delivery status updates.',
  canonicalUrl: '/for-delivery-businesses',
  alternateSwahiliUrl: '/sw',
  keywords: [
    'delivery management software Tanzania',
    'delivery business tracking software',
    'courier management software Tanzania',
    'fleet driver tracking Tanzania',
  ],
})); }

export default function ForDeliveryBusinessesPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', item: '/' },
    { name: 'For Delivery Businesses', item: '/for-delivery-businesses' },
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
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] text-xs font-mono font-bold uppercase tracking-wider">{' '}<T k="public.delivery_fleet_management" />{' '}</span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">{' '}<T k="public.delivery_management_software_for_couriers_fleets" />{' '}</h1>
          <p className="text-base sm:text-lg text-[#A0B8D0] leading-relaxed">{' '}<T k="public.manage_drivers_streamline_customer_communication_and_eliminate_delivery_disputes_acro" />{' '}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <Truck className="w-8 h-8 text-amber-400" />
            <h3 className="text-lg font-bold text-white"><T k="public.browser_based_driver_portal" /></h3>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">{' '}<T k="public.drivers_receive_secure_mobile_web_links_to_update_status_start_delivery_arrived_deliv" />{' '}</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <Smartphone className="w-8 h-8 text-blue-400" />
            <h3 className="text-lg font-bold text-white"><T k="public.automated_customer_dispatch" /></h3>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">{' '}<T k="public.sms_and_whatsapp_alerts_trigger_automatically_on_driver_updates_keeping_recipient_cus" />{' '}</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <h3 className="text-lg font-bold text-white"><T k="public.4_digit_pin_handover_proof" /></h3>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">{' '}<T k="public.ensure_delivery_completion_accountability_with_customer_4_digit_pin_handover_codes" />{' '}</p>
          </div>
        </div>

        <div className="text-center space-y-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-sm shadow-lg shadow-orange-500/20"
          >
            <span><T k="public.start_managing_your_fleet" /></span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
