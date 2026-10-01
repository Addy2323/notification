import React from 'react';
import Link from 'next/link';
import { Phone, Mail, MapPin, MessageSquare, Clock, ArrowRight } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateBreadcrumbSchema } from '@/lib/seo';

export const metadata = constructMetadata({
  title: 'Contact LUMO Support | Tanzania Sales & Customer Care',
  description:
    'Get in touch with LUMO Track support team in Dar es Salaam, Tanzania. Phone: +255 711 788 830, Email: support@lumo.co.tz.',
  canonicalUrl: '/contact',
  alternateSwahiliUrl: '/sw',
  keywords: [
    'LUMO track contact',
    'LUMO track phone number Tanzania',
    'LUMO track support Dar es Salaam',
  ],
});

export default function ContactPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', item: '/' },
    { name: 'Contact Us', item: '/contact' },
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
            GET IN TOUCH
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Contact LUMO Track Support
          </h1>
          <p className="text-base sm:text-lg text-[#A0B8D0] leading-relaxed">
            Have questions about delivery tracking, SMS notification packages, or merchant onboarding in Tanzania? We are here to help.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl bg-[#112239] border border-[#1F3654] space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Phone className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Phone Support</h2>
            <p className="text-xs text-[#A0B8D0]">Speak directly to our Tanzanian merchant support team.</p>
            <a href="tel:+255711788830" className="text-sm font-mono font-extrabold text-[#FF5500] hover:underline block">
              +255 711 788 830
            </a>
          </div>

          <div className="p-8 rounded-3xl bg-[#112239] border border-[#1F3654] space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">WhatsApp Business</h2>
            <p className="text-xs text-[#A0B8D0]">Chat with our sales & technical support on WhatsApp.</p>
            <a
              href="https://wa.me/255711788830"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono font-extrabold text-emerald-400 hover:underline block"
            >
              WhatsApp Us (+255711788830)
            </a>
          </div>

          <div className="p-8 rounded-3xl bg-[#112239] border border-[#1F3654] space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center">
              <Mail className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Email Address</h2>
            <p className="text-xs text-[#A0B8D0]">Send your inquiries to our team.</p>
            <a href="mailto:support@lumo.co.tz" className="text-sm font-mono font-extrabold text-blue-400 hover:underline block">
              support@lumo.co.tz
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
