import React from 'react';
import Link from 'next/link';
import { Package, Bell, Truck, Smartphone, CheckCircle2, ArrowRight } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateBreadcrumbSchema } from '@/lib/seo';

export const metadata = constructMetadata({
  title: 'Jinsi LUMO Track Inavyofanya Kazi | Hatua 5 za Utoaji wa Mzigo',
  description:
    'Jifunze jinsi LUMO Track inavyofanya kazi kwa hatua 5 rahisi: Sajili mzigo, tuma SMS, dereva anaanza safari, mteja anafuatilia, na kukabidhi mzigo.',
  canonicalUrl: '/sw/jinsi-inavyofanya-kazi',
  alternateEnglishUrl: '/how-it-works',
  keywords: [
    'jinsi LUMO inavyofanya kazi',
    'hatua za delivery Tanzania',
    'kufuatilia mzigo Tanzania',
  ],
});

export default function SwahiliJinsiInavyofanyaKaziPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Nyumbani', item: '/sw' },
    { name: 'Jinsi Inavyofanya Kazi', item: '/sw/jinsi-inavyofanya-kazi' },
  ]);

  const steps = [
    { num: '1', title: 'Sajili Mzigo', desc: 'Ingiza taarifa za oda na namba ya simu ya mteja kwenye Dashboard.' },
    { num: '2', title: 'Tuma Arifa', desc: 'Mteja anapokea SMS au WhatsApp yenye Link ya kufuatilia mzigo wake.' },
    { num: '3', title: 'Dereva Anaanza Safari', desc: 'Dereva anabonyeza link kwenye simu yake kuanza safari.' },
    { num: '4', title: 'Mteja Anafuatilia Live', desc: 'Mteja anaona dereva aliko na muda unaokadiriwa kufika.' },
    { num: '5', title: 'Thibitisha Kukabidhi', desc: 'Mzigo unakabidhiwa kwa kuweka PIN ya namba 4 ya mteja.' },
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
            HATUA 5 RAHISI
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Jinsi LUMO Track Inavyofanya Kazi
          </h1>
          <p className="text-base sm:text-lg text-[#A0B8D0] leading-relaxed">
            Njia rahisi na ya kisasa ya kuratibu delivery za biashara yako nchini Tanzania.
          </p>
        </div>

        <div className="space-y-4 max-w-3xl mx-auto">
          {steps.map((s) => (
            <div key={s.num} className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#FF5500]/10 text-[#FF5500] font-mono font-bold flex items-center justify-center shrink-0">
                {s.num}
              </div>
              <div>
                <h2 className="font-bold text-white text-base">{s.title}</h2>
                <p className="text-xs text-[#A0B8D0]">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center space-y-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-sm shadow-lg shadow-orange-500/20"
          >
            <span>Anza Kutumia Sasa</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
