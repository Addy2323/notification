import { localizedMetadata } from '@/lib/server-language';

import { T, TLabel } from '@/components/LanguageProvider';
import React from 'react';
import Link from 'next/link';
import { Package, Truck, MapPin, CheckCircle, Clock, Smartphone, MessageSquare, ShieldCheck, ArrowRight } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateBreadcrumbSchema } from '@/lib/seo';

export function generateMetadata() { return localizedMetadata(constructMetadata({
  title: 'Delivery Tracking System for Businesses in Tanzania | LUMO Track',
  description:
    'LUMO Track provides a mobile delivery tracking system for Tanzanian merchants. Give customers real-time delivery status updates via SMS and WhatsApp without an app.',
  canonicalUrl: '/delivery-tracking',
  alternateSwahiliUrl: '/sw/fuatilia-mizigo',
  keywords: [
    'delivery tracking Tanzania',
    'delivery tracking system Tanzania',
    'order tracking Tanzania',
    'parcel tracking Tanzania',
    'online delivery tracking',
    'courier tracking system Tanzania',
  ],
})); }

export default function DeliveryTrackingPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', item: '/' },
    { name: 'Delivery Tracking', item: '/delivery-tracking' },
  ]);

  const steps = [
    {
      step: '01',
      title: 'Created',
      desc: 'Merchant registers the delivery order in the LUMO dashboard with customer phone number, delivery address, and product details.',
      icon: Package,
    },
    {
      step: '02',
      title: 'On the Way',
      desc: 'Driver starts the delivery. The customer receives an automated SMS/WhatsApp notification with a secure web tracking link.',
      icon: Truck,
    },
    {
      step: '03',
      title: 'Arrived',
      desc: 'Driver approaches the customer location and updates status to Arrived. Customer gets a reminder to prepare for handover.',
      icon: MapPin,
    },
    {
      step: '04',
      title: 'Delivered',
      desc: 'Package is handed over using 4-digit PIN verification code. Status updates to Delivered in real-time.',
      icon: CheckCircle,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0B192C] font-sans text-white selection:bg-[#FF5500] selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 space-y-16">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] text-xs font-mono font-bold uppercase tracking-wider">{' '}<T k="public.delivery_tracking_tanzania" />{' '}</span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">{' '}<T k="public.delivery_tracking_system_for_businesses_in_tanzania" />{' '}</h1>
          <p className="text-base sm:text-lg text-[#A0B8D0] leading-relaxed">{' '}<T k="public.eliminate_customer_delivery_anxiety_lumo_track_gives_your_customers_zero_install_web_" />{' '}</p>
        </div>

        {/* Delivery Lifecycle Timeline */}
        <div className="space-y-8">
          <h2 className="text-2xl font-black text-center text-white"><T k="public.documented_delivery_lifecycle" /></h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((st) => {
              const Icon = st.icon;
              return (
                <div key={st.step} className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] relative space-y-3">
                  <span className="text-xs font-mono font-bold text-[#FF5500]">{st.step}</span>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-slate-900 text-amber-400">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-white"><TLabel value={st.title} /></h3>
                  </div>
                  <p className="text-xs text-[#A0B8D0] leading-relaxed"><TLabel value={st.desc} /></p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6">
          <div className="p-6 rounded-2xl bg-[#112239]/60 border border-[#1F3654] space-y-3">
            <Smartphone className="w-8 h-8 text-blue-400" />
            <h3 className="text-lg font-bold text-white"><T k="public.no_app_download_required" /></h3>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">{' '}<T k="public.customers_do_not_need_to_download_an_application_or_register_an_account_they_tap_thei" />{' '}</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#112239]/60 border border-[#1F3654] space-y-3">
            <MessageSquare className="w-8 h-8 text-emerald-400" />
            <h3 className="text-lg font-bold text-white"><T k="public.sms_whatsapp_connectivity" /></h3>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">{' '}<T k="public.every_status_change_sends_instant_sms_and_whatsapp_notifications_directly_to_the_cust" />{' '}</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#112239]/60 border border-[#1F3654] space-y-3">
            <ShieldCheck className="w-8 h-8 text-purple-400" />
            <h3 className="text-lg font-bold text-white"><T k="public.secure_tracking_tokens" /></h3>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">{' '}<T k="public.each_delivery_features_a_secure_high_entropy_token_to_ensure_customer_privacy_and_pro" />{' '}</p>
          </div>
        </div>

        {/* CTA */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 to-[#112239] border border-[#1F3654] text-center space-y-4">
          <h2 className="text-2xl font-black text-white"><T k="public.start_tracking_deliveries_for_your_business" /></h2>
          <p className="text-xs sm:text-sm text-[#A0B8D0]">{' '}<T k="public.join_merchants_across_dar_es_salaam_and_tanzania_using_lumo_track_for_seamless_custom" />{' '}</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-sm shadow-lg shadow-orange-500/20"
          >
            <span><T k="public.create_free_account" /></span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
