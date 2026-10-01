import type { Metadata } from 'next';
import { constructMetadata } from '@/lib/seo';

export const metadata: Metadata = constructMetadata({
  title: 'Customer Delivery Tracking Portal | LUMO Track',
  description: 'Private customer delivery tracking portal.',
  noIndex: true,
});

export default function TrackingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
