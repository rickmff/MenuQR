import 'server-only';
import { serverEnv } from '../env';

/** Cobrança pedida sem a chave do Asaas: mensagem clara, como `DatabaseConfigError`. */
export class AsaasConfigError extends Error {}

export function asaasConfigured(): boolean {
  return Boolean(serverEnv().ASAAS_API_KEY);
}

/** Sandbox e produção são contas separadas no Asaas, com chaves separadas — a URL segue a variável. */
export function asaasBaseUrl(): string {
  return serverEnv().ASAAS_ENV === 'production' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3';
}

export function asaasApiKey(): string {
  const key = serverEnv().ASAAS_API_KEY;
  if (!key) {
    throw new AsaasConfigError(
      'ASAAS_API_KEY não configurada. Gere uma chave em Integrações → API no Asaas (sandbox ou produção, ' +
        'conforme ASAAS_ENV) ou defina BILLING_MODE=off para rodar sem cobrança.',
    );
  }
  return key;
}

export function asaasWebhookToken(): string | null {
  return serverEnv().ASAAS_WEBHOOK_TOKEN ?? null;
}
