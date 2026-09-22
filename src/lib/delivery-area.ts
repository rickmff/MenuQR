/**
 * Área de entrega: o ponto do restaurante no mapa e até onde ele entrega.
 *
 * Fica fora de `format.ts` e sem dependência de servidor porque os três lados
 * precisam das mesmas regras: o mapa do painel (navegador), a server action que
 * grava e o rodapé do cardápio publicado.
 */

import type { Business, BusinessAddress } from './types';

/** Abaixo de meio quilômetro o círculo não cobre nem o quarteirão. */
export const MIN_RADIUS_KM = 0.5;
/** Acima disso já não é entrega própria de restaurante. */
export const MAX_RADIUS_KM = 30;
/** Passo do controle e da gravação: 100 metros. */
export const RADIUS_STEP_KM = 0.1;

/** Centro do mapa quando o restaurante ainda não marcou o ponto (praça da Sé). */
export const FALLBACK_CENTER = { latitude: -23.5505, longitude: -46.6333 };

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Latitudes fora de ±90 e longitudes fora de ±180 não existem no planeta. */
export function isCoordinate(latitude: unknown, longitude: unknown): boolean {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return (
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    // (0, 0) é o Golfo da Guiné: na prática é geocodificação que falhou.
    && !(lat === 0 && lng === 0)
  );
}

/** O ponto do restaurante, ou `null` enquanto ele não foi marcado. */
export function addressPoint(address: BusinessAddress): Coordinates | null {
  if (!isCoordinate(address.latitude, address.longitude)) return null;
  return { latitude: Number(address.latitude), longitude: Number(address.longitude) };
}

/**
 * Deixa o raio dentro dos limites e arredondado no passo de 100 m. Zero passa
 * inteiro: é o valor que significa "sem raio definido".
 */
export function clampRadius(km: number): number {
  if (!Number.isFinite(km) || km <= 0) return 0;
  const bounded = Math.min(Math.max(km, MIN_RADIUS_KM), MAX_RADIUS_KM);
  return Math.round(bounded / RADIUS_STEP_KM) * RADIUS_STEP_KM;
}

/** "5 km", "1,5 km" — sem casa decimal quando é redondo. */
export function formatRadius(km: number): string {
  const value = Number.isFinite(km) ? km : 0;
  const text = Number.isInteger(value)
    ? String(value)
    : value.toFixed(1).replace('.', ',');
  return `${text} km`;
}

/** O restaurante entrega, marcou o ponto e definiu até onde vai. */
export function hasDeliveryArea(business: Business): boolean {
  return (
    business.delivery.enabled
    && business.delivery.radiusKm > 0
    && addressPoint(business.address) !== null
  );
}

/** O endereço escrito, numa linha, do jeito que a geocodificação entende. */
export function addressQuery(address: BusinessAddress): string {
  return [
    address.street,
    address.district,
    address.city,
    address.state,
    address.postalCode,
    'Brasil',
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');
}

/** Endereço com o mínimo para procurar no mapa: rua e cidade. */
export function isSearchableAddress(address: BusinessAddress): boolean {
  return Boolean(address.street.trim() && address.city.trim());
}
