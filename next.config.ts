import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

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
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? ' ws:' : ''}`,
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
    // URLs antigas e variações comuns apontam para a página canônica (evita 404 e conteúdo duplicado).
    return [
      { source: '/menu', destination: '/cardapio', permanent: true },
      { source: '/delivery', destination: '/cardapio', permanent: true },
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/admin.html', destination: '/', permanent: true },
    ];
  },
};

export default nextConfig;
