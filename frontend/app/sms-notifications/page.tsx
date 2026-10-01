import React from 'react';
import Link from 'next/link';
import { MessageSquare, Bell, CheckCircle2, ShieldAlert, Zap, Smartphone, ArrowRight } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateBreadcrumbSchema } from '@/lib/seo';

export const metadata = constructMetadata({
  title: 'SMS Delivery Notifications for Businesses in Tanzania | LUMO Track',
  description:
    'Send automated transactional SMS delivery notifications to customers in Tanzania. Keep buyers informed from dispatch to handover with live tracking links.',
  canonicalUrl: '/sms-notifications',
  alternateSwahiliUrl: '/sw/arifa-za-delivery',
  keywords: [
    'SMS delivery notifications',
    'SMS delivery notifications Tanzania',
    'transactional SMS Tanzania',
    'SMS delivery tracking',
    'customer delivery notification',
  ],
});

export default function SmsNotificationsPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', item: '/' },
    { name: 'SMS Notifications', item: '/sms-notifications' },
  ]);

  const notificationTypes = [
    {
      title: 'Order Created Alert',
      message: 'Habari John! Odha yako #1024 kutoka HOME DECO imeundwa. Fuatilia hapa: lumotrack.lumo.co.tz/track/abc123xyz',
      stage: 'CREATED',
    },
    {
      title: 'Out for Delivery Alert',
      message: 'Dereva wako Ado yuko njiani na mzigo wako! Bonyeza hapa kufuatilia au kumpigia simu: lumotrack.lumo.co.tz/track/abc123xyz',
      stage: 'ON_THE_WAY',
    },
    {
      title: 'Driver Arrived Alert',
      message: 'Dereva wako amewasili karibu na eneo lako! Tafadhali kuwa tayari kupokea mzigo.',
      stage: 'ARRIVED',
    },
    {
      title: 'Delivery Confirmation Receipt',
      message: 'Mzigo wako umewasilishwa kikamilifu. Ahsante kwa kununua kutoka HOME DECO!',
      stage: 'DELIVERED',
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
        {/* Banner */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] text-xs font-mono font-bold uppercase tracking-wider">
            TRANSACTIONAL SMS NOTIFICATIONS
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            SMS Delivery Notifications for Tanzanian Businesses
          </h1>
          <p className="text-base sm:text-lg text-[#A0B8D0] leading-relaxed">
            Automate customer delivery alerts with reliable SMS notifications delivered across Vodacom, Tigo, Airtel, and Halotel networks in Tanzania.
          </p>
        </div>

        {/* SMS Notification Samples */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {notificationTypes.map((notif, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-[#1A3150] pb-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-sm text-white">{notif.title}</h3>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
                  {notif.stage}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-amber-300 border border-slate-800 leading-relaxed">
                "{notif.message}"
              </div>
            </div>
          ))}
        </div>

        {/* Features list */}
        <div className="p-8 rounded-3xl bg-[#112239]/60 border border-[#1F3654] space-y-6">
          <h2 className="text-2xl font-black text-white">Why Tanzanian Merchants Rely on LUMO SMS</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-[#A0B8D0]">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>100% Mobile Reach</span>
              </div>
              <p>Works on basic feature phones (kitochi) as well as smartphones across Tanzania.</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Zap className="w-5 h-5 text-amber-400" />
                <span>Instant Triggering</span>
              </div>
              <p>SMS notifications dispatch within seconds of status change by driver or merchant.</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Smartphone className="w-5 h-5 text-blue-400" />
                <span>One-Tap Web Link</span>
              </div>
              <p>Includes a secure, clickable link pointing to the customer’s branded web tracking portal.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-sm shadow-lg shadow-orange-500/20"
          >
            <span>Start Sending SMS Alerts</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
