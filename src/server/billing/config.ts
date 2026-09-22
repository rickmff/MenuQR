import 'server-only';
import { serverEnv } from '../env';

/**
 * `asaas` cobra; `off` libera tudo (desenvolvimento, instalação própria). O
 * padrão é cobrar: desligar tem de ser um ato explícito, para uma variável
 * esquecida nunca abrir o painel de graça.
 */
export function billingMode(): 'asaas' | 'off' {
  return serverEnv().BILLING_MODE;
}
