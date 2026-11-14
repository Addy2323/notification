import { localizedMetadata } from '@/lib/server-language';
import { constructMetadata } from '@/lib/seo';

export function generateMetadata() {
  return localizedMetadata(
    constructMetadata({
      title: 'Confirmation Receipt | LUMO Track',
      description: 'Private customer order confirmation receipt and PDF download.',
      noIndex: true,
    })
  );
}

export default function PublicReceiptLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

