import React from 'react';
import Link from 'next/link';
import { HelpCircle, ChevronDown, ArrowRight } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateBreadcrumbSchema, generateFAQSchema } from '@/lib/seo';

export const metadata = constructMetadata({
  title: 'Frequently Asked Questions (FAQ) | LUMO Track Tanzania',
  description:
    'Find answers to common questions about LUMO Track delivery tracking, SMS notifications, WhatsApp integration, driver workflows, and merchant accounts in Tanzania.',
  canonicalUrl: '/faq',
  alternateSwahiliUrl: '/sw',
  keywords: [
    'LUMO track FAQ',
    'delivery tracking questions Tanzania',
    'SMS delivery FAQ Tanzania',
  ],
});

export default function FAQPage() {
  const faqData = [
    {
      question: 'Do my customers need to download an application to track their delivery?',
      answer:
        'No! LUMO Track is 100% web-based. Customers receive an SMS or WhatsApp message containing a secure link. Tapping the link opens the live delivery tracking portal instantly in their phone browser without installing any app.',
    },
    {
      question: 'Do my drivers need to install an app to update delivery status?',
      answer:
        'No. Drivers receive a lightweight action web link on their mobile phone. They can tap "Start Delivery", "Arrived", or enter the customer PIN code right from their phone browser.',
    },
    {
      question: 'How do customer SMS notifications work in Tanzania?',
      answer:
        'LUMO Track integrates with local telecom networks in Tanzania (Vodacom, Tigo, Airtel, Halotel). Whenever an order is created or status changes, an automated SMS is dispatched to the customer.',
    },
    {
      question: 'Can I display my business logo and shop branding on tracking pages?',
      answer:
        'Yes! Every merchant profile includes custom branding settings. Your shop name, logo, phone number, and brand color will appear prominently on your customer tracking portal.',
    },
    {
      question: 'How does 4-digit PIN delivery verification work?',
      answer:
        'When an order is created, the customer receives a unique 4-digit PIN via SMS. Upon arrival, the driver asks the customer for the PIN and enters it into the portal to confirm handover, preventing disputes.',
    },
  ];

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', item: '/' },
    { name: 'FAQ', item: '/faq' },
  ]);

  const faqSchema = generateFAQSchema(faqData);

  return (
    <div className="min-h-screen bg-[#0B192C] font-sans text-white selection:bg-[#FF5500] selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 space-y-12">
        <div className="text-center space-y-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] text-xs font-mono font-bold uppercase tracking-wider">
            HELP & ANSWERS
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-base sm:text-lg text-[#A0B8D0] leading-relaxed">
            Everything you need to know about LUMO Track delivery notifications and web tracking in Tanzania.
          </p>
        </div>

        <div className="space-y-4">
          {faqData.map((item, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-[#112239] border border-[#1F3654] space-y-2">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-[#FF5500] shrink-0 mt-0.5" />
                <span>{item.question}</span>
              </h2>
              <p className="text-xs sm:text-sm text-[#A0B8D0] leading-relaxed pl-8">{item.answer}</p>
            </div>
          ))}
        </div>

        <div className="text-center space-y-4 pt-6">
          <p className="text-xs text-[#A0B8D0]">Still have questions?</p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-sm shadow-lg shadow-orange-500/20"
          >
            <span>Contact Support</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
