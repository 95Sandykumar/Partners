import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: 'POFlow - AI-Powered Purchase Order Processing',
    template: '%s | POFlow',
  },
  description: 'Upload PDF purchase orders, AI extracts data automatically, match to your product catalog, and approve with confidence. Save 85% of manual data entry time.',
  keywords: ['purchase order processing', 'PO automation', 'AI data extraction', 'PDF processing', 'procurement automation', 'order management', 'POFlow'],
  authors: [{ name: 'POFlow' }],
  creator: 'POFlow',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'POFlow',
    title: 'POFlow - AI-Powered Purchase Order Processing',
    description: 'Upload PDF purchase orders, AI extracts data automatically, match to your product catalog, and approve with confidence.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'POFlow' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'POFlow - AI-Powered Purchase Order Processing',
    description: 'Upload PDF purchase orders, AI extracts data automatically, match to your product catalog, and approve with confidence.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
