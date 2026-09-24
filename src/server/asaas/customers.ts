import 'server-only';
import { asaasRequest } from './client';
import type { AsaasCustomer } from './types';

export interface CustomerInput {
  name: string;
  cpfCnpj: string;
  email: string;
  mobilePhone?: string;
  /** O nosso id do dono, para achar o cliente no painel do Asaas. */
  externalReference: string;
}

/**
 * As notificações ficam LIGADAS de propósito: é o Asaas quem avisa o lojista
 * da cobrança da renovação por e-mail (o Menu Online não tem e-mail próprio).
 */
export function createCustomer(input: CustomerInput): Promise<AsaasCustomer> {
  return asaasRequest<AsaasCustomer>('POST', '/customers', { ...input, notificationDisabled: false });
}

export function updateCustomer(id: string, input: CustomerInput): Promise<AsaasCustomer> {
  return asaasRequest<AsaasCustomer>('PUT', `/customers/${encodeURIComponent(id)}`, { ...input, notificationDisabled: false });
}

export function getCustomer(id: string): Promise<AsaasCustomer> {
  return asaasRequest<AsaasCustomer>('GET', `/customers/${encodeURIComponent(id)}`);
}
