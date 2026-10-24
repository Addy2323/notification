'use client';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { NextIntlClientProvider, useTranslations, useLocale, useFormatter } from 'next-intl';
import en from '@/locales/en.json';
import sw from '@/locales/sw.json';
import sourceKeys from '@/locales/source-keys.json';
import { Language, validLanguage, storeLanguage, browserLanguage, languageLocale } from '@/lib/language';
import { fetchApi } from '@/lib/api';

function englishFallback(key: string, values?: Record<string, string | number>) {
  const value = key.split('.').reduce<any>((obj, part) => obj?.[part], en);
  if (process.env.NODE_ENV !== 'production') console.warn(`[i18n] Missing translation: ${key}`);
  return typeof value === 'string' ? value.replace(/\{(\w+)\}/g, (match, name) => String(values?.[name] ?? match)) : key;
}
type LanguageContext = { language: Language; setLanguage: (value: Language) => void; preferenceError: boolean };
const Context = createContext<LanguageContext | null>(null);
export function LanguageProvider({ initialLanguage, children }: { initialLanguage: Language; children: React.ReactNode }) {
  const [language, setCurrent] = useState<Language>(initialLanguage);
  const [preferenceError, setPreferenceError] = useState(false);
  const userId = useRef<string | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const revision = useRef(0);
  useEffect(() => {
    const restore = (user: any) => {
      userId.current = user?.id || null;
      if (user && validLanguage(user.language)) { setCurrent(user.language); storeLanguage(user.language); }
    };
    const authenticated = (event: Event) => { revision.current++; restore((event as CustomEvent).detail); };
    const loggedOut = () => { userId.current = null; revision.current++; };
    window.addEventListener('lumo:authenticated', authenticated);
    window.addEventListener('lumo:logout', loggedOut);
    const startRevision = revision.current;
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const isPublicPage = /^\/(login|register|forgot-password|track|driver|rate)(\/|$)/.test(pathname);
    if (!isPublicPage) {
      fetchApi('/auth/me').then(data => {
        if (revision.current === startRevision) restore(data.user);
        else if (!userId.current && data.user?.id) {
          userId.current = data.user.id;
          fetchApi('/auth/preferences/language', { method: 'PATCH', body: JSON.stringify({ language: browserLanguage() }) }).catch(() => setPreferenceError(true));
        }
      }).catch(() => {});
    }
    const storage = (event: StorageEvent) => { if (event.key === 'lumo_language' && validLanguage(event.newValue)) { revision.current++; setCurrent(event.newValue); storeLanguage(event.newValue); } };
    window.addEventListener('storage', storage);
    return () => { window.removeEventListener('lumo:authenticated', authenticated); window.removeEventListener('lumo:logout', loggedOut); window.removeEventListener('storage', storage); };
  }, []);
  const setLanguage = useCallback((value: Language) => {
    if (!validLanguage(value)) return;
    revision.current++; setCurrent(value); storeLanguage(value); setPreferenceError(false);
    if (userId.current) {
      const account = userId.current;
      queue.current = queue.current.catch(() => {}).then(() => { if (userId.current === account) return fetchApi('/auth/preferences/language', { method: 'PATCH', body: JSON.stringify({ language: value }) }); }).catch(() => setPreferenceError(true));
    }
  }, []);
  return <Context.Provider value={{ language, setLanguage, preferenceError }}><NextIntlClientProvider locale={languageLocale[language]} messages={language === 'sw' ? sw : en} timeZone="Africa/Dar_es_Salaam" onError={error => { if (process.env.NODE_ENV !== 'production') console.warn('[i18n]', error.code); }} getMessageFallback={({ key }) => englishFallback(key || '')}>{children}</NextIntlClientProvider></Context.Provider>;
}
export function useLanguage() {
  const context = useContext(Context);
  if (!context) throw new Error('LanguageProvider is required');
  const translate = useTranslations();
  const locale = useLocale();
  const format = useFormatter();
  const t = (key: string, values?: Record<string, string | number>) => translate.has(key) ? translate(key, values) : englishFallback(key, values);
  // Compatibility for static UI configuration objects; never pass business records here.
  const label = (text: string) => { const key = (sourceKeys as Record<string, string>)[text]; return key ? t(key) : text; };
  return { ...context, t, label, locale, format };
}
export function T({ k, values }: { k: string; values?: Record<string, string | number> }) { const { t } = useLanguage(); return <>{t(k, values)}</>; }

export function TLabel({ value }: { value: string }) { const { label } = useLanguage(); return <>{label(value)}</>; }
