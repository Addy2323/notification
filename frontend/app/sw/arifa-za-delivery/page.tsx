import React from 'react';
import Link from 'next/link';
import { MessageSquare, Bell, ArrowRight } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateBreadcrumbSchema } from '@/lib/seo';

export const metadata = constructMetadata({
  title: 'Arifa za SMS na Delivery Tanzania | LUMO Track',
  description:
    'Tuma arifa za SMS na WhatsApp kwa wateja wako Tanzania pindi mzigo unaposafirishwa. Boresha mawasiliano ya biashara yako leo.',
  canonicalUrl: '/sw/arifa-za-delivery',
  alternateEnglishUrl: '/sms-notifications',
  keywords: [
    'arifa za SMS Tanzania',
    'SMS za delivery Tanzania',
    'mawasiliano ya mizigo Dar es Salaam',
  ],
});

export default function SwahiliArifaZaDeliveryPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Nyumbani', item: '/sw' },
    { name: 'Arifa za Delivery', item: '/sw/arifa-za-delivery' },
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
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] text-xs font-mono font-bold uppercase tracking-wider">
            ARIFA ZA SMS & WHATSAPP
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Arifa za SMS na Delivery kwa Wafanyabiashara
          </h1>
          <p className="text-base sm:text-lg text-[#A0B8D0] leading-relaxed">
            Punguza simu za wateja za "Mzigo wangu uko wapi?". Tuma SMS za kiotomatiki zenye link ya tracking kwa kila oda.
          </p>
        </div>

        <div className="text-center space-y-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-sm shadow-lg shadow-orange-500/20"
          >
            <span>Anza Kutuma Arifa za SMS</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
