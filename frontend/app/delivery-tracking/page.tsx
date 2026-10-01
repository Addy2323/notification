import React from 'react';
import Link from 'next/link';
import { Package, Truck, MapPin, CheckCircle, Clock, Smartphone, MessageSquare, ShieldCheck, ArrowRight } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateBreadcrumbSchema } from '@/lib/seo';

export const metadata = constructMetadata({
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
});

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
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] text-xs font-mono font-bold uppercase tracking-wider">
            DELIVERY TRACKING TANZANIA
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Delivery Tracking System for Businesses in Tanzania
          </h1>
          <p className="text-base sm:text-lg text-[#A0B8D0] leading-relaxed">
            Eliminate customer delivery anxiety. LUMO Track gives your customers zero-install web tracking links sent automatically via SMS and WhatsApp.
          </p>
        </div>

        {/* Delivery Lifecycle Timeline */}
        <div className="space-y-8">
          <h2 className="text-2xl font-black text-center text-white">Documented Delivery Lifecycle</h2>
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
                    <h3 className="text-lg font-bold text-white">{st.title}</h3>
                  </div>
                  <p className="text-xs text-[#A0B8D0] leading-relaxed">{st.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6">
          <div className="p-6 rounded-2xl bg-[#112239]/60 border border-[#1F3654] space-y-3">
            <Smartphone className="w-8 h-8 text-blue-400" />
            <h3 className="text-lg font-bold text-white">No App Download Required</h3>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">
              Customers do not need to download an application or register an account. They tap their SMS link and track instantly in Chrome or Safari.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#112239]/60 border border-[#1F3654] space-y-3">
            <MessageSquare className="w-8 h-8 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">SMS & WhatsApp Connectivity</h3>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">
              Every status change sends instant SMS and WhatsApp notifications directly to the customer’s phone number.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#112239]/60 border border-[#1F3654] space-y-3">
            <ShieldCheck className="w-8 h-8 text-purple-400" />
            <h3 className="text-lg font-bold text-white">Secure Tracking Tokens</h3>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">
              Each delivery features a secure high-entropy token to ensure customer privacy and protect order details.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 to-[#112239] border border-[#1F3654] text-center space-y-4">
          <h2 className="text-2xl font-black text-white">Start Tracking Deliveries for Your Business</h2>
          <p className="text-xs sm:text-sm text-[#A0B8D0]">
            Join merchants across Dar es Salaam and Tanzania using LUMO Track for seamless customer delivery communication.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-sm shadow-lg shadow-orange-500/20"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
