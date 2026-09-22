import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { demoMode } from '@/lib/demo/config';

// Comparação de caminho à mão, e não `createRouteMatcher`: além de estar a
// caminho da remoção, o Clerk desaconselha decidir acesso por rota no
// middleware. Aqui ninguém decide acesso — só redireciona (veja abaixo).
const isPainel = (pathname: string) => pathname === '/painel' || pathname.startsWith('/painel/');

/**
 * Prepara a sessão do Clerk para as rotas que perguntam quem está logado, e
 * manda quem abre o painel deslogado para a tela de entrada levando o destino
 * junto.
 *
 * Quem barra o acesso é o layout do painel, com `requireUser`. Ele, porém, não
 * enxerga o caminho da requisição — sozinho, mandava todo mundo de volta para
 * `/painel` depois do login, mesmo quem tinha aberto `/painel/cardapio`. Este
 * redirecionamento é só essa conveniência: se escapar dele, a página e a ação
 * conferem a sessão de novo, cada uma por conta própria.
 */
const clerkProxy = clerkMiddleware(async (auth, request) => {
  if (!isPainel(request.nextUrl.pathname)) return;
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
export const proxy = demoMode ? () => NextResponse.next() : clerkProxy;

/**
 * Só as rotas que realmente perguntam quem está logado. O cardápio público
 * (`/r/...`) e as imagens ficam de fora de propósito: são o caminho mais
 * quente do site e não têm nada de conta para resolver.
 */
export const config = {
  matcher: ['/painel/:path*', '/entrar/:path*', '/criar-conta/:path*', '/(api|trpc)(.*)', '/__clerk/:path*'],
};
