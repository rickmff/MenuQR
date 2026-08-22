import 'server-only';

interface Attempt {
  count: number;
  resetAt: number;
}

const attempts = new Map<string, Attempt>();

/**
 * Limite simples em memória para conter tentativas repetidas de login.
 * Vale por instância do servidor; em produção com várias instâncias, troque por
 * um contador compartilhado (Redis/Upstash) sem mudar a interface.
 */
export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryInSeconds: number } {
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryInSeconds: 0 };
  }

  current.count += 1;
  if (current.count > limit) {
    return { allowed: false, retryInSeconds: Math.ceil((current.resetAt - now) / 1000) };
  }
  return { allowed: true, retryInSeconds: 0 };
}

export function resetRateLimit(key: string): void {
  attempts.delete(key);
}

// Evita crescimento indefinido do mapa em processos longos.
if (typeof setInterval === 'function') {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, attempt] of attempts) {
      if (attempt.resetAt <= now) attempts.delete(key);
    }
  }, 10 * 60 * 1000);
  timer.unref?.();
}
