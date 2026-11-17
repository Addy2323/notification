'use client';

import React from 'react';

interface VerifiedBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
}

const SIZE_MAP = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export function VerifiedBadge({
  size = 'sm',
  className = '',
  title = 'Verified Merchant on LUMO Track',
}: VerifiedBadgeProps) {
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 align-middle ${className}`}
      title={title}
      aria-label={title}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={SIZE_MAP[size]}
        aria-hidden="true"
      >
        <path
          d="M12 1.5l2.47 1.88 3.04-.41 1.15 2.85 2.85 1.15-.41 3.04L22.5 12l-1.88 2.47.41 3.04-2.85 1.15-1.15 2.85-3.04-.41L12 22.5l-2.47-1.88-3.04.41-1.15-2.85-2.85-1.15.41-3.04L1.5 12l1.88-2.47-.41-3.04 2.85-1.15 1.15-2.85 3.04.41L12 1.5z"
          fill="#0095F6"
        />
        <path
          d="M9.75 14.55l-2.3-2.3a.85.85 0 00-1.2 1.2l2.9 2.9a.85.85 0 001.2 0l6.4-6.4a.85.85 0 10-1.2-1.2l-5.8 5.8z"
          fill="#FFFFFF"
        />
      </svg>
    </span>
  );
}

