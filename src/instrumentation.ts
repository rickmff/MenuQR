import type { Instrumentation } from 'next';

/**
 * Erros visíveis sem serviço externo.
 *
 * Antes, um erro em produção só existia no console do navegador de quem o sofreu: o
 * dono da plataforma ficava sabendo quando o lojista reclamava. Agora todo erro vira
 * uma linha JSON no log do servidor — é o que aparece em "Logs" na Vercel, e dá para
 * filtrar por `menuqr_error`. O `digest` é o mesmo que o navegador recebe, então a
 * linha do servidor e o relato de `/api/erros` se encontram por ele.
 *
 * Para plugar Sentry ou similar: o SDK inicializa num `register()` exportado daqui,
 * `captureRequestError(error, request, context)` entra em `onRequestError`, e o
 * relato do navegador passa a sair de `src/app/error.tsx` direto para o SDK.
 */

export interface ErrorLogEntry {
  /** Quem contou: o servidor capturou o erro, ou o navegador relatou por `/api/erros`. */
  source: 'servidor' | 'navegador';
  path: string;
  method?: string;
  /** Arquivo da rota (`/r/[slug]`), sem os valores de quem acessou. */
  route?: string;
  routeType?: string;
  digest?: string;
  message: string;
}

const MAX_MESSAGE = 1000;
const MAX_PATH = 200;

/**
 * Os links de redefinir senha e de confirmar e-mail levam o token no caminho, e log
 * é lugar onde segredo não pode parar. Endereços de cardápio são minúsculos e curtos
 * (`slugify`); um trecho longo com maiúscula, ou todo em hexadecimal, é token.
 */
function looksLikeToken(segment: string): boolean {
  if (segment.length < 32) return false;
  return /^[0-9a-f]+$/.test(segment) || (/^[\w-]+$/.test(segment) && /[A-Z]/.test(segment));
}

/** Só o caminho: a query e o fragmento ficam de fora (o modo demonstração leva o cardápio no `#`). */
export function safePath(path: string): string {
  const pathname = path.split(/[?#]/)[0] ?? '';
  return pathname
    .split('/')
    .map((segment) => (looksLikeToken(segment) ? '[token]' : segment))
    .join('/')
    .slice(0, MAX_PATH);
}

/** Uma linha por erro, sempre com as mesmas chaves, para o log ser pesquisável. */
export function logError(entry: ErrorLogEntry): void {
  console.error(
    JSON.stringify({
      level: 'error',
      event: 'menuqr_error',
      time: new Date().toISOString(),
      source: entry.source,
      path: safePath(entry.path),
      method: entry.method ?? null,
      route: entry.route ?? null,
      routeType: entry.routeType ?? null,
      digest: entry.digest ?? null,
      message: entry.message.slice(0, MAX_MESSAGE),
    }),
  );
}

export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  // Em Server Components o React pode entregar outro objeto no lugar do erro original;
  // o que sobrevive é o `digest`, por isso ele vai sempre junto.
  const digest =
    typeof error === 'object' && error !== null && 'digest' in error ? String(error.digest) : undefined;

  logError({
    source: 'servidor',
    path: request.path,
    method: request.method,
    route: context.routePath,
    routeType: context.routeType,
    digest,
    message: error instanceof Error ? error.message : String(error),
  });
};
