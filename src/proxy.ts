import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { demoMode } from '@/lib/demo/config';
import { routing } from '@/i18n/routing';

// Comparação de caminho à mão, e não `createRouteMatcher`: além de estar a
// caminho da remoção, o Clerk desaconselha decidir acesso por rota no
// middleware. Aqui ninguém decide acesso — só redireciona (veja abaixo).
const isPainel = (pathname: string) => pathname === '/painel' || pathname.startsWith('/painel/');

/** Rotas que perguntam quem está logado e por isso passam pelo Clerk. */
const needsClerk = (pathname: string) =>
  isPainel(pathname) ||
  /^\/(entrar|criar-conta)(\/|$)/.test(pathname) ||
  /^\/(api|trpc)(\/|$)/.test(pathname) ||
  pathname.startsWith('/__clerk');

/** Páginas: tudo o que não é API nem rota interna do Clerk ganha o idioma. */
const isPage = (pathname: string) => !/^\/(api|trpc|__clerk)(\/|$)/.test(pathname);

/**
 * Idioma sem prefixo no endereço: lê o cookie (ou o `Accept-Language`, na
 * primeira visita) e reescreve por dentro para `/[locale]/...`.
 */
const intl = createIntlMiddleware(routing);

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
  const { pathname } = request.nextUrl;
  // Ações (POST) seguem adiante e respondem "sessão expirada" no próprio formulário.
  if (isPainel(pathname) && request.method === 'GET') {
    const { userId } = await auth();
    if (!userId) {
      const login = new URL('/entrar', request.url);
      login.searchParams.set('proximo', `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(login);
    }
  }
  return isPage(pathname) ? intl(request) : undefined;
});

/**
 * O cardápio público (`/r/...`) e as páginas institucionais passam só pelo
 * idioma, sem o Clerk: são o caminho mais quente do site e não têm nada de
 * conta para resolver. No modo demonstração a conta vive no navegador e o
 * Clerk nem existe.
 */
export function proxy(request: NextRequest, event: Parameters<typeof clerkProxy>[1]) {
  const { pathname } = request.nextUrl;
  if (demoMode || !needsClerk(pathname)) {
    return isPage(pathname) ? intl(request) : NextResponse.next();
  }
  return clerkProxy(request, event);
}

/**
 * Fora ficam os arquivos (qualquer caminho com ponto: `/icon.svg`,
 * `/llms.txt`, `/r/x/manifest.webmanifest`), as fotos em `/img`, as imagens
 * de compartilhamento e o que o Next serve sozinho.
 */
export const config = {
  matcher: [
    '/((?!_next|_vercel|img/|.*/opengraph-image|opengraph-image|apple-icon|.*\\..*).*)',
    '/(api|trpc)(.*)',
    '/__clerk/:path*',
  ],
};
