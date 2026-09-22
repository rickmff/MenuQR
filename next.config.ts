import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Endereço da Frontend API do Clerk, tirado da própria chave pública: ela é um
 * base64 do host com um `$` no fim. Assim a política acerta sozinha a
 * instância de desenvolvimento (`algo.clerk.accounts.dev`) e a de produção
 * (`clerk.seu-dominio`), sem uma segunda variável para manter em dia.
 */
function clerkFrontendApi(): string | null {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key) return null;
  try {
    const host = Buffer.from(key.replace(/^pk_(test|live)_/, ''), 'base64').toString('utf8').replace(/\$$/, '');
    return /^[a-z0-9.-]+$/i.test(host) ? host : null;
  } catch {
    return null;
  }
}

/**
 * O que o Clerk precisa ver liberado. Sem chave (modo demonstração) nada disso
 * entra e a política continua fechada.
 *
 * `*.protect.clerk.com` é a proteção contra abuso, que vale para qualquer
 * aplicação; em `connect-src` ela exige o `:*` no fim porque responde em
 * portas fora da 443, e uma origem sem porta só casa com a 443.
 * `challenges.cloudflare.com` é o desafio anti-robô, que roda dentro de um
 * iframe — por isso aparece também em `frame-src`.
 */
function clerkCsp(): Record<string, string[]> {
  const fapi = clerkFrontendApi();
  if (!fapi) return {};
  return {
    'script-src': [`https://${fapi}`, 'https://challenges.cloudflare.com', 'https://*.protect.clerk.com'],
    'connect-src': [`https://${fapi}`, 'https://*.protect.clerk.com:*'],
    'frame-src': ['https://challenges.cloudflare.com', 'https://*.protect.clerk.com'],
    // O clerk-js roda parte do trabalho num worker criado a partir de um blob.
    'worker-src': ["'self'", 'blob:'],
  };
}

/**
 * Cabeçalhos de segurança aplicados a todas as respostas.
 * `script-src` mantém 'unsafe-inline' porque o Next injeta o script de
 * hidratação inline; troque por uma política com nonce (via middleware)
 * se o projeto passar a exigir CSP estrita.
 *
 * Em desenvolvimento a política precisa ceder em três pontos, senão o próprio
 * `next dev` não roda: React usa eval() no modo de desenvolvimento, o
 * recarregamento automático abre um WebSocket e `upgrade-insecure-requests`
 * transformaria http://localhost em https.
 */
const clerk = clerkCsp();

/** Junta a diretiva base com o que o Clerk precisa, quando precisa. */
const withClerk = (directive: string, ...values: string[]): string =>
  [directive, ...values, ...(clerk[directive] ?? [])].join(' ');

const contentSecurityPolicy = [
  "default-src 'self'",
  withClerk('script-src', "'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])),
  // 'unsafe-inline' também por causa do Clerk: os componentes dele montam o
  // CSS em tempo de execução.
  "style-src 'self' 'unsafe-inline'",
  // `https:` já cobre as fotos de perfil do Clerk (img.clerk.com).
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  withClerk('connect-src', "'self'", ...(isDev ? ['ws:'] : [])),
  // Só existem quando o Clerk está ligado: sem ele, `default-src 'self'` já é
  // a resposta certa para as duas.
  ...(clerk['frame-src'] ? [withClerk('frame-src', "'self'")] : []),
  ...(clerk['worker-src'] ? [withClerk('worker-src')] : []),
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

/**
 * Modo demonstração: sem DATABASE_URL configurada, a aplicação roda inteira no
 * navegador (contas, cardápio e pedidos em localStorage), para dar para testar
 * o produto sem infraestrutura. Definir DATABASE_URL desliga o modo e volta ao
 * backend real; NEXT_PUBLIC_DEMO_MODE força um dos dois ('1' ou '0').
 */
const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE ?? (process.env.DATABASE_URL ? '0' : '1');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_DEMO_MODE: demoMode },
  poweredByHeader: false,
  compress: true,
  trailingSlash: false,

  // O cliente libSQL carrega um binário nativo: precisa ficar fora do bundle
  // para funcionar nas funções serverless (Vercel, AWS Lambda etc.).
  serverExternalPackages: ['@libsql/client', 'libsql'],

  images: {
    formats: ['image/avif', 'image/webp'],
    // Adicione aqui os domínios das fotos dos pratos, se hospedadas fora do projeto.
    remotePatterns: [],
  },

  async headers() {
    // O cache dos assets com hash já é tratado pelo próprio Next.
    return [{ source: '/:path*', headers: securityHeaders }];
  },

  async redirects() {
    // URLs da versão antiga do site (um restaurante só) caem na página inicial.
    // Antes iam para /cardapio, rota que não existe mais — um redirect para 404.
    return [
      /*
       * O endereço saiu da aba própria e passou a morar dentro de Entrega,
       * junto do mapa que o usa. Temporário (307) de propósito: é uma
       * reorganização do painel, não um endereço público aposentado — um 308
       * ficaria no cache do navegador do lojista mesmo se a aba voltasse.
       */
      { source: '/painel/negocio/endereco', destination: '/painel/negocio/entrega', permanent: false },
      { source: '/menu', destination: '/', permanent: true },
      { source: '/delivery', destination: '/', permanent: true },
      { source: '/cardapio', destination: '/', permanent: true },
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/admin.html', destination: '/', permanent: true },
    ];
  },
};

export default nextConfig;
