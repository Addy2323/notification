import React from 'react';
import Link from 'next/link';
import { Package, Smartphone, MessageSquare, Truck, ShieldCheck, ArrowRight, CheckCircle2, Globe } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateBreadcrumbSchema } from '@/lib/seo';

export const metadata = constructMetadata({
  title: 'Mfumo wa Kufuatilia Mizigo na Arifa za SMS Tanzania | LUMO Track',
  description:
    'LUMO Track inasaidia wafanyabiashara wa Tanzania kutuma arifa za SMS na WhatsApp kwa wateja na kuwapa uwezo wa kufuatilia mizigo yao live bila kudownload app.',
  canonicalUrl: '/sw',
  alternateEnglishUrl: '/',
  keywords: [
    'kufuatilia mizigo Tanzania',
    'arifa za SMS Tanzania',
    'mfumo wa delivery Tanzania',
    'tracking ya mzigo Dar es Salaam',
  ],
});

export default function SwahiliHomePage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Nyumbani', item: '/sw' },
  ]);

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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider">
            <Globe className="w-3.5 h-3.5" />
            <span>SWAHILI VERSION • TANZANIA</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Kufuatilia Mizigo & Arifa za Delivery kwa Wafanyabiashara Tanzania
          </h1>
          <p className="text-base sm:text-lg text-[#A0B8D0] leading-relaxed">
            Wajulishe wateja wako kuanzia mzigo unapotoka dukani mpaka kufika mlangoni kwao kupitia SMS, WhatsApp, na Link ya bure ya wavuti — bila kudownload App.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-sm shadow-lg shadow-orange-500/20"
            >
              Anza Bure Sasa
            </Link>
            <Link
              href="/sw/fuatilia-mizigo"
              className="px-8 py-3.5 rounded-xl bg-[#162C4A] border border-[#2D4D77] text-white font-bold text-sm"
            >
              Fuatilia Mzigo
            </Link>
          </div>
        </div>

        {/* Feature Cards in Swahili */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl bg-[#112239] border border-[#1F3654] space-y-3">
            <MessageSquare className="w-8 h-8 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Arifa za SMS & WhatsApp</h2>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">
              Mteja anapokea ujumbe wa SMS au WhatsApp papo hapo pindi mzigo unaposafirishwa au dereva anapokaribia.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-[#112239] border border-[#1F3654] space-y-3">
            <Smartphone className="w-8 h-8 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Link ya Wavuti (Bila App)</h2>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">
              Mteja anabonyeza link iliyopo kwenye SMS na kuona hali ya mzigo wake live kwenye browser ya simu bila kujiandikisha au kudownload app.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-[#112239] border border-[#1F3654] space-y-3">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Namba ya Siri ya PIN (OTP)</h2>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">
              Ondoa migogoro ya upotevu wa mizigo. Dereva anathibitisha kukabidhi mzigo kwa kuweka PIN ya namba 4 ya mteja.
            </p>
          </div>
        </div>

        {/* Swahili Navigation Links */}
        <div className="p-8 rounded-3xl bg-[#112239]/60 border border-[#1F3654] text-center space-y-4">
          <h2 className="text-xl font-bold text-white">Kurasa za Kiswahili</h2>
          <div className="flex flex-wrap justify-center gap-4 text-xs font-bold text-amber-400">
            <Link href="/sw/fuatilia-mizigo" className="hover:underline">Fuatilia Mizigo</Link>
            <span>•</span>
            <Link href="/sw/arifa-za-delivery" className="hover:underline">Arifa za SMS na Delivery</Link>
            <span>•</span>
            <Link href="/sw/jinsi-inavyofanya-kazi" className="hover:underline">Jinsi Inavyofanya Kazi</Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
