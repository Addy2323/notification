import type { Request } from 'express';
import { en, sw, sourceKeys } from './messages';
export type Language = 'en' | 'sw';
export function resolveLanguage(req: Request): Language {
  const query = req.query.language;
  if (query === 'en' || query === 'sw') return query;
  const header = req.headers['accept-language']?.split(',')[0]?.split('-')[0];
  if (header === 'en' || header === 'sw') return header;
  const saved = req.cookies?.lumo_language;
  return saved === 'sw' || (!saved && req.user?.language === 'sw') ? 'sw' : 'en';
}
export function reportTranslator(language: Language = 'en') {
  return (key: string, values: Record<string, string | number> = {}) => {
    const value = (language === 'sw' ? sw[key] : undefined) ?? en[key] ?? key;
    return value.replace(/\{(\w+)\}/g, (match, name) => String(values[name] ?? match));
  };
}
// Only call for known interface labels and status identifiers, never business content.
export function displayLabel(language: Language | undefined, value: string) {
  const key = sourceKeys[value];
  return key ? reportTranslator(language)(key) : value;
}
export function errorTranslationKey(message: string, status: number) {
  return sourceKeys[message] || `errors.${status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : status === 413 ? 'upload_size' : status >= 500 ? 'server' : 'request'}`;
}
