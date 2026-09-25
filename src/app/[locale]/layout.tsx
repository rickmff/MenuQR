import { ClerkProvider } from '@clerk/nextjs';
import { enUS, ptBR } from '@clerk/localizations';
import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing, type Locale } from '@/i18n/routing';
import { Figtree, Inter, JetBrains_Mono } from 'next/font/google';
import { demoMode } from '@/lib/demo/config';
import { platform } from '@/lib/platform';
import { googleSiteVerification, siteUrl } from '@/lib/site';
import '../globals.css';

/**
 * Três famílias, três papéis (decisão do dono, 2026-09-23 — D19 da skill):
 *
 * - `inter` é a INTERFACE: botão, campo, linha do cardápio, preço, tabela. Ela
 *   entrou como fallback declarado da Tipo iFood e continua sendo a melhor
 *   escolha para texto de UI em tamanho pequeno.
 * - `figtree` é o TÍTULO e a eyebrow do site institucional. O iFood usa dois
 *   cortes de verdade (TipoiFoodTitulos e TipoiFoodTextos); esta é a nossa
 *   versão disso. Humanista de bojo redondo e abertura larga — a mesma
 *   intenção que o desenhador da Tipo iFood descreve.
 * - `jetbrainsMono` é TEXTO DE MÁQUINA e nada mais: o link do cardápio, a chave
 *   Pix, o caminho no navegador falso da landing. Antes de 2026-09-23 o tema
 *   não declarava `--font-mono`, então `font-mono` caía no monoespaçado do
 *   sistema (SF Mono, Consolas, Liberation Mono) e mudava de desenho por
 *   aparelho — inclusive em eyebrow decorativa, que agora usa `font-display`.
 */
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });
const figtree = Figtree({ subsets: ['latin'], display: 'swap', variable: '--font-figtree' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-jetbrains-mono' });

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
  gray900: '#111b21',
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
 * As pilhas de `--font-display` e `--font-mono` do tema, pelas variáveis que o
 * next/font põe no <html> (como o `--font-inter` do `fontFamily` abaixo): o
 * Tailwind não emite a variável do display nesta folha, e o Clerk lê o que
 * está no documento.
 */
const fonts = {
  display: 'var(--font-figtree), var(--font-inter), ui-sans-serif, system-ui, sans-serif',
  mono: 'var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
} as const;

/**
 * Etapa com identidade (senha, código): o e-mail com o lápis fica dentro do
 * próprio `.cl-header`, e o rodapé é irmão do cartão dentro do `.cl-cardBox`.
 */
const STEP_HEADER = '&:has(.cl-identityPreview)';
const STEP_CARD = '.cl-cardBox:has(.cl-identityPreview) &';

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
 * As telas do Clerk (entrar, criar conta, perfil) no visual do
 * sistema. Os nomes seguem o Clerk 7 (`colorForeground`, não `colorText`;
 * `options`, não `layout`).
 *
 * Minimalismo: sem card (o formulário assenta direto na página — `flush`
 * também tira o padding interno, por isso nada de borda em volta), sem logo
 * próprio (a marca já está na página) e sem o subtítulo de boas-vindas.
 */
/**
 * Textos do Clerk por idioma. Os pacotes cobrem quase tudo; o que vai aqui é
 * o que eles deixam sem tradução ou que o sistema escreve de outro jeito.
 */
const protectCheck = {
  'pt-BR': {
    title: 'Verificando sua solicitação',
    subtitle: 'Só um instante.',
    loading: 'Carregando…',
    retryButton: 'Tentar de novo',
  },
  en: {
    title: 'Checking your request',
    subtitle: 'Just a moment.',
    loading: 'Loading…',
    retryButton: 'Try again',
  },
} as const;

const clerkLocalization = {
  'pt-BR': {
    ...ptBR,
    // O pacote pt-BR deixa este placeholder sem tradução e ele cai no inglês
    // ("Create a password") na tela de criar conta.
    formFieldInputPlaceholder__signUpPassword: 'Crie uma senha',
    // O rótulo e o exemplo são os mesmos do formulário do modo demonstração
    // (`platform/auth-form.tsx`): "Seu e-mail" seguido de "Digite o endereço
    // de e-mail" dizia a mesma coisa duas vezes.
    formFieldLabel__emailAddress: 'E-mail',
    formFieldInputPlaceholder__emailAddress: 'voce@restaurante.com.br',
    signIn: { ...ptBR.signIn, protectCheck: protectCheck['pt-BR'] },
    signUp: { ...ptBR.signUp, protectCheck: protectCheck['pt-BR'] },
  },
  en: {
    ...enUS,
    formFieldLabel__emailAddress: 'Email',
    formFieldInputPlaceholder__emailAddress: 'you@restaurant.com',
    signIn: { ...enUS.signIn, protectCheck: protectCheck.en },
    signUp: { ...enUS.signUp, protectCheck: protectCheck.en },
  },
} satisfies Record<Locale, unknown>;

const clerkProviderProps = {
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
      /**
       * A porta de entrada é uma coluna alinhada à esquerda. As etapas que
       * mostram a identidade (senha, código) são centradas: o Clerk centraliza
       * o e-mail e a fileira do código, e o título à esquerda ficava solto. O
       * `:has()` lê o cartão, não a URL: senha e código dividem
       * `/entrar/factor-one`, e o Clerk troca de cartão sem trocar de rota.
       */
      header: { textAlign: 'left', gap: '0', [STEP_HEADER]: { textAlign: 'center' } },
      // No corte de display e em grafite, como o letreiro da marca logo acima
      // e os títulos da landing (D19). Sem espacejamento (D21).
      headerTitle: {
        fontFamily: fonts.display,
        fontSize: '1.5rem',
        lineHeight: '1.25',
        fontWeight: '700',
        letterSpacing: 'normal',
        color: token.gray900,
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
      /**
       * A etapa de código (confirmar o e-mail, redefinir a senha). Cada caixa
       * é um <div> estreito, travado em 2,25rem por `max-height`; o <input> de
       * verdade é um só, invisível, esticado por cima da fileira — por isso
       * foco e erro chegam por atributo (`data-focus-within`, `aria-invalid`),
       * nunca por pseudo-classe. Aqui a fileira é o centro da tela: caixa de
       * 44×52 (44 é o alvo mínimo de toque), dígito grande em JetBrains Mono
       * — o código é texto de máquina, e a mono separa 0 de O e 1 de l — e o
       * foco engrossa a borda para 2px com uma sombra interna, sem mudar o
       * tamanho da caixa. Seis caixas com 8px entre elas somam 304px e cabem
       * na coluna do celular (390 − 32 de margem).
       */
      otpCodeFieldInputs: { gap: '0.5rem', justifyContent: 'center' },
      otpCodeFieldInput: {
        ...bordered,
        boxSizing: 'border-box !important',
        width: '2.75rem !important',
        minWidth: '0 !important',
        height: '3.25rem !important',
        maxHeight: 'none !important',
        padding: '0 !important',
        borderRadius: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: token.white,
        fontFamily: fonts.mono,
        fontSize: '1.5rem',
        fontWeight: '600',
        color: token.gray900,
        '&[data-focus-within="true"]': {
          ...focusRing,
          boxShadow: `inset 0 0 0 1px ${token.primary} !important`,
        },
        '&[aria-invalid="true"], &[data-feedback="error"]': { borderColor: `${token.error} !important` },
        '&[aria-invalid="true"][data-focus-within="true"], &[data-feedback="error"][data-focus-within="true"]': {
          boxShadow: `inset 0 0 0 1px ${token.error} !important`,
        },
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
        // O contorno grafite é o desenho do botão do sistema desde D22 — os
        // dois botões verdes o levam (`VARIANTS.primary` em `ui/button.tsx`).
        // A largura leva `!important` porque o `[data-variant="solid"]` do
        // Clerk a zera; a cor fica livre para o estado desabilitado.
        borderWidth: '1px !important',
        borderStyle: 'solid',
        borderColor: token.gray900,
        // O Clerk empilha sombra, inset e um ::after com brilho: tudo fora.
        boxShadow: 'none !important',
        '&::after': { backgroundImage: 'none !important', display: 'none !important' },
        transition: `background-color 150ms ${token.ease}, transform 100ms ${token.ease}`,
        '&:hover': { backgroundColor: token.primaryHover },
        '&:active': { backgroundColor: token.primaryPressed, transform: 'scale(0.98)' },
        '&:disabled': { borderColor: token.gray300, backgroundColor: token.gray200, color: token.gray400 },
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
      footer: { background: 'none', alignItems: 'flex-start', [STEP_CARD]: { alignItems: 'center' } },
      footerAction: {
        justifyContent: 'flex-start',
        marginLeft: '0 !important',
        marginRight: '0 !important',
        [STEP_CARD]: { justifyContent: 'center' },
      },
      footerActionText: { fontSize: '0.875rem', color: token.gray600 },
      footerActionLink: {
        fontSize: '0.875rem',
        fontWeight: '600',
        color: token.primary,
        '&:hover': { color: token.primaryPressed },
      },
      backLink: { color: token.primary },

      // O e-mail que recebeu o código, com o lápis para trocá-lo: texto no
      // cinza do corpo e só o lápis em verde, que é a única ação da linha.
      identityPreview: { gap: '0.375rem', justifyContent: 'center' },
      identityPreviewText: { fontSize: '0.875rem', fontWeight: '500', color: token.gray700 },
      identityPreviewEditButton: {
        color: token.primary,
        '&:hover': { color: token.primaryPressed },
        ...focusVisible,
      },
      // "Não recebeu o código? Reenviar" no desenho dos links de rodapé.
      // Durante a contagem regressiva o Clerk desabilita o botão, e ele apaga.
      formResendCodeLink: {
        fontSize: '0.875rem',
        fontWeight: '600',
        color: token.primary,
        '&:hover': { color: token.primaryPressed },
        '&:disabled': { color: token.gray400 },
        ...focusVisible,
      },

      /**
       * O menu do avatar, no topo do painel. O `cardBox` acima vale para todo
       * card do Clerk — este popover inclusive — e o `boxShadow: none` de lá
       * apaga a moldura junto com o anel difuso, porque o contorno do card é
       * desenhado com sombra. Aqui ela volta no contrato dos nossos menus
       * suspensos (`ui/menu.tsx`): borda de 1px em `gray-200`, raio 8 e
       * `shadow-high`. O `width` refaz o mesmo caminho: o `100%` do `cardBox`
       * é para o formulário ocupar a coluna da tela de entrar, e num menu
       * flutuante ele estica o balão pela largura da barra.
       */
      userButtonPopoverCard: {
        width: 'auto !important',
        border: `1px solid ${token.gray200} !important`,
        borderRadius: 'var(--radius-sm)',
        boxShadow: 'var(--shadow-high) !important',
      },
    },
  },
} as const;


export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    ...baseMetadata,
    openGraph: { ...baseMetadata.openGraph, locale: locale.replace('-', '_') },
  };
}

const baseMetadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${platform.name} — ${platform.tagline}`,
    template: `%s | ${platform.name}`,
  },
  description: platform.shortDescription,
  applicationName: platform.name,
  publisher: platform.name,
  category: 'technology',
  // Sem `alternates` aqui: cada página indexável declara o próprio canonical
  // em `buildMetadata`, e o valor herdado vazava para a 404 e para o painel,
  // que passavam a apontar para a home.
  openGraph: {
    type: 'website',
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
} satisfies Metadata;

export const viewport: Viewport = {
  themeColor: '#0b8639',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  // Sem isto env(safe-area-inset-*) vale zero no iOS e as barras inferiores colam na borda.
  viewportFit: 'cover',
  // Com o teclado aberto o Chrome Android encolhe o layout: as barras fixas do
  // checkout e o h-dvh da sacola sobem junto em vez de cobrir o campo focado.
  interactiveWidget: 'resizes-content',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  // Sem isto as páginas estáticas (landing, cardápio) virariam dinâmicas: o
  // idioma sai do parâmetro da rota, e não do cabeçalho da requisição.
  setRequestLocale(locale);
  const t = await getTranslations('common');

  const content = (
    <>
      <a
        href="#conteudo"
        className="sr-only fixed left-4 top-4 z-100 rounded-sm bg-gray-800 px-4 py-2 text-body2 font-semibold text-white focus:not-sr-only focus:fixed"
      >
        {t('skipToContent')}
      </a>
      {children}
    </>
  );

  return (
    // data-scroll-behavior: o `scroll-behavior: smooth` do globals.css vale para
    // âncoras; com o atributo o Next desliga a suavidade durante a troca de rota
    // e a ida ao topo ao abrir um prato é instantânea, como num app.
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${figtree.variable} ${jetbrainsMono.variable}`}
    >
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <NextIntlClientProvider>
          {/* No modo demonstração não há chaves do Clerk para carregar — e o
              provider sem chave derruba a página inteira. */}
          {demoMode ? (
            content
          ) : (
            <ClerkProvider {...clerkProviderProps} localization={clerkLocalization[locale]}>
              {content}
            </ClerkProvider>
          )}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}