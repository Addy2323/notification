'use client';

import React from 'react';

interface LumoStartupLoaderProps {
  message?: string;
  subtext?: string;
  visible?: boolean;
}

export function LumoStartupLoader({
  message = 'Loading your delivery...',
  subtext = 'Track deliveries. Stay connected.',
  visible = true
}: LumoStartupLoaderProps) {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between bg-[#050D1A] text-white select-none font-sans overflow-hidden transition-all duration-700 ease-in-out ${
        visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      
      {/* Top Brand Orange Accent Bar */}
      <div className="w-full h-1.5 bg-[#FF5500] shrink-0" />

      {/* Main Center Content Container */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-8 my-auto relative">
        
        {/* Subtle Background Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-[#FF5500]/10 rounded-full blur-3xl pointer-events-none" />

        {/* LUMO Brand 4-Tile Diamond Logo */}
        <div className="flex flex-col items-center space-y-4 z-10">
          
          {/* 4-Tile Diamond Grid */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 grid grid-cols-2 gap-2 transform rotate-45 p-1 drop-shadow-[0_10px_25px_rgba(255,85,0,0.25)]">
            {/* Top Tile (Orange) */}
            <div className="bg-[#FF5500] rounded-xl shadow-lg shadow-orange-500/30" />
            
            {/* Right Tile (Sky Blue) */}
            <div className="bg-[#60A5FA] rounded-xl shadow-lg shadow-blue-400/30" />
            
            {/* Left Tile (Orange) */}
            <div className="bg-[#FF5500] rounded-xl shadow-lg shadow-orange-500/30" />
            
            {/* Bottom Tile (Sky Blue) */}
            <div className="bg-[#60A5FA] rounded-xl shadow-lg shadow-blue-400/30" />
          </div>

          {/* LUMO TRACK Brand Title */}
          <div className="pt-4 text-center space-y-1">
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">
              LUMO
            </h1>
            <p className="text-xs sm:text-sm font-black tracking-[0.45em] text-white/95 uppercase pt-0.5">
              T R A C K
            </p>
          </div>

          {/* Subtitle Tagline */}
          <p className="text-xs sm:text-sm font-medium text-[#A0B8D0] pt-2">
            {subtext}
          </p>

        </div>

        {/* Loading Spinner & Status Text */}
        <div className="flex flex-col items-center pt-8 space-y-3 z-10">
          {/* Circular Spinner with Brand Orange Arc */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 border-4 border-slate-700/60 border-t-[#FF5500] rounded-full animate-spin shadow-md" />
          
          <p className="text-xs sm:text-sm font-medium text-[#A0B8D0] tracking-wide">
            {message}
          </p>
        </div>

      </div>

      {/* Bottom Brand Orange Accent Bar */}
      <div className="w-full h-1.5 bg-[#FF5500] shrink-0" />

    </div>
  );
}
