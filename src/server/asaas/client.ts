import 'server-only';
import { asaasApiKey, asaasBaseUrl } from './config';

/** Resposta fora de 2xx. `errors` vem no formato do Asaas: `{ code, description }`. */
export class AsaasError extends Error {
  status: number;
  errors: { code: string; description: string }[];

  constructor(status: number, errors: { code: string; description: string }[], message?: string) {
    super(message ?? `Asaas respondeu ${status}: ${errors.map((entry) => entry.description).join('; ') || 'sem detalhes'}`);
    this.status = status;
    this.errors = errors;
  }
}

const TIMEOUT_MS = 15_000;

/**
 * Uma chamada ao Asaas. `fetch` nativo, sem SDK: são meia dúzia de endpoints e
 * o formato é estável. Erros HTTP viram `AsaasError`; falha de rede e tempo
 * esgotado sobem como vieram (quem chama trata os dois do mesmo jeito).
 */
export async function asaasRequest<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${asaasBaseUrl()}${path}`, {
    method,
    headers: {
      access_token: asaasApiKey(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'MenuQR',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  });

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const errors = Array.isArray((parsed as { errors?: unknown })?.errors)
      ? ((parsed as { errors: { code?: unknown; description?: unknown }[] }).errors.map((entry) => ({
          code: String(entry.code ?? ''),
          description: String(entry.description ?? ''),
        })))
      : [];
    throw new AsaasError(response.status, errors);
  }

  return parsed as T;
}
