import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import en from '@/locales/en.json';
import sw from '@/locales/sw.json';
import keys from '@/locales/source-keys.json';
export function localizedMetadata(metadata: Metadata): Metadata {
  const language = cookies().get('lumo_language')?.value === 'sw' ? 'sw' : 'en';
  const text = (value: any): any => {
    if (typeof value !== 'string') return value;
    const key = (keys as Record<string, string>)[value];
    if (!key) return value;
    const read = (messages: any) => key.split('.').reduce((obj, part) => obj?.[part], messages);
    return read(language === 'sw' ? sw : en) ?? read(en) ?? value;
  };
  return { ...metadata, title: typeof metadata.title === 'string' ? text(metadata.title) : metadata.title, description: text(metadata.description), openGraph: metadata.openGraph ? { ...metadata.openGraph, title: text(metadata.openGraph.title), description: text(metadata.openGraph.description) } : undefined, twitter: metadata.twitter ? { ...metadata.twitter, title: text(metadata.twitter.title), description: text(metadata.twitter.description) } : undefined };
}
