import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { CartProvider } from '@/components/cart-provider';
import { CartDrawer } from '@/components/cart-drawer';
import { JsonLd } from '@/components/json-ld';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { restaurant } from '@/lib/restaurant';
import { graph, organizationSchema, restaurantSchema, websiteSchema } from '@/lib/seo';
import { googleSiteVerification, locale, siteUrl } from '@/lib/site';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
  axes: ['SOFT', 'WONK'],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${restaurant.name} — ${restaurant.tagline} em ${restaurant.address.city}`,
    template: `%s | ${restaurant.name}`,
  },
  description: restaurant.shortDescription,
  applicationName: restaurant.name,
  authors: [{ name: restaurant.legalName, url: siteUrl }],
  creator: restaurant.legalName,
  publisher: restaurant.legalName,
  category: 'restaurant',
  keywords: [
    'hamburgueria artesanal',
    'delivery de hambúrguer',
    `restaurante ${restaurant.address.city}`,
    'cardápio online',
    'pedido pelo WhatsApp',
    'entrega de comida',
  ],
  alternates: {
    canonical: '/',
    languages: { 'pt-BR': '/' },
  },
  openGraph: {
    type: 'website',
    locale: locale.replace('-', '_'),
    url: siteUrl,
    siteName: restaurant.name,
    title: `${restaurant.name} — ${restaurant.tagline}`,
    description: restaurant.shortDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${restaurant.name} — ${restaurant.tagline}`,
    description: restaurant.shortDescription,
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
  appleWebApp: { capable: true, title: restaurant.name, statusBarStyle: 'default' },
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
        <JsonLd id="ld-site" data={graph(organizationSchema(), restaurantSchema(), websiteSchema())} />
        <a
          href="#conteudo"
          className="sr-only-focusable fixed left-4 top-4 z-100 rounded-lg bg-charcoal-900 px-4 py-2 text-sm font-semibold text-cream-50"
        >
          Pular para o conteúdo principal
        </a>
        <CartProvider>
          <SiteHeader />
          <main id="conteudo" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
