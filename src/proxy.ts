import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest } from 'next/server';
import { demoMode } from '@/lib/demo/config';

const isPainel = createRouteMatcher(['/painel(.*)']);

/**
 * Prepara a sessão do Clerk para as rotas que perguntam quem está logado, e
 * manda quem abre o painel deslogado para a tela de entrada levando o destino
 * junto.
 *
 * O layout do painel também barra quem não está logado, mas ele não enxerga o
 * caminho da requisição — sozinho, mandava todo mundo de volta para `/painel`
 * depois do login, mesmo quem tinha aberto `/painel/cardapio`. Aqui só olhamos
 * se existe sessão; a permissão sobre cada negócio continua sendo decidida no
 * servidor, a cada página e a cada ação.
 */
const clerkProxy = clerkMiddleware(async (auth, request) => {
  if (!isPainel(request)) return;
  // Ações (POST) seguem adiante e respondem "sessão expirada" no próprio formulário.
  if (request.method !== 'GET') return;

  const { userId } = await auth();
  if (userId) return;

  const login = new URL('/entrar', request.url);
  login.searchParams.set('proximo', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
});

// No modo demonstração a conta vive no navegador: não há Clerk nem chaves para
// carregar, e o painel se vira sozinho.
export const proxy = demoMode ? (_request: NextRequest) => NextResponse.next() : clerkProxy;

/**
 * Só as rotas que realmente perguntam quem está logado. O cardápio público
 * (`/r/...`) e as imagens ficam de fora de propósito: são o caminho mais
 * quente do site e não têm nada de conta para resolver.
 */
export const config = {
  matcher: ['/painel/:path*', '/entrar/:path*', '/criar-conta/:path*', '/(api|trpc)(.*)', '/__clerk/:path*'],
};
