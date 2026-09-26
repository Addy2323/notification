import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LUMO — Delivery Notification & Consumer Portal',
  description: 'Mobile-first delivery communication and live consumer tracking platform for merchants and customers.',
  keywords: 'LUMO, delivery tracking, SMS notification, Tanzania delivery, logistics portal, LotusRise',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-50 text-slate-900 antialiased selection:bg-lumo-800 selection:text-white">
        {children}
      </body>
    </html>
  );
}
