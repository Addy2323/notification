import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lumotrack.lumo.co.tz';

export default function sitemap(): MetadataRoute.Sitemap {
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

  return publicRoutes.map((route) => {
    const isHome = route === '';
    const isMainFeature = ['/delivery-tracking', '/sms-notifications', '/whatsapp-notifications', '/for-merchants'].includes(route);

    return {
      url: `${SITE_URL}${route}`,
      lastModified,
      changeFrequency: isHome ? 'daily' : isMainFeature ? 'weekly' : 'monthly',
      priority: isHome ? 1.0 : isMainFeature ? 0.9 : 0.7,
    };
  });
}
