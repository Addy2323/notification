'use client';

import React, { useState } from 'react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Sections';
import { 
  Mail, Phone, MapPin, Clock, Send, 
  CheckCircle2, HelpCircle, ChevronDown, ChevronUp,
  MessageSquare, Sparkles, Building2
} from 'lucide-react';
import Link from 'next/link';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    businessType: 'E-Commerce Merchant',
    subject: '',
    message: ''
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.message) return;
    setIsSubmitted(true);
  };

  const faqs = [
    {
      q: "How fast can I start dispatching notifications?",
      a: "You can sign up and send your first SMS or WhatsApp delivery notification in under 5 minutes using our web dashboard or REST API."
    },
    {
      q: "Do my customers need to download an app?",
      a: "No! All customer tracking links open directly in their mobile web browser. No download, registration, or password is required."
    },
    {
      q: "Does LUMO support WhatsApp Business integration?",
      a: "Yes! LUMO integrates with official WhatsApp Business API gateways to deliver rich notification cards with interactive 'View Live Map' buttons."
    },
    {
      q: "Which regions in Tanzania does LUMO cover?",
      a: "LUMO's notification system works nationwide across Tanzania, including Dar es Salaam, Arusha, Mwanza, Zanzibar, Dodoma, and regional hubs."
    },
    {
      q: "What are the pricing options for high-volume merchants?",
      a: "We offer flexible pay-as-you-go pricing as well as enterprise custom packages for fleet managers dispatching over 1,000 orders daily."
    }
  ];

  return (
    <div className="min-[#0B192C] bg-[#0B192C] text-white selection:bg-[#FF5500] selection:text-white font-sans antialiased overflow-x-hidden">
      
      {/* Header Navigation */}
      <Header />

      <main className="w-full">
        
        {/* ==========================================================================
           1. HERO SECTION
           ========================================================================== */}
        <section className="relative overflow-hidden bg-lumo-grid pt-8 pb-12 sm:pt-12 sm:pb-16">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-[#0B192C]/60 to-transparent pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-4">
            
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/40 text-[#FF5500] text-xs font-black uppercase tracking-widest shadow-sm">
              <MessageSquare className="w-4 h-4" />
              <span>GET IN TOUCH</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
              Contact LUMO Support & Sales
            </h1>

            <p className="text-base sm:text-lg text-[#A0B8D0] max-w-xl mx-auto leading-relaxed">
              Have questions about integrating delivery notifications? Our team in Dar es Salaam is ready to assist you.
            </p>

          </div>
        </section>

        {/* ==========================================================================
           2. CONTACT FORM & INFO GRID
           ========================================================================== */}
        <section className="py-12 sm:py-20 bg-[#0B192C]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
              
              {/* Left Column: Interactive Contact Form */}
              <div className="lg:col-span-7 bg-[#112239]/90 border border-[#1E3A5F] rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
                
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">Send Us a Message</h3>
                  <p className="text-xs sm:text-sm text-[#A0B8D0]">Fill out the form below and our team will get back to you within 2 business hours.</p>
                </div>

                {isSubmitted ? (
                  <div className="bg-[#FF5500]/10 border border-[#FF5500]/50 rounded-xl p-6 text-center space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-[#FF5500] mx-auto" />
                    <h4 className="text-xl font-bold text-white">Message Sent Successfully!</h4>
                    <p className="text-xs sm:text-sm text-[#A0B8D0]">
                      Thank you for reaching out to LUMO. A delivery specialist will contact you at <span className="text-white font-bold">{formData.email}</span> shortly.
                    </p>
                    <button
                      onClick={() => {
                        setIsSubmitted(false);
                        setFormData({ fullName: '', email: '', phone: '', businessType: 'E-Commerce Merchant', subject: '', message: '' });
                      }}
                      className="mt-2 text-xs font-bold text-[#FF5500] underline hover:text-white"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#C0D5EC] uppercase tracking-wider block">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          placeholder="e.g. Hassan Mwinyi"
                          className="w-full bg-[#081220] border border-[#1C365A] focus:border-[#FF5500] rounded-lg px-4 py-3 text-sm text-white placeholder-[#5A7290] outline-none transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#C0D5EC] uppercase tracking-wider block">Work Email *</label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="hassan@merchant.co.tz"
                          className="w-full bg-[#081220] border border-[#1C365A] focus:border-[#FF5500] rounded-lg px-4 py-3 text-sm text-white placeholder-[#5A7290] outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#C0D5EC] uppercase tracking-wider block">Phone Number</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+255 784 000 111"
                          className="w-full bg-[#081220] border border-[#1C365A] focus:border-[#FF5500] rounded-lg px-4 py-3 text-sm text-white placeholder-[#5A7290] outline-none transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#C0D5EC] uppercase tracking-wider block">Business Type</label>
                        <select
                          value={formData.businessType}
                          onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                          className="w-full bg-[#081220] border border-[#1C365A] focus:border-[#FF5500] rounded-lg px-4 py-3 text-sm text-white outline-none transition-colors"
                        >
                          <option value="E-Commerce Merchant">E-Commerce Merchant</option>
                          <option value="Retail & Supermarket">Retail & Supermarket</option>
                          <option value="Restaurant / Food Delivery">Restaurant / Food Delivery</option>
                          <option value="Courier / Logistics Fleet">Courier / Logistics Fleet</option>
                          <option value="Developer / API Integration">Developer / API Integration</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#C0D5EC] uppercase tracking-wider block">Subject</label>
                      <input
                        type="text"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="Inquiry about WhatsApp notifications & pricing"
                        className="w-full bg-[#081220] border border-[#1C365A] focus:border-[#FF5500] rounded-lg px-4 py-3 text-sm text-white placeholder-[#5A7290] outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#C0D5EC] uppercase tracking-wider block">Message *</label>
                      <textarea
                        required
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Tell us about your daily order volume and notification requirements..."
                        className="w-full bg-[#081220] border border-[#1C365A] focus:border-[#FF5500] rounded-lg px-4 py-3 text-sm text-white placeholder-[#5A7290] outline-none transition-colors resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-4 rounded-xl bg-[#FF5500] hover:bg-[#E04B00] text-white font-extrabold text-base shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                    >
                      <Send className="w-4 h-4" />
                      <span>Send Message</span>
                    </button>

                  </form>
                )}

              </div>

              {/* Right Column: Direct Contact Info & Office Cards */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Office Location Card */}
                <div className="bg-[#112239] border border-[#1E3A5F] rounded-2xl p-6 space-y-4">
                  <div className="w-10 h-10 rounded-lg bg-[#0B192C] border border-[#1C365A] flex items-center justify-center text-[#FF5500]">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">Head Office Location</h4>
                    <p className="text-xs text-[#A0B8D0] leading-relaxed">
                      LUMO Technologies Ltd.<br />
                      New Bagamoyo Road, Victoria Plaza<br />
                      Dar es Salaam, Tanzania
                    </p>
                  </div>
                </div>

                {/* Email Support Card */}
                <div className="bg-[#112239] border border-[#1E3A5F] rounded-2xl p-6 space-y-4">
                  <div className="w-10 h-10 rounded-lg bg-[#0B192C] border border-[#1C365A] flex items-center justify-center text-[#FF5500]">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">Email Contacts</h4>
                    <p className="text-xs text-[#A0B8D0] space-y-1">
                      <span className="block"><strong className="text-white">Support:</strong> support@lumo.co.tz</span>
                      <span className="block"><strong className="text-white">Sales & Enterprise:</strong> sales@lumo.co.tz</span>
                    </p>
                  </div>
                </div>

                {/* Phone & Hours Card */}
                <div className="bg-[#112239] border border-[#1E3A5F] rounded-2xl p-6 space-y-4">
                  <div className="w-10 h-10 rounded-lg bg-[#0B192C] border border-[#1C365A] flex items-center justify-center text-[#FF5500]">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">Hotline & Hours</h4>
                    <p className="text-xs text-[#A0B8D0] space-y-1">
                      <span className="block text-white font-bold">+255 784 000 111 / +255 754 000 222</span>
                      <span className="block text-[#8A9EB8]">Monday – Saturday: 8:00 AM – 7:00 PM EAT</span>
                    </p>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </section>

        {/* ==========================================================================
           3. FAQ ACCORDION SECTION
           ========================================================================== */}
        <section className="py-16 sm:py-24 bg-[#081220] border-t border-[#182B46]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/40 text-[#FF5500] text-xs font-bold uppercase tracking-wider">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>FREQUENTLY ASKED QUESTIONS</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Got Questions? We Have Answers
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div 
                    key={index}
                    className="bg-[#112239] border border-[#1E3A5F] rounded-xl overflow-hidden transition-colors"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-white hover:text-[#FF5500] transition-colors"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-[#FF5500] shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-[#8A9EB8] shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-[#A0B8D0] leading-relaxed border-t border-[#182B46]/60">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </section>

      </main>

      {/* Footer */}
      <Footer />

    </div>
  );
}
