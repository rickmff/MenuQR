import { ClerkProvider } from '@clerk/nextjs';
import { ptBR } from '@clerk/localizations';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { demoMode } from '@/lib/demo/config';
import { platform } from '@/lib/platform';
import { googleSiteVerification, locale, siteUrl } from '@/lib/site';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });

/**
 * As telas do Clerk (entrar, criar conta, perfil) em português e na cor da
 * marca. Os valores repetem os tokens de `globals.css` porque o Clerk monta o
 * CSS dele fora da nossa folha e não enxerga as variáveis.
 */
const clerkProviderProps = {
  localization: ptBR,
  // Sair do painel devolve o lojista à página inicial, não a uma tela do Clerk.
  afterSignOutUrl: '/',
  appearance: {
    variables: {
      colorPrimary: '#ea1d2c',
      colorDanger: '#ea1d2c',
      colorText: '#3f3e3e',
      colorTextSecondary: '#717171',
      borderRadius: '0.5rem',
      fontFamily: 'var(--font-inter)',
    },
  },
} as const;


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
  themeColor: '#ea1d2c',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  // Sem isto env(safe-area-inset-*) vale zero no iOS e as barras inferiores colam na borda.
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const content = (
    <>
      <a
        href="#conteudo"
        className="sr-only fixed left-4 top-4 z-100 rounded-sm bg-gray-800 px-4 py-2 text-body2 font-semibold text-white focus:not-sr-only focus:fixed"
      >
        Pular para o conteúdo principal
      </a>
      {children}
    </>
  );

  return (
    <html lang={locale} className={inter.variable}>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        {/* No modo demonstração não há chaves do Clerk para carregar — e o
            provider sem chave derruba a página inteira. */}
        {demoMode ? content : <ClerkProvider {...clerkProviderProps}>{content}</ClerkProvider>}
      </body>
    </html>
  );
}