import React from 'react';
import Link from 'next/link';
import { Clock, User, ArrowLeft, ArrowRight } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateArticleSchema, generateBreadcrumbSchema } from '@/lib/seo';

export const metadata = constructMetadata({
  title: 'Complete Guide to Delivery Tracking for Tanzanian Businesses | LUMO Blog',
  description:
    'Learn how Tanzanian e-commerce and retail merchants eliminate customer delivery anxiety using automated SMS alerts and app-free web tracking links.',
  canonicalUrl: '/blog/delivery-tracking-tanzania-guide',
  alternateSwahiliUrl: '/sw',
});

export default function Article1Page() {
  const articleSchema = generateArticleSchema({
    title: 'Complete Guide to Delivery Tracking for Tanzanian Businesses',
    description:
      'Learn how Tanzanian e-commerce and retail merchants eliminate customer delivery anxiety using automated SMS alerts and app-free web tracking links.',
    publishedTime: '2026-10-01T08:00:00Z',
    authorName: 'LUMO Logistics Team',
    url: '/blog/delivery-tracking-tanzania-guide',
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', item: '/' },
    { name: 'Blog', item: '/blog' },
    { name: 'Delivery Tracking Guide', item: '/blog/delivery-tracking-tanzania-guide' },
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
            DELIVERY STRATEGY
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            Complete Guide to Delivery Tracking for Tanzanian Businesses
          </h1>
          <div className="flex items-center gap-4 text-xs text-slate-400 border-b border-slate-800 pb-6">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#FF5500]" />
              <span>LUMO Logistics Team</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>October 1, 2026</span>
            </span>
          </div>
        </div>

        <article className="prose prose-invert max-w-none text-slate-300 space-y-6 text-sm sm:text-base leading-relaxed">
          <p>
            In Tanzania’s rapidly growing retail and e-commerce landscape, delivery speed alone is no longer enough. Customers expect real-time transparency into where their order is, when it was dispatched, and who is delivering it.
          </p>

          <h2 className="text-xl font-bold text-white pt-4">The Cost of Delivery Anxiety</h2>
          <p>
            Without automated delivery tracking, merchants face dozens of daily phone calls asking: <em>"Mzigo wangu umefika wapi?"</em>. This creates operational overhead for shop owners and frustration for buyers waiting at home or work.
          </p>

          <h2 className="text-xl font-bold text-white pt-4">Why Zero-Install Web Tracking Wins</h2>
          <p>
            Forcing Tanzanian consumers to download mobile applications for single deliveries creates friction and high drop-off rates. Web-based tracking links sent via SMS or WhatsApp resolve this by opening instantly in any smartphone browser.
          </p>

          <h2 className="text-xl font-bold text-white pt-4">Key Steps to Implementing Delivery Tracking</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Register order details (customer phone, address, item summary).</li>
            <li>Send transactional SMS with clickable tracking token link.</li>
            <li>Allow drivers to update status (On the Way, Arrived) directly via mobile browser.</li>
            <li>Secure handovers using customer 4-digit PIN verification.</li>
          </ul>

          <div className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] my-8 space-y-3">
            <h3 className="font-bold text-white text-base">Transform Your Business Deliveries Today</h3>
            <p className="text-xs text-[#A0B8D0]">
              Start sending automated SMS updates and web tracking links to your Tanzanian customers with LUMO Track.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-xs shadow-md"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
