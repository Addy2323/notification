'use client';

import React from 'react';
import { 
  Truck, ShieldCheck, MapPin, Smartphone, Zap, 
  CheckCircle2, Bell, Globe, Sparkles 
} from 'lucide-react';

export function MarqueeTicker() {
  const items = [
    { icon: Zap, label: "10,000+ Daily Dispatches", highlight: "Automated" },
    { icon: ShieldCheck, label: "99.8% On-Time", highlight: "Notification Reliability" },
    { icon: Smartphone, label: "Zero App Download", highlight: "Instant Web Access" },
    { icon: MapPin, label: "Real-Time Status", highlight: "Zero-Install Web Portal" },
    { icon: CheckCircle2, label: "4-Digit OTP", highlight: "Confirmed Fulfillment" },
    { icon: Globe, label: "East Africa Coverage", highlight: "Tanzania & Kenya" },
    { icon: Bell, label: "Multichannel Alerts", highlight: "SMS & WhatsApp" },
    { icon: Truck, label: "Fleet Optimization", highlight: "Live Driver Dispatch" },
  ];

  // Duplicate items array twice for seamless 100% infinite loop
  const marqueeItems = [...items, ...items];

  return (
    <div className="w-full bg-[#081220] border-y border-[#182B46] py-4 relative overflow-hidden select-none">
      
      {/* Left Gradient Mask Fade */}
      <div className="absolute top-0 bottom-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-[#081220] to-transparent z-10 pointer-events-none" />
      
      {/* Right Gradient Mask Fade */}
      <div className="absolute top-0 bottom-0 right-0 w-16 sm:w-32 bg-gradient-to-l from-[#081220] to-transparent z-10 pointer-events-none" />

      {/* Infinite Horizontal Scrolling Track */}
      <div className="animate-marquee flex items-center gap-6 sm:gap-10">
        {marqueeItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[#112239]/70 border border-[#1E3A5F] hover:border-[#FF5500]/50 hover:bg-[#112239] transition-all hover:scale-105 active:scale-95 shrink-0 group cursor-default shadow-sm"
            >
              <div className="w-7 h-7 rounded-lg bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#FF5500] group-hover:text-white transition-all">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="font-extrabold text-white group-hover:text-[#FF5500] transition-colors">
                  {item.label}
                </span>
                <span className="text-[10px] sm:text-xs font-semibold text-[#8A9EB8] bg-[#0B192C] px-2 py-0.5 rounded-md border border-[#1C365A]">
                  {item.highlight}
                </span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
