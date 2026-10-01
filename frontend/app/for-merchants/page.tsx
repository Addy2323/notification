import React from 'react';
import Link from 'next/link';
import { Store, UserCheck, Truck, BarChart3, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateBreadcrumbSchema } from '@/lib/seo';

export const metadata = constructMetadata({
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
});

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
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] text-xs font-mono font-bold uppercase tracking-wider">
            MERCHANT DELIVERY SOLUTION
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Delivery Tracking Software for Merchants
          </h1>
          <p className="text-base sm:text-lg text-[#A0B8D0] leading-relaxed">
            Register your shop, create deliveries in seconds, assign drivers, and give your customers peace of mind with instant tracking.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <Store className="w-8 h-8 text-amber-400" />
            <h3 className="font-bold text-base text-white">1. Business Registration</h3>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">
              Create your merchant account, upload your shop logo, and set up brand details in under 2 minutes.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <UserCheck className="w-8 h-8 text-blue-400" />
            <h3 className="font-bold text-base text-white">2. Create Deliveries</h3>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">
              Enter customer phone number, destination address, product description, and driver details.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <Truck className="w-8 h-8 text-emerald-400" />
            <h3 className="font-bold text-base text-white">3. Assign Driver Link</h3>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">
              Drivers receive a mobile link to update status (On the Way, Arrived, Delivered) without an app.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <BarChart3 className="w-8 h-8 text-purple-400" />
            <h3 className="font-bold text-base text-white">4. Live Merchant Dashboard</h3>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">
              Track completion rates, active deliveries, daily revenue, and customer feedback in real-time.
            </p>
          </div>
        </div>

        <div className="text-center space-y-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-sm shadow-lg shadow-orange-500/20"
          >
            <span>Register Merchant Account</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
