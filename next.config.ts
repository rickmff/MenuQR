import type { NextConfig } from 'next';

/**
 * Cabeçalhos de segurança aplicados a todas as respostas.
 * `script-src` mantém 'unsafe-inline' porque o Next injeta o script de
 * hidratação inline; troque por uma política com nonce (via middleware)
 * se o projeto passar a exigir CSP estrita.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
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

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  trailingSlash: false,

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
