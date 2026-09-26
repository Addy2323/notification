'use client';

import React from 'react';
import Link from 'next/link';
import { Truck, MessageSquare, Search, ArrowRight, Play, MapPin, Shield, CheckCircle } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-teal-700 selection:text-white flex flex-col">
      {/* Navigation Header */}
      <header className="max-w-6xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-full bg-teal-800 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5 text-white stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              <circle cx="12" cy="12" r="4" fill="currentColor" />
            </svg>
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-900">LUMO</span>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
          <Link href="#how-it-works" className="hover:text-teal-800 transition-colors">How It Works</Link>
          <Link href="/login" className="hover:text-teal-800 transition-colors">Log In</Link>
        </nav>

        {/* Right CTA Button */}
        <Link
          href="/login"
          className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
        >
          <span>Get Started</span>
        </Link>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 pt-10 pb-20 flex flex-col items-center text-center">
        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-slate-900 tracking-tight leading-[1.15] max-w-3xl">
          Automated Delivery SMS <br className="hidden sm:inline" />
          <span className="font-sans font-extrabold text-slate-900">& Real-Time Tracking.</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-4 text-sm sm:text-base font-medium text-slate-500 max-w-xl">
          Zero app downloads required for drivers or customers.
        </p>



        {/* Center Visual Mockup Box */}
        <div className="mt-14 w-full max-w-4xl rounded-3xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="bg-white border border-slate-200/50 rounded-[2rem] shadow-[0_20px_50px_rgb(0,0,0,0.05)] p-4 sm:p-6 min-h-[380px] flex flex-col md:flex-row gap-6 relative overflow-hidden">
            {/* Ambient Background Gradient Orb */}
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-100/50 rounded-full blur-[100px] pointer-events-none"></div>

            {/* Map & Live Parcel Tracking List (Left Box) */}
            <div className="flex-1 bg-white/60 backdrop-blur-xl border border-white shadow-lg shadow-slate-100/50 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
              {/* Simulated Map Graphic Lines */}
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#059669_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.07]"></div>
              
              {/* Top Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-teal-800 flex items-center justify-center text-white text-[11px] font-black shadow-sm">
                    L
                  </div>
                  <span className="font-bold text-sm text-slate-800 tracking-tight">LUMO</span>
                </div>
                <span className="text-[10px] font-mono font-semibold text-slate-400 bg-slate-100/80 px-2 py-1 rounded-md">#50904009000502</span>
              </div>

              {/* Status List */}
              <div className="space-y-3 my-5 relative z-10">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Live Parcel Tracking</div>
                
                <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-transform hover:-translate-y-0.5">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold text-slate-800">Live Resothel</span>
                  </div>
                  <span className="text-[10px] font-mono font-medium text-slate-400">2:15 PM</span>
                </div>

                <div className="flex items-center justify-between bg-white/60 p-3 rounded-xl border border-transparent hover:bg-white/80 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
                    </span>
                    <span className="text-xs font-bold text-slate-700">Line Masah 50</span>
                  </div>
                  <span className="text-[10px] font-mono font-medium text-slate-400">1:55 PM</span>
                </div>

                <div className="flex items-center justify-between bg-transparent p-3 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                    <span className="text-xs font-semibold text-slate-500">Line Mombasi</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">1:10 PM</span>
                </div>

                <div className="flex items-center justify-between bg-transparent p-3 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                    <span className="text-xs font-semibold text-slate-500">Line Kisoni 02</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">12:30 PM</span>
                </div>
              </div>

              {/* Footer status */}
              <div className="pt-3 border-t border-slate-100 text-[11px] font-bold text-emerald-600 flex items-center gap-1.5 relative z-10 px-1 hover:text-emerald-500 transition-colors cursor-pointer">
                <CheckCircle className="w-4 h-4 animate-pulse" />
                <span>New Notifications Syncing...</span>
              </div>
            </div>

            {/* Smartphone Mockup with Instant SMS (Right Box) */}
            <div className="w-full md:w-[280px] bg-slate-900 border-[8px] border-slate-800 rounded-[2.5rem] p-5 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden group">
              {/* Screen Glare Effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-50 pointer-events-none"></div>

              {/* Phone Header Time & Notch */}
              <div className="flex items-center justify-between text-[11px] font-mono font-medium text-slate-300 mb-8 relative z-10">
                <span>9:41</span>
                <div className="w-16 h-4 rounded-full bg-black absolute left-1/2 -translate-x-1/2 top-[-10px]"></div>
                <span>5G</span>
              </div>

              {/* Floating Instant SMS Notification Card */}
              <div className="bg-white/10 border border-white/20 rounded-2xl p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-xl relative z-10 transform transition-transform duration-300 group-hover:scale-[1.02]">
                <div className="flex items-center justify-between text-[10px] font-bold text-white mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                      <MessageSquare className="w-3 h-3 text-white fill-white" />
                    </div>
                    <span>Instant SMS notification</span>
                  </div>
                  <span className="text-white/60 font-medium">Now</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-200 mt-2 font-medium">
                  Your parcel tracking SMS is about your package. The text message notification confirm.
                </p>
              </div>

              {/* Phone Bottom Home Bar */}
              <div className="mt-12 flex justify-center relative z-10">
                <div className="w-28 h-1.5 rounded-full bg-slate-700/50"></div>
              </div>
            </div>
          </div>
        </div>

        {/* 3-Step Process Flow Section */}
        <div id="how-it-works" className="mt-20 w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {/* Step 1 */}
          <div className="flex flex-col items-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shadow-xs border border-teal-100">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">1. Dispatch</h3>
            <p className="text-xs font-medium text-slate-500 max-w-xs leading-relaxed">
              Dispatch customer to written drivers or delivery dispatch.
            </p>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shadow-xs border border-teal-100">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">2. Notify via SMS</h3>
            <p className="text-xs font-medium text-slate-500 max-w-xs leading-relaxed">
              Notify via SMS no app required for drivers or customers.
            </p>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shadow-xs border border-teal-100">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">3. Live Track</h3>
            <p className="text-xs font-medium text-slate-500 max-w-xs leading-relaxed">
              Real-time tracking and text message notification.
            </p>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-slate-100 py-6 text-center text-xs text-slate-400">
        <p>© 2026 LUMO (LotusRise Company Limited). All rights reserved.</p>
      </footer>
    </div>
  );
}
