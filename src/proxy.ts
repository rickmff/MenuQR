import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/server/auth/cookie-name';

/**
 * Link do painel aberto sem sessão: vai para o login levando o destino junto.
 *
 * O layout do painel também barra quem não está logado, mas ele não enxerga o
 * caminho da requisição — sozinho, mandava todo mundo de volta para `/painel`
 * depois do login, mesmo quem tinha aberto `/painel/cardapio`. Aqui só olhamos
 * se o cookie existe; se ele é válido continua sendo decidido no servidor, a
 * cada página e a cada ação.
 */
export function proxy(request: NextRequest) {
  // No modo demonstração a conta vive no navegador: não há cookie para conferir.
  if (process.env.NEXT_PUBLIC_DEMO_MODE === '1') return NextResponse.next();
  // Ações (POST) seguem adiante e respondem "sessão expirada" no próprio formulário.
  if (request.method !== 'GET' || request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const login = new URL('/entrar', request.url);
  login.searchParams.set('proximo', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = { matcher: ['/painel/:path*'] };
