import React from 'react';
import Link from 'next/link';
import { Truck, Smartphone, Users, MapPin, CheckCircle2, ArrowRight } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateBreadcrumbSchema } from '@/lib/seo';

export const metadata = constructMetadata({
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
});

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
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] text-xs font-mono font-bold uppercase tracking-wider">
            DELIVERY FLEET MANAGEMENT
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Delivery Management Software for Couriers & Fleets
          </h1>
          <p className="text-base sm:text-lg text-[#A0B8D0] leading-relaxed">
            Manage drivers, streamline customer communication, and eliminate delivery disputes across Tanzania.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <Truck className="w-8 h-8 text-amber-400" />
            <h3 className="text-lg font-bold text-white">Browser-Based Driver Portal</h3>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">
              Drivers receive secure mobile web links to update status (Start Delivery, Arrived, Delivered) without downloading any app.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <Smartphone className="w-8 h-8 text-blue-400" />
            <h3 className="text-lg font-bold text-white">Automated Customer Dispatch</h3>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">
              SMS and WhatsApp alerts trigger automatically on driver updates, keeping recipient customers informed.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">4-Digit PIN Handover Proof</h3>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">
              Ensure delivery completion accountability with customer 4-digit PIN handover codes.
            </p>
          </div>
        </div>

        <div className="text-center space-y-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-sm shadow-lg shadow-orange-500/20"
          >
            <span>Start Managing Your Fleet</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
