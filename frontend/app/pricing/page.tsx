import React from 'react';
import Link from 'next/link';
import { Check, Zap, Shield, HelpCircle, ArrowRight } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { constructMetadata, generateBreadcrumbSchema } from '@/lib/seo';

export const metadata = constructMetadata({
  title: 'Pricing Plans & Packages | LUMO Track Tanzania',
  description:
    'Flexible delivery notification and tracking plans for Tanzanian merchants. Start free with pay-as-you-go SMS credits and zero hidden fees.',
  canonicalUrl: '/pricing',
  alternateSwahiliUrl: '/sw',
  keywords: [
    'LUMO pricing Tanzania',
    'delivery software cost Tanzania',
    'SMS delivery notification credits',
  ],
});

export default function PricingPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', item: '/' },
    { name: 'Pricing', item: '/pricing' },
  ]);

  const plans = [
    {
      name: 'Starter Merchant',
      price: 'Free',
      period: 'Forever',
      desc: 'Ideal for small social sellers and new merchants starting delivery notifications.',
      features: [
        'Up to 50 Deliveries/month',
        'App-Free Customer Tracking Link',
        'Mobile Driver Action Portal',
        'Basic SMS Alerts',
        'Merchant Dashboard Access',
      ],
      cta: 'Get Started Free',
      popular: false,
    },
    {
      name: 'Growth Business',
      price: 'Pay-As-You-Go',
      period: 'Per Delivery / SMS',
      desc: 'For growing Tanzanian shops requiring WhatsApp alerts and custom branding.',
      features: [
        'Unlimited Monthly Deliveries',
        'Automated SMS & WhatsApp Alerts',
        'Custom Merchant Logo & Colors',
        '4-Digit PIN Handover Verification',
        'Driver Call & Chat Connectivity',
        'Priority Merchant Support',
      ],
      cta: 'Start Growth Plan',
      popular: true,
    },
    {
      name: 'Enterprise Fleet',
      price: 'Custom',
      period: 'Contact Sales',
      desc: 'For courier companies and large delivery fleets managing multiple drivers.',
      features: [
        'Dedicated SMS Gateway',
        'Custom WhatsApp Business Bot',
        'Unlimited Driver Accounts',
        'Advanced Analytics & Audit Logs',
        '24/7 Dedicated Account Manager',
      ],
      cta: 'Contact Sales',
      popular: false,
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
            TRANSPARENT PRICING
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Simple, Transparent Pricing Plans
          </h1>
          <p className="text-base sm:text-lg text-[#A0B8D0] leading-relaxed">
            No expensive setup fees or contracts. Start free and pay only for the notifications you send.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((p, idx) => (
            <div
              key={idx}
              className={`p-8 rounded-3xl bg-[#112239] border relative space-y-6 flex flex-col justify-between ${
                p.popular ? 'border-[#FF5500] shadow-2xl shadow-orange-500/10' : 'border-[#1F3654]'
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#FF5500] text-white text-[10px] font-black uppercase tracking-widest">
                  Most Popular
                </span>
              )}

              <div className="space-y-4">
                <h2 className="text-xl font-bold text-white">{p.name}</h2>
                <div>
                  <span className="text-3xl sm:text-4xl font-black text-white">{p.price}</span>
                  <span className="text-xs text-[#A0B8D0] block mt-1">{p.period}</span>
                </div>
                <p className="text-xs text-[#A0B8D0] leading-relaxed">{p.desc}</p>
                <div className="space-y-2 pt-2">
                  {p.features.map((f, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-2 text-xs text-slate-300">
                      <Check className="w-4 h-4 text-[#FF5500] shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href="/register"
                className={`w-full py-3.5 rounded-xl font-extrabold text-xs text-center transition-all shadow-md block ${
                  p.popular
                    ? 'bg-[#FF5500] hover:bg-[#E04B00] text-white shadow-orange-500/20'
                    : 'bg-[#162C4A] hover:bg-[#1F3E68] text-white border border-[#2D4D77]'
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
