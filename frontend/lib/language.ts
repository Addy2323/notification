/**
 * Single source of truth for supported interface languages.
 * To add a language: add it here, add `locales/<code>.json`, register it in
 * LanguageProvider's `messagesByLanguage`, and allow the code in the backend validator.
 */
export const supportedLanguages = [
  { code: 'en', name: 'English', short: 'EN', locale: 'en-TZ' },
  { code: 'sw', name: 'Kiswahili', short: 'SW', locale: 'sw-TZ' },
] as const;
export type Language = (typeof supportedLanguages)[number]['code'];
export const defaultLanguage: Language = 'en';
export const languageLocale = Object.fromEntries(supportedLanguages.map(l => [l.code, l.locale])) as Record<Language, string>;
export const validLanguage = (value: unknown): value is Language => supportedLanguages.some(l => l.code === value);
export function browserLanguage(): Language {
  if (typeof document === 'undefined') return defaultLanguage;
  const value = document.cookie.split('; ').find(part => part.startsWith('lumo_language='))?.split('=')[1];
  return validLanguage(value) ? value : defaultLanguage;
}
export function storeLanguage(language: Language) {
  document.cookie = `lumo_language=${language}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  document.documentElement.lang = language;
  try { localStorage.setItem('lumo_language', language); } catch {}
}
