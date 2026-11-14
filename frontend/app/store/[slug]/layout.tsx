import type { Metadata } from 'next';
import React from 'react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lumotrack.lumo.co.tz';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const ASSET_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const slug = params?.slug || '';
  const canonical = `${SITE_URL}/store/${slug}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${API_BASE}/store/public/${encodeURIComponent(slug)}`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);

    if (res.status === 200) {
      const json = await res.json();
      const store = json?.data?.store;
      if (store) {
        const imageRaw = store.coverImageUrl || store.logoUrl || '';
        const imageUrl = imageRaw
          ? imageRaw.startsWith('http')
            ? imageRaw
            : `${ASSET_ORIGIN}${imageRaw.startsWith('/') ? '' : '/'}${imageRaw}`
          : undefined;
        const title = `${store.storeName} | LUMO SmartTrack Store`;
        const description =
          store.description ||
          `Browse available products, latest prices and offers from ${store.storeName} on LUMO SmartTrack Store.`;

        return {
          title,
          description,
          alternates: { canonical },
          robots: { index: true, follow: true },
          openGraph: {
            title,
            description,
            url: canonical,
            type: 'website',
            images: imageUrl ? [{ url: imageUrl }] : undefined,
          },
        };
      }
    }
  } catch {
    // Fallback metadata cleanly when offline
  }

  return {
    title: 'Storefront | LUMO SmartTrack Store',
    description: 'Browse merchant products, live prices and offers on LUMO SmartTrack Store.',
    alternates: { canonical },
    robots: { index: false, follow: false },
  };
}

export default function PublicStoreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

