import React from 'react';
import Link from 'next/link';
import { Package, Bell, Truck, Smartphone, CheckCircle2, ArrowRight } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateBreadcrumbSchema } from '@/lib/seo';

export const metadata = constructMetadata({
  title: 'How LUMO Track Works | 5-Step Delivery Communication Process',
  description:
    'Learn how LUMO Track works in 5 simple steps: Create delivery, notify customer via SMS, driver starts delivery, customer tracks online, and driver confirms handover.',
  canonicalUrl: '/how-it-works',
  alternateSwahiliUrl: '/sw/jinsi-inavyofanya-kazi',
  keywords: [
    'how LUMO delivery tracking works',
    'delivery tracking process Tanzania',
    'customer delivery tracking guide',
  ],
});

export default function HowItWorksPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', item: '/' },
    { name: 'How It Works', item: '/how-it-works' },
  ]);

  const steps = [
    {
      num: '1',
      title: 'Create a Delivery',
      desc: 'Merchant registers order in the LUMO dashboard with customer phone number, delivery destination address, and driver assignment.',
      icon: Package,
    },
    {
      num: '2',
      title: 'Notify the Customer',
      desc: 'System dispatches automated SMS/WhatsApp message containing the customer’s unique, secure web tracking link.',
      icon: Bell,
    },
    {
      num: '3',
      title: 'Driver Starts Delivery',
      desc: 'Driver opens browser action link on their phone and taps "Start Delivery", updating order status to On the Way.',
      icon: Truck,
    },
    {
      num: '4',
      title: 'Customer Tracks Delivery',
      desc: 'Customer opens their web portal link to view live delivery timeline, driver name, and merchant contact options without an app.',
      icon: Smartphone,
    },
    {
      num: '5',
      title: 'Driver Confirms Delivery',
      desc: 'Driver verifies handover using 4-digit PIN code. Status changes to Delivered, sending confirmation receipt to merchant and buyer.',
      icon: CheckCircle2,
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
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] text-xs font-mono font-bold uppercase tracking-wider">
            5-STEP DELIVERY PROTOCOL
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            How LUMO Delivery Tracking Works
          </h1>
          <p className="text-base sm:text-lg text-[#A0B8D0] leading-relaxed">
            From order creation to final doorstep handover — keeping merchants, drivers, and buyers seamlessly connected.
          </p>
        </div>

        <div className="space-y-6 max-w-4xl mx-auto">
          {steps.map((st) => {
            const Icon = st.icon;
            return (
              <div
                key={st.num}
                className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] flex flex-col sm:flex-row items-start sm:items-center gap-6"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] flex items-center justify-center font-mono font-black text-xl shrink-0">
                  {st.num}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-amber-400" />
                    <h2 className="text-lg font-bold text-white">{st.title}</h2>
                  </div>
                  <p className="text-xs sm:text-sm text-[#A0B8D0] leading-relaxed">{st.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center space-y-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-sm shadow-lg shadow-orange-500/20"
          >
            <span>Try It Yourself Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
