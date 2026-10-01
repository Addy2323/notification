import type { Metadata } from 'next';
import './globals.css';
import {
  constructMetadata,
  generateOrganizationSchema,
  generateSoftwareApplicationSchema,
} from '@/lib/seo';

export const metadata: Metadata = constructMetadata({
  title: 'LUMO Track | Delivery Tracking & SMS Notifications in Tanzania',
  description:
    'LUMO Track helps Tanzanian businesses send SMS and WhatsApp delivery notifications and give customers simple real-time web delivery tracking without an app.',
  canonicalUrl: '/',
  alternateSwahiliUrl: '/sw',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const orgSchema = generateOrganizationSchema();
  const appSchema = generateSoftwareApplicationSchema();

  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
        />
      </head>
      <body className="h-full bg-surface font-body-md text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed">
        {children}
      </body>
    </html>
  );
}
