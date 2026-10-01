import React from 'react';
import Link from 'next/link';
import { Shield, Globe, Award, Heart, CheckCircle2, ArrowRight } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateBreadcrumbSchema } from '@/lib/seo';

export const metadata = constructMetadata({
  title: 'About LUMO Track | East Africa Delivery Communication Platform',
  description:
    'LUMO Track is a product of LotusRise Limited dedicated to modernizing last-mile delivery tracking and customer communication in Tanzania and East Africa.',
  canonicalUrl: '/about',
  alternateSwahiliUrl: '/sw',
  keywords: [
    'About LUMO Track',
    'LotusRise Limited Tanzania',
    'delivery technology Dar es Salaam',
  ],
});

export default function AboutPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', item: '/' },
    { name: 'About Us', item: '/about' },
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
            ABOUT LOTUSRISE & LUMO
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Connecting Merchants & Buyers Across Tanzania
          </h1>
          <p className="text-base sm:text-lg text-[#A0B8D0] leading-relaxed">
            LUMO Track was built to solve last-mile delivery anxiety for Tanzanian businesses by providing zero-install web tracking links and automated transactional notifications.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <Globe className="w-8 h-8 text-amber-400" />
            <h2 className="text-lg font-bold text-white">East Africa Focus</h2>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">
              Designed specifically for local merchant workflows, mobile phone usage, and delivery realities across Dar es Salaam, Arusha, Mwanza, and beyond.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <Shield className="w-8 h-8 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Zero App Friction</h2>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">
              Neither drivers nor customers need to install an app. Everything works seamlessly inside the mobile browser over lightweight mobile networks.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-3">
            <Award className="w-8 h-8 text-purple-400" />
            <h2 className="text-lg font-bold text-white">LotusRise Excellence</h2>
            <p className="text-xs text-[#A0B8D0] leading-relaxed">
              Backed by LotusRise Limited, focused on building enterprise digital infrastructure and high-reliability platform software.
            </p>
          </div>
        </div>

        <div className="text-center space-y-4">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-sm shadow-lg shadow-orange-500/20"
          >
            <span>Get in Touch With Us</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
