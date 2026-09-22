import 'server-only';
import { asaasRequest } from './client';
import type { AsaasPayment, AsaasPixQrCode } from './types';

export function getPayment(id: string): Promise<AsaasPayment> {
  return asaasRequest<AsaasPayment>('GET', `/payments/${encodeURIComponent(id)}`);
}

/**
 * QR dinâmico da cobrança: imagem em base64, copia-e-cola e validade. Vale até
 * 12 meses depois do vencimento; se a cobrança mudar, buscar de novo.
 */
export function getPixQrCode(paymentId: string): Promise<AsaasPixQrCode> {
  return asaasRequest<AsaasPixQrCode>('GET', `/payments/${encodeURIComponent(paymentId)}/pixQrCode`);
}
