import { logError } from '@/instrumentation';
import { clientIp, rateLimit } from '@/server/rate-limit';

/**
 * Relato de erro vindo do navegador (`src/app/error.tsx`). Sai no log do servidor
 * na mesma linha JSON dos erros capturados por `src/instrumentation.ts`.
 *
 * A rota é pública e escreve no log, então tudo aqui é desconfiança: corpo pequeno,
 * campos cortados, limite por IP. E nada aqui pode depender de o resto estar de pé —
 * quando o banco cai é justamente quando os relatos chegam.
 */

/** Três campos curtos cabem com folga; acima disso não veio do `error.tsx`. */
const MAX_BODY_BYTES = 4 * 1024;
const MAX_MESSAGE = 500;
const MAX_DIGEST = 64;

const REPORTS_PER_WINDOW = 20;
const WINDOW_MS = 10 * 60 * 1000;

/**
 * O limite por IP mora no banco. Sem banco (fora do ar, ou modo demonstração na
 * Vercel) sobra este teto na memória: é por instância e vale para todo mundo junto —
 * folgado para relato de verdade, suficiente para um laço não encher o log.
 */
const FALLBACK_PER_WINDOW = 60;
let fallback = { count: 0, resetAt: 0 };

function allowWithoutDatabase(): boolean {
  const now = Date.now();
  if (now >= fallback.resetAt) fallback = { count: 0, resetAt: now + WINDOW_MS };
  fallback.count += 1;
  return fallback.count <= FALLBACK_PER_WINDOW;
}

/** Banco fora do ar costuma ser banco que não responde, e não banco que recusa na hora. */
const LIMITER_TIMEOUT_MS = 2000;

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('tempo esgotado')), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

async function allowed(): Promise<boolean> {
  try {
    const ip = await clientIp();
    const limit = await withTimeout(
      rateLimit(`erros-ip:${ip}`, REPORTS_PER_WINDOW, WINDOW_MS),
      LIMITER_TIMEOUT_MS,
    );
    return limit.allowed;
  } catch {
    // Relato de erro não pode falhar por causa do erro: sem banco, registra assim mesmo.
    return allowWithoutDatabase();
  }
}

/**
 * Outro site não tem por que relatar erro nosso. O navegador manda `Origin` em todo
 * POST; sem o cabeçalho (curl, monitor) a requisição passa e o limite cuida do resto.
 */
function isCrossSite(request: Request): boolean {
  const origin = request.headers.get('origin');
  const host =
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

const text = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

function respond(status: number): Response {
  return new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (isCrossSite(request)) return respond(403);
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return respond(413);
  if (!(await allowed())) return respond(429);

  // `sendBeacon` manda texto puro; o JSON é lido à mão, qualquer que seja o Content-Type.
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return respond(413);
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return respond(400);
    body = parsed as Record<string, unknown>;
  } catch {
    return respond(400);
  }

  const message = text(body.message, MAX_MESSAGE);
  if (!message) return respond(400);

  logError({
    source: 'navegador',
    // `logError` ainda tira query, fragmento e token do caminho: o navegador manda o
    // que quiser, e o que vai para o log é decidido aqui.
    path: text(body.path, 400) || '/',
    digest: text(body.digest, MAX_DIGEST) || undefined,
    message,
  });

  return respond(204);
}
