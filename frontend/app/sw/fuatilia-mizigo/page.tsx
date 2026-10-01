import React from 'react';
import Link from 'next/link';
import { Package, Truck, MapPin, CheckCircle2, ArrowRight } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateBreadcrumbSchema } from '@/lib/seo';

export const metadata = constructMetadata({
  title: 'Mfumo wa Kufuatilia Mizigo Tanzania | LUMO Track',
  description:
    'Fuatilia mizigo yako ya biashara au wateja kwa urahisi nchini Tanzania. Pata taarifa za utoaji wa mzigo kuanzia duka mpaka mlangoni.',
  canonicalUrl: '/sw/fuatilia-mizigo',
  alternateEnglishUrl: '/delivery-tracking',
  keywords: [
    'kufuatilia mizigo Tanzania',
    'mfumo wa tracking Tanzania',
    'kufuatilia mzigo Dar es Salaam',
  ],
});

export default function SwahiliFuatiliaMizigoPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Nyumbani', item: '/sw' },
    { name: 'Fuatilia Mizigo', item: '/sw/fuatilia-mizigo' },
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
          <span className="inline-flex items-[#FF5500] px-3 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] text-xs font-mono font-bold uppercase tracking-wider">
            KUFUATILIA MZIGO TANZANIA
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Mfumo wa Kufuatilia Mizigo kwa Wafanyabiashara Tanzania
          </h1>
          <p className="text-base sm:text-lg text-[#A0B8D0] leading-relaxed">
            Wape wateja wako amani ya moyo kwa kuwapa link ya kufuatilia mzigo wao live kupitia simu yoyote.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <Package className="w-6 h-6 text-amber-400" />
            <h3 className="font-bold text-white">1. Mzigo Umeandaliwa</h3>
            <p className="text-xs text-[#A0B8D0]">Mfanyabiashara anasajili oda na kuingiza namba ya mteja.</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <Truck className="w-6 h-6 text-blue-400" />
            <h3 className="font-bold text-white">2. Uko Njiani</h3>
            <p className="text-xs text-[#A0B8D0]">Dereva anaanza safari na mteja anapokea SMS yenye Link.</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <MapPin className="w-6 h-6 text-emerald-400" />
            <h3 className="font-bold text-white">3. Amewasili Karibu</h3>
            <p className="text-xs text-[#A0B8D0]">Dereva anapofika karibu mteja anapokea arifa ya kujiandaa.</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <CheckCircle2 className="w-6 h-6 text-purple-400" />
            <h3 className="font-bold text-white">4. Umekabidhiwa</h3>
            <p className="text-xs text-[#A0B8D0]">Mzigo unakabidhiwa kwa namba ya siri ya PIN ya mteja.</p>
          </div>
        </div>

        <div className="text-center space-y-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-sm shadow-lg shadow-orange-500/20"
          >
            <span>Anza Kutumia LUMO Track</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
