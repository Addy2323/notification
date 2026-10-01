import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lumotrack.lumo.co.tz';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/*',
          '/dashboard',
          '/dashboard/*',
          '/merchant',
          '/merchant/*',
          '/account',
          '/account/*',
          '/driver',
          '/driver/*',
          '/track',
          '/track/*',
          '/api',
          '/api/*',
          '/login',
          '/register',
          '/reset-pin',
          '/*.json$',
        ],
      },
      {
        userAgent: 'GPTBot',
        disallow: ['/admin', '/dashboard', '/track'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
