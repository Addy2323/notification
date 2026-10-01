import React from 'react';
import Link from 'next/link';
import { BookOpen, Clock, User, ArrowRight } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateBreadcrumbSchema } from '@/lib/seo';

export const metadata = constructMetadata({
  title: 'Logistics & Delivery Tracking Insights Blog | LUMO Track',
  description:
    'Read expert articles, guides, and insights on delivery tracking, customer communication, SMS notifications, and last-mile logistics in Tanzania and East Africa.',
  canonicalUrl: '/blog',
  alternateSwahiliUrl: '/sw',
});

export default function BlogIndexPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', item: '/' },
    { name: 'Blog', item: '/blog' },
  ]);

  const articles = [
    {
      slug: 'delivery-tracking-tanzania-guide',
      title: 'Complete Guide to Delivery Tracking for Tanzanian Businesses',
      excerpt:
        'Discover how modern Tanzanian merchants eliminate customer delivery calls and build buyer trust using zero-install web tracking links and automated SMS alerts.',
      date: 'October 1, 2026',
      readTime: '5 min read',
      author: 'LUMO Logistics Team',
      category: 'Delivery Strategy',
    },
    {
      slug: 'sms-notifications-customer-communication',
      title: 'How SMS Notifications Improve Customer Trust in Last-Mile Logistics',
      excerpt:
        'Explore why SMS delivery notifications boast a 98% open rate in East Africa and how automated status alerts convert first-time buyers into loyal repeat customers.',
      date: 'September 28, 2026',
      readTime: '4 min read',
      author: 'LUMO Product Team',
      category: 'Customer Experience',
    },
    {
      slug: 'whatsapp-delivery-notifications-guide',
      title: 'Why WhatsApp Delivery Notifications Outperform Traditional Tracking',
      excerpt:
        'Learn how sending rich WhatsApp notification cards with shop logos, driver contact options, and one-tap tracking buttons elevates customer satisfaction.',
      date: 'September 25, 2026',
      readTime: '6 min read',
      author: 'LUMO Marketing Team',
      category: 'WhatsApp Automation',
    },
    {
      slug: 'track-deliveries-without-app',
      title: 'How to Track Deliveries Without Forcing App Downloads',
      excerpt:
        'App fatigue is real. Learn why web-based, zero-install tracking links outperform mobile applications for last-mile customer communication in Tanzania.',
      date: 'September 20, 2026',
      readTime: '5 min read',
      author: 'LUMO Tech Team',
      category: 'Mobile UX',
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
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] text-xs font-mono font-bold uppercase tracking-wider">
            LOGISTICS & DISPATCH INSIGHTS
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Delivery Tracking & Customer Communication Blog
          </h1>
          <p className="text-base sm:text-lg text-[#A0B8D0] leading-relaxed">
            Practical guides, logistics strategies, and technical insights for merchants and delivery operators in Tanzania and East Africa.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {articles.map((art) => (
            <div
              key={art.slug}
              className="p-8 rounded-3xl bg-[#112239] border border-[#1F3654] hover:border-[#FF5500]/50 transition-all hover:-translate-y-1 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-amber-400">
                  <span>{art.category}</span>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{art.readTime}</span>
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white hover:text-[#FF5500] transition-colors">
                  <Link href={`/blog/${art.slug}`}>{art.title}</Link>
                </h2>
                <p className="text-xs sm:text-sm text-[#A0B8D0] leading-relaxed">{art.excerpt}</p>
              </div>

              <div className="pt-4 border-t border-[#1F3654] flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#FF5500]" />
                  <span>{art.author}</span>
                </span>
                <Link
                  href={`/blog/${art.slug}`}
                  className="text-xs font-extrabold text-[#FF5500] hover:underline flex items-center gap-1"
                >
                  <span>Read Article</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
