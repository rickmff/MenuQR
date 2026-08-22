import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { platform } from '@/lib/platform';
import { googleSiteVerification, locale, siteUrl } from '@/lib/site';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
  axes: ['SOFT', 'WONK'],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${platform.name} — ${platform.tagline}`,
    template: `%s | ${platform.name}`,
  },
  description: platform.shortDescription,
  applicationName: platform.name,
  publisher: platform.name,
  category: 'technology',
  alternates: { canonical: '/', languages: { 'pt-BR': '/' } },
  openGraph: {
    type: 'website',
    locale: locale.replace('-', '_'),
    url: siteUrl,
    siteName: platform.name,
    title: `${platform.name} — ${platform.tagline}`,
    description: platform.shortDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${platform.name} — ${platform.tagline}`,
    description: platform.shortDescription,
  },
  robots: {
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
  verification: googleSiteVerification ? { google: googleSiteVerification } : undefined,
  formatDetection: { telephone: true, address: true, email: true },
  appleWebApp: { capable: true, title: platform.name, statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#c2410c',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={locale} className={`${inter.variable} ${fraunces.variable}`}>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <a
          href="#conteudo"
          className="sr-only-focusable fixed left-4 top-4 z-100 rounded-lg bg-charcoal-900 px-4 py-2 text-sm font-semibold text-cream-50"
        >
          Pular para o conteúdo principal
        </a>
        {children}
      </body>
    </html>
  );
}
