'use client';

import React from 'react';

interface LumoLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textColor?: string;
}

export function LumoLogo({
  className = "",
  size = 36,
  showText = true,
  textColor = "text-slate-900",
}: LumoLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Official LUMO Brand Logo Image directly from /LOGO.png */}
      <img
        src="/LOGO.png"
        alt="LUMO Logo"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="rounded-lg object-contain shrink-0"
      />

      {showText && (
        <span className={`font-extrabold text-2xl tracking-tight ${textColor}`}>
          LUMO
        </span>
      )}
    </div>
  );
}
