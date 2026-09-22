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
 * Paleta das telas do Clerk. O Clerk monta o CSS dele fora da nossa folha e não
 * enxerga as variáveis do tema, então os valores de `globals.css` são repetidos
 * aqui — se um token mudar lá, mude aqui também.
 */
const token = {
  primary: '#0b8639',
  primaryHover: '#1daa61',
  primaryPressed: '#096b2e',
  success: '#096b2e',
  warning: '#f9a825',
  error: '#ea0038',
  gray700: '#3b4a54',
  gray600: '#667781',
  gray400: '#8696a0',
  gray300: '#d1d7db',
  gray200: '#e9edef',
  gray100: '#f0f2f5',
  gray50: '#f7f8fa',
  white: '#ffffff',
  ease: 'cubic-bezier(0.2, 0, 0, 1)',
} as const;

/**
 * Campo e botão de provedor: 48px, raio 8, borda `gray-300` que vira `primary`
 * no foco — o mesmo contrato de `fieldClass()` em `ui/text-field.tsx`.
 *
 * O `!important` não é preguiça: as regras internas (`cl-internal-*`) ganham do
 * `appearance` em altura, borda e sombra. E a borda precisa ser `border` de
 * verdade — o Clerk desenha o contorno com `box-shadow`, então zerar a sombra
 * para tirar o anel difuso apaga a borda junto (foi o que aconteceu).
 */
const bordered = {
  border: `1px solid ${token.gray300} !important`,
  boxShadow: 'none !important',
  transition: `border-color 150ms ${token.ease}, background-color 150ms ${token.ease}`,
};

const focusRing = {
  borderColor: `${token.primary} !important`,
  outline: 'none',
};

/**
 * Foco de teclado. O Clerk desenha o dele com `box-shadow`, que a regra acima
 * zera para tirar o anel difuso; sem repor, os botões ficam sem nenhuma marca
 * de foco. O `outline` com afastamento é o mesmo anel do resto do app.
 */
const focusVisible = {
  '&:focus-visible': { outline: `2px solid ${token.primary}`, outlineOffset: '2px' },
};

/**
 * Campo recusado. Vem depois do foco na ordem das regras (mesma especificidade)
 * porque um campo inválido continua vermelho enquanto está sendo corrigido —
 * é o que `fieldClass()` faz no resto do app.
 */
const invalidRing = {
  '&[aria-invalid="true"], &.cl-error': { borderColor: `${token.error} !important` },
};

/**
 * As telas do Clerk (entrar, criar conta, perfil) em português e no visual do
 * sistema. Os nomes seguem o Clerk 7 (`colorForeground`, não `colorText`;
 * `options`, não `layout`).
 *
 * Minimalismo: sem card (o formulário assenta direto na página — `flush`
 * também tira o padding interno, por isso nada de borda em volta), sem logo
 * próprio (a marca já está na página) e sem o subtítulo de boas-vindas.
 */
