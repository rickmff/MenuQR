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
 * As telas do Clerk (entrar, criar conta, perfil) em português e no visual do
 * sistema. Os valores repetem os tokens de `globals.css` porque o Clerk monta o
 * CSS dele fora da nossa folha e não enxerga as variáveis. Os nomes seguem o
 * Clerk 7 (`colorForeground`, não `colorText`; `options`, não `layout`).
 *
 * Minimalismo: sem card (o formulário assenta direto na página — `flush`
 * também tira o padding interno, por isso nada de borda), sem logo próprio (a
 * marca já está na página) e sem o subtítulo de boas-vindas.
 */
const clerkProviderProps = {
  localization: ptBR,
  // Sair do painel devolve o lojista à página inicial, não a uma tela do Clerk.
  afterSignOutUrl: '/',
  appearance: {
    /*
     * O Clerk monta o CSS dele fora da nossa folha e não enxerga as variáveis do
     * tema, então os valores são repetidos aqui. Os nomes são os do Clerk 7
     * (`colorForeground`, não `colorText`; `options`, não `layout`).
     */
    variables: {
      colorPrimary: '#0b8639',
      colorPrimaryForeground: '#ffffff',
      colorDanger: '#0b8639',
      colorSuccess: '#50a773',
      colorWarning: '#f9a825',
      colorForeground: '#3e3e3e',
      colorMutedForeground: '#6f6f6f',
      colorMuted: '#f7f7f7',
      colorBackground: '#ffffff',
      colorBorder: '#dcdcdc',
      colorInput: '#ffffff',
      colorInputForeground: '#3e3e3e',
      colorRing: '#0b8639',
      colorShadow: 'transparent',
      colorModalBackdrop: 'rgb(0 0 0 / 0.5)',
      borderRadius: '0.5rem',
      fontFamily: 'var(--font-inter)',
      fontFamilyButtons: 'var(--font-inter)',
    },
    options: {
      // Sem card: o formulário assenta direto na página, que já é a moldura.
      elevation: 'flush',
      logoPlacement: 'none',
      socialButtonsPlacement: 'top',
      socialButtonsVariant: 'blockButton',
    },
    elements: {
      cardBox: { boxShadow: 'none', width: '100%' },
      card: { padding: '0', gap: '1.25rem' },
      // O título entra na nossa escala; o subtítulo de boas-vindas sai.
      header: { textAlign: 'left', gap: '0' },
      headerTitle: { fontSize: '1.5rem', fontWeight: '700', letterSpacing: '-0.01em', color: '#3e3e3e' },
      headerSubtitle: { display: 'none' },
      main: { gap: '1.25rem' },

      // Campos: 48px, raio 8, foco só na borda (sem anel difuso).
      formFieldLabel: { fontSize: '0.875rem', fontWeight: '500', color: '#3e3e3e' },
      /*
        * `!important` aqui não é preguiça: as regras internas do Clerk
        * (`cl-internal-*`) vencem as do `appearance` em altura e sombra, e o
        * sistema é chapado — campo de 48px, sem anel difuso.
        */
      formFieldInput: {
        height: '3rem !important',
        minHeight: '3rem !important',
        padding: '0 1rem !important',
        fontSize: '1rem',
        borderColor: '#dcdcdc',
        boxShadow: 'none !important',
        transition: 'border-color 150ms cubic-bezier(0.2, 0, 0, 1)',
        '&:focus, &:focus-within': { borderColor: '#0b8639 !important', outline: 'none' },
        '&:hover': { borderColor: '#a6a6a6' },
      },
      formFieldInputShowPasswordButton: { color: '#6f6f6f', '&:hover': { color: '#3e3e3e' } },
      formFieldAction: { fontSize: '0.875rem', fontWeight: '600', color: '#0b8639' },
      formFieldErrorText: { fontSize: '0.75rem', color: '#0b8639' },
      formFieldHintText: { fontSize: '0.75rem', color: '#6f6f6f' },
      otpCodeFieldInput: {
        height: '3rem !important',
        borderColor: '#dcdcdc',
        boxShadow: 'none !important',
        '&:focus': { borderColor: '#0b8639 !important' },
      },

      // Botão principal: vermelho chapado, sem gradiente, sem a seta do Clerk.
      formButtonPrimary: {
        height: '3rem',
        fontSize: '0.875rem',
        fontWeight: '600',
        textTransform: 'none',
        letterSpacing: '0',
        backgroundImage: 'none',
        backgroundColor: '#0b8639',
        // O Clerk empilha sombra, inset e um ::after com brilho: tudo fora.
        boxShadow: 'none !important',
        '&::after': { backgroundImage: 'none !important', display: 'none !important' },
        transition: 'background-color 150ms cubic-bezier(0.2, 0, 0, 1), transform 100ms cubic-bezier(0.2, 0, 0, 1)',
        '&:hover': { backgroundColor: '#1daa61' },
        '&:active': { backgroundColor: '#096b2e', transform: 'scale(0.98)' },
        '&:disabled': { backgroundColor: '#e8e8e8', color: '#a6a6a6' },
        '& .cl-buttonArrowIcon': { display: 'none' },
      },

      // Entrar com provedor: mesma altura e raio dos nossos botões secundários.
      socialButtonsBlockButton: {
        height: '3rem !important',
        borderColor: '#dcdcdc',
        boxShadow: 'none !important',
        transition: 'background-color 150ms cubic-bezier(0.2, 0, 0, 1)',
        '&:hover': { backgroundColor: '#f7f7f7' },
        '&:active': { backgroundColor: '#f2f2f2', transform: 'scale(0.98)' },
      },
      socialButtonsBlockButtonText: { fontSize: '0.875rem', fontWeight: '600', color: '#3e3e3e' },

      dividerLine: { backgroundColor: '#e8e8e8' },
      dividerText: { fontSize: '0.75rem', color: '#a6a6a6' },

      footer: { background: 'none' },
      footerAction: { justifyContent: 'flex-start' },
      footerActionText: { fontSize: '0.875rem', color: '#6f6f6f' },
      footerActionLink: {
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#0b8639',
        '&:hover': { color: '#096b2e' },
      },
      backLink: { color: '#0b8639' },
      identityPreview: { borderColor: '#e8e8e8', backgroundColor: '#f7f7f7' },
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
  themeColor: '#0b8639',
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