import type { Metadata } from 'next';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lumotrack.lumo.co.tz';
export const SITE_NAME = 'LUMO Track';
export const DEFAULT_TITLE = 'LUMO Track | Delivery Tracking & SMS Notifications in Tanzania';
export const DEFAULT_DESCRIPTION =
  'LUMO Track helps Tanzanian businesses send automated SMS and WhatsApp delivery notifications and give customers simple real-time web delivery tracking without requiring an app.';

export interface ConstructMetadataInput {
  title?: string;
  description?: string;
  image?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  keywords?: string[];
  locale?: string;
  alternateSwahiliUrl?: string;
  alternateEnglishUrl?: string;
}

export function constructMetadata({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  image = '/og-image.png',
  canonicalUrl = SITE_URL,
  noIndex = false,
  keywords = [
    'delivery tracking Tanzania',
    'delivery tracking system Tanzania',
    'delivery management system Tanzania',
    'delivery notification system',
    'SMS delivery notifications',
    'delivery tracking software Tanzania',
    'WhatsApp delivery notifications',
    'order tracking Tanzania',
    'delivery software Dar es Salaam',
    'LUMO Track',
  ],
  locale = 'en_TZ',
  alternateSwahiliUrl,
  alternateEnglishUrl,
}: ConstructMetadataInput = {}): Metadata {
  const fullCanonical = canonicalUrl.startsWith('http') ? canonicalUrl : `${SITE_URL}${canonicalUrl}`;
  const fullImage = image.startsWith('http') ? image : `${SITE_URL}${image}`;

  const languages: Record<string, string> = {};
  if (alternateSwahiliUrl) {
    languages['en-TZ'] = fullCanonical;
    languages['sw-TZ'] = alternateSwahiliUrl.startsWith('http') ? alternateSwahiliUrl : `${SITE_URL}${alternateSwahiliUrl}`;
  }
  if (alternateEnglishUrl) {
    languages['sw-TZ'] = fullCanonical;
    languages['en-TZ'] = alternateEnglishUrl.startsWith('http') ? alternateEnglishUrl : `${SITE_URL}${alternateEnglishUrl}`;
  }

  const metadata: Metadata = {
    title: {
      default: title,
      template: `%s | ${SITE_NAME}`,
    },
    description,
    keywords,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: fullCanonical,
      ...(Object.keys(languages).length > 0 ? { languages } : {}),
    },
    openGraph: {
      title,
      description,
      url: fullCanonical,
      siteName: SITE_NAME,
      images: [
        {
          url: fullImage,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} - ${title}`,
        },
      ],
      locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [fullImage],
      creator: '@lumotrack',
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
    authors: [{ name: 'LotusRise Technologies' }],
    publisher: 'LUMO Track',
  };

  return metadata;
}

// JSON-LD Schema Generators
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'LUMO Track',
    legalName: 'LotusRise Technologies Limited',
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    description: DEFAULT_DESCRIPTION,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Dar es Salaam',
      addressCountry: 'TZ',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+255711788830',
      contactType: 'customer support',
      email: 'support@lumo.co.tz',
      areaServed: ['TZ'],
      availableLanguage: ['en', 'sw'],
    },
    sameAs: ['https://github.com/Addy2323/notification'],
  };
}

export function generateSoftwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'LUMO Track',
    operatingSystem: 'Web, iOS, Android',
    applicationCategory: 'BusinessApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'TZS',
      availability: 'https://schema.org/InStock',
    },
    description:
      'LUMO Track is a delivery notification and tracking platform that helps Tanzanian businesses keep customers informed throughout the delivery process with automated SMS, WhatsApp updates, and app-free web tracking.',
    url: SITE_URL,
  };
}

export function generateBreadcrumbSchema(items: { name: string; item: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: it.name,
      item: it.item.startsWith('http') ? it.item : `${SITE_URL}${it.item}`,
    })),
  };
}

export function generateFAQSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };
}

export function generateArticleSchema(article: {
  title: string;
  description: string;
  publishedTime: string;
  authorName: string;
  url: string;
  image?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.publishedTime,
    author: {
      '@type': 'Person',
      name: article.authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/icon.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': article.url.startsWith('http') ? article.url : `${SITE_URL}${article.url}`,
    },
    ...(article.image ? { image: article.image.startsWith('http') ? article.image : `${SITE_URL}${article.image}` } : {}),
  };
}