const clerkProviderProps = {
  localization: {
    ...ptBR,
    // O pacote pt-BR deixa este placeholder sem tradução e ele cai no inglês
    // ("Create a password") na tela de criar conta.
    formFieldInputPlaceholder__signUpPassword: 'Crie uma senha',
    // O rótulo e o exemplo são os mesmos do formulário do modo demonstração
    // (`platform/auth-form.tsx`): "Seu e-mail" seguido de "Digite o endereço
    // de e-mail" dizia a mesma coisa duas vezes.
    formFieldLabel__emailAddress: 'E-mail',
    formFieldInputPlaceholder__emailAddress: 'voce@restaurante.com.br',
    signIn: {
      ...ptBR.signIn,
      protectCheck: {
        title: 'Verificando sua solicitação',
        subtitle: 'Só um instante.',
        loading: 'Carregando…',
        retryButton: 'Tentar de novo',
      },
    },
    signUp: {
      ...ptBR.signUp,
      protectCheck: {
        title: 'Verificando sua solicitação',
        subtitle: 'Só um instante.',
        loading: 'Carregando…',
        retryButton: 'Tentar de novo',
      },
    },
  },
  // Sair do painel devolve o lojista à página inicial, não a uma tela do Clerk.
  afterSignOutUrl: '/',
  appearance: {
    variables: {
      colorPrimary: token.primary,
      colorPrimaryForeground: token.white,
      colorDanger: token.error,
      colorSuccess: token.success,
      colorWarning: token.warning,
      colorForeground: token.gray700,
      colorMutedForeground: token.gray600,
      colorMuted: token.gray100,
      colorBackground: token.white,
      colorBorder: token.gray300,
      colorInput: token.white,
      colorInputForeground: token.gray700,
      colorRing: token.primary,
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
      // Sem isto o Clerk encolhe o formulário até o conteúdo (`fit-content`) e
      // ele fica com metade da coluna, cortando o texto dos campos.
      rootBox: { width: '100%' },
      cardBox: { boxShadow: 'none', width: '100%' },
      card: { padding: '0', gap: '1.25rem' },
      // O título entra na nossa escala; o subtítulo de boas-vindas sai.
      header: { textAlign: 'left', gap: '0' },
      headerTitle: {
        fontSize: '1.5rem',
        lineHeight: '1.25',
        fontWeight: '700',
        letterSpacing: '-0.01em',
        color: token.gray700,
      },
      headerSubtitle: { display: 'none' },
      main: { gap: '1.25rem' },

      formFieldLabel: { fontSize: '0.875rem', fontWeight: '500', color: token.gray700 },
      formFieldInput: {
        ...bordered,
        height: '3rem !important',
        minHeight: '3rem !important',
        padding: '0 1rem !important',
        fontSize: '1rem',
        '&::placeholder': { color: token.gray400 },
        '&:hover': { borderColor: `${token.gray400} !important` },
        '&:focus, &:focus-within': focusRing,
        ...invalidRing,
      },
      formFieldInputShowPasswordButton: {
        color: token.gray600,
        '&:hover': { color: token.gray700 },
        ...focusVisible,
      },
      formFieldAction: { fontSize: '0.875rem', fontWeight: '600', color: token.primary },
      formFieldErrorText: { fontSize: '0.75rem', fontWeight: '500', color: token.error },
      formFieldHintText: { fontSize: '0.75rem', color: token.gray600 },
      formFieldSuccessText: { fontSize: '0.75rem', color: token.success },
      otpCodeFieldInput: {
        ...bordered,
        height: '3rem !important',
        '&:focus': focusRing,
        ...invalidRing,
      },

      // Botão principal: verde chapado, sem gradiente, sem a seta do Clerk.
      formButtonPrimary: {
        height: '3rem',
        fontSize: '0.875rem',
        fontWeight: '600',
        textTransform: 'none',
        letterSpacing: '0',
        backgroundImage: 'none',
        backgroundColor: token.primary,
        // O Clerk empilha sombra, inset e um ::after com brilho: tudo fora.
        boxShadow: 'none !important',
        '&::after': { backgroundImage: 'none !important', display: 'none !important' },
        transition: `background-color 150ms ${token.ease}, transform 100ms ${token.ease}`,
        '&:hover': { backgroundColor: token.primaryHover },
        '&:active': { backgroundColor: token.primaryPressed, transform: 'scale(0.98)' },
        '&:disabled': { backgroundColor: token.gray200, color: token.gray400 },
        '& .cl-buttonArrowIcon': { display: 'none' },
        ...focusVisible,
      },

      // Entrar com provedor: mesma altura e raio dos nossos botões secundários.
      socialButtonsBlockButton: {
        ...bordered,
        height: '3rem !important',
        '&:hover': { backgroundColor: token.gray50 },
        '&:active': { backgroundColor: token.gray100, transform: 'scale(0.98)' },
        ...focusVisible,
      },
      socialButtonsBlockButtonText: { fontSize: '0.875rem', fontWeight: '600', color: token.gray700 },

      dividerLine: { backgroundColor: token.gray200 },
      dividerText: { fontSize: '0.75rem', color: token.gray400 },

      // O rodapé acompanha o título e os campos, que são alinhados à esquerda.
      // A linha do Clerk vem com margem automática; sem zerá-la ela fica no
      // centro e quebra a única coluna de alinhamento da tela.
      footer: { background: 'none', alignItems: 'flex-start' },
      footerAction: {
        justifyContent: 'flex-start',
        marginLeft: '0 !important',
        marginRight: '0 !important',
      },
      footerActionText: { fontSize: '0.875rem', color: token.gray600 },
      footerActionLink: {
        fontSize: '0.875rem',
        fontWeight: '600',
        color: token.primary,
        '&:hover': { color: token.primaryPressed },
      },
      backLink: { color: token.primary },
      identityPreview: { borderColor: token.gray200, backgroundColor: token.gray50 },
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