import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lumotrack.lumo.co.tz';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const publicRoutes = [
    '',
    '/features',
    '/delivery-tracking',
    '/sms-notifications',
    '/whatsapp-notifications',
    '/for-merchants',
    '/for-ecommerce',
    '/for-delivery-businesses',
    '/how-it-works',
    '/pricing',
    '/about',
    '/contact',
    '/faq',
    '/blog',
    '/blog/delivery-tracking-tanzania-guide',
    '/blog/sms-notifications-customer-communication',
    '/blog/whatsapp-delivery-notifications-guide',
    '/blog/track-deliveries-without-app',
    '/sw',
    '/sw/fuatilia-mizigo',
    '/sw/arifa-za-delivery',
    '/sw/jinsi-inavyofanya-kazi',
  ];

  const baseEntries: MetadataRoute.Sitemap = publicRoutes.map((route) => {
    const isHome = route === '';
    const isMainFeature = ['/delivery-tracking', '/sms-notifications', '/whatsapp-notifications', '/for-merchants'].includes(route);

    return {
      url: `${SITE_URL}${route}`,
      lastModified,
      changeFrequency: isHome ? 'daily' : isMainFeature ? 'weekly' : 'monthly',
      priority: isHome ? 1.0 : isMainFeature ? 0.9 : 0.7,
    };
  });

  // Dynamically include published SmartTrack Store storefronts
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${API_BASE}/store/public/sitemap-slugs`, {
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    clearTimeout(timer);

    if (res.ok) {
      const json = await res.json();
      const stores: Array<{ slug: string; updated_at?: string }> = json?.data?.stores || [];
      const storeEntries: MetadataRoute.Sitemap = stores
        .filter((s) => Boolean(s?.slug))
        .map((s) => ({
          url: `${SITE_URL}/store/${s.slug}`,
          lastModified: s.updated_at ? new Date(s.updated_at) : lastModified,
          changeFrequency: 'daily',
          priority: 0.85,
        }));
      return [...baseEntries, ...storeEntries];
    }
  } catch {
    // Fallback cleanly if API is unreachable during static build
  }

  return baseEntries;
}
