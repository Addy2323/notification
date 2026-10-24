'use client';
import React from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useLanguage } from './LanguageProvider';
import { validLanguage, supportedLanguages } from '@/lib/language';

type Props = {
  /** Compact mode for tight mobile or customer portal headers. */
  compact?: boolean;
  className?: string;
};

/**
 * Global language selector placed in dashboard and public headers.
 * Controls the shared LanguageProvider state so every route and dashboard
 * re-renders immediately without a page reload.
 */
export default function LanguageSelector({ compact = false, className = '' }: Props) {
  const { language, setLanguage, t, preferenceError } = useLanguage();
  const current = supportedLanguages.find(l => l.code === language) ?? supportedLanguages[0];

  return (
    <div className={`inline-flex flex-col gap-1 shrink-0 ${className}`}>
      <label
        title={t('common.current_language', { language: current.name })}
        className="group relative inline-flex items-center gap-1.5 rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/10 dark:bg-slate-800/40 backdrop-blur-sm px-2.5 py-1.5 text-xs font-semibold text-inherit transition-all hover:border-orange-500/70 hover:bg-orange-500/10 focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-orange-500 shadow-sm cursor-pointer"
      >
        <Globe
          className="w-4 h-4 text-orange-500 shrink-0 transition-transform duration-500 group-hover:rotate-[20deg]"
          aria-hidden="true"
        />
        <select
          aria-label={t('common.language')}
          value={language}
          onChange={(e) => {
            if (validLanguage(e.target.value)) {
              setLanguage(e.target.value);
            }
          }}
          className="appearance-none bg-transparent pr-4 font-semibold text-inherit focus:outline-none cursor-pointer max-w-[7.5rem] truncate"
        >
          {supportedLanguages.map((lang) => (
            <option
              key={lang.code}
              value={lang.code}
              className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 font-medium py-1"
            >
              {compact ? lang.short : lang.name}
            </option>
          ))}
        </select>
        <ChevronDown
          className="w-3.5 h-3.5 text-inherit/60 pointer-events-none absolute right-2 transition-transform duration-200 group-hover:translate-y-0.5"
          aria-hidden="true"
        />
      </label>
      {preferenceError && (
        <span role="alert" className="text-[11px] text-rose-500 max-w-48 leading-tight">
          {t('common.preference_save_failed')}
        </span>
      )}
    </div>
  );
}
