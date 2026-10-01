import React from 'react';
import Link from 'next/link';
import { Clock, User, ArrowLeft, ArrowRight } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateArticleSchema, generateBreadcrumbSchema } from '@/lib/seo';

export const metadata = constructMetadata({
  title: 'Why WhatsApp Delivery Notifications Outperform Traditional Tracking | LUMO Blog',
  description:
    'Learn how WhatsApp messaging cards with merchant branding and one-tap web links drive customer satisfaction.',
  canonicalUrl: '/blog/whatsapp-delivery-notifications-guide',
  alternateSwahiliUrl: '/sw',
});

export default function Article3Page() {
  const articleSchema = generateArticleSchema({
    title: 'Why WhatsApp Delivery Notifications Outperform Traditional Tracking',
    description:
      'Learn how WhatsApp messaging cards with merchant branding and one-tap web links drive customer satisfaction.',
    publishedTime: '2026-09-25T08:00:00Z',
    authorName: 'LUMO Marketing Team',
    url: '/blog/whatsapp-delivery-notifications-guide',
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', item: '/' },
    { name: 'Blog', item: '/blog' },
    { name: 'WhatsApp Notifications Guide', item: '/blog/whatsapp-delivery-notifications-guide' },
  ]);

  return (
    <div className="min-h-screen bg-[#0B192C] font-sans text-white selection:bg-[#FF5500] selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 space-y-8">
        <Link href="/blog" className="inline-flex items-center gap-2 text-xs font-bold text-[#FF5500] hover:underline">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Blog Index</span>
        </Link>

        <div className="space-y-4">
          <span className="px-3 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] text-xs font-mono font-bold">
            WHATSAPP AUTOMATION
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            Why WhatsApp Delivery Notifications Outperform Traditional Tracking
          </h1>
          <div className="flex items-center gap-4 text-xs text-slate-400 border-b border-slate-800 pb-6">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#FF5500]" />
              <span>LUMO Marketing Team</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>September 25, 2026</span>
            </span>
          </div>
        </div>

        <article className="prose prose-invert max-w-none text-slate-300 space-y-6 text-sm sm:text-base leading-relaxed">
          <p>
            WhatsApp is the default communication tool across East Africa. Leveraging WhatsApp for delivery updates allows merchants to meet customers where they already spend their time.
          </p>

          <h2 className="text-xl font-bold text-white pt-4">Rich Media & Branding</h2>
          <p>
            Unlike plain text, WhatsApp notification cards include merchant logos, item titles, driver phone buttons, and quick tracking action links.
          </p>

          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] my-8 space-y-3">
            <h3 className="font-bold text-white text-base">Leverage WhatsApp Dispatch</h3>
            <p className="text-xs text-[#A0B8D0]">
              Enable WhatsApp delivery updates for your shop with LUMO Track.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-xs shadow-md"
            >
              <span>Enable WhatsApp Alerts</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
