import { addressPoint, formatRadius, type Coordinates } from './delivery-area';
import type { UiText } from './i18n';
import type { Business, DeliveryQuote, DeliveryZone } from './types';

/**
 * Entrega cobrada por distância.
 *
 * O restaurante marca o próprio ponto no mapa (aba Entrega) e define uma taxa
 * base que cobre os primeiros quilômetros, mais um valor por quilômetro que
 * passar disso. O cliente digita o CEP, o servidor devolve o ponto dele
 * (`/api/cep`) e a conta acontece aqui — a mesma função no resumo da sacola, no
 * checkout e na mensagem do WhatsApp, para os três nunca discordarem.
 *
 * A distância é em linha reta. Ela é sempre menor que a rodada de moto, e é de
 * propósito: é a única que dá para calcular sem um serviço de rotas pago, e é
 * previsível para o lojista, que escolhe a taxa sabendo disso.
 */

const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Distância em linha reta entre dois pontos, em quilômetros. */
export function distanceBetween(from: Coordinates, to: Coordinates): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * A loja cobra por distância e tem como calcular? Sem o ponto no mapa não tem:
 * aí a entrega volta a ser combinada na conversa, em vez de o cliente ficar
 * preso num campo de CEP que nunca responde.
 */
export function chargesByDistance(business: Business): boolean {
  return (
    business.delivery.enabled
    && business.delivery.pricing === 'distance'
    && addressPoint(business.address) !== null
  );
}

/**
 * Os bairros que ainda valem para o cliente. Cobrando por km não vale nenhum —
 * e os que o lojista cadastrou antes continuam guardados, sem aparecer no
 * cardápio, para voltarem inteiros se ele mudar de ideia.
 */
export function activeZones(business: Business): DeliveryZone[] {
  return chargesByDistance(business) ? [] : business.delivery.zones;
}

/** Longe demais para entregar. Raio zerado é "sem limite". */
export function isOutOfRange(business: Business, distanceKm: number): boolean {
  const { radiusKm } = business.delivery;
  return radiusKm > 0 && distanceKm > radiusKm;
}

/**
 * Taxa para uma distância: a base cobre os primeiros quilômetros, o resto é
 * proporcional. `null` quando o endereço está fora do raio — o pedido ainda
 * segue, com a entrega marcada para o restaurante combinar.
 */
export function distanceFee(business: Business, distanceKm: number): number | null {
  if (isOutOfRange(business, distanceKm)) return null;
  const { baseFee, baseKm, perKmFee } = business.delivery.distance;
  const extraKm = Math.max(0, distanceKm - baseKm);
  return Math.round((baseFee + extraKm * perKmFee) * 100) / 100;
}

/** A taxa da cotação que o cliente tem em mãos, ou `null` se não dá para cobrar. */
export function quoteFee(business: Business, quote: DeliveryQuote | null): number | null {
  if (!quote || !chargesByDistance(business)) return null;
  return distanceFee(business, quote.distanceKm);
}

/**
 * Como a taxa é explicada no checkout: "R$ 6,00 até 2 km, R$ 1,50 por km depois".
 * O cliente vê a regra antes de digitar o CEP, e não só o número no fim.
 */
export function describeDistancePricing(
  business: Business,
  formatMoney: (value: number) => string,
  text: UiText,
): string {
  const { t, locale } = text;
  const { baseFee, baseKm, perKmFee } = business.delivery.distance;
  const base = baseFee > 0 ? formatMoney(baseFee) : t('delivery.free');
  if (perKmFee <= 0) return t('delivery.flatPricing', { base });
  return t('delivery.distancePricing', {
    base,
    radius: formatRadius(baseKm, locale),
    perKm: formatMoney(perKmFee),
  });
}

/** `4.27` → `4,3 km` (`4.3 km` em inglês). Abaixo de 1 km a conta vira metros. */
export function formatDistance(km: number, locale: string): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  const value = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    useGrouping: false,
  }).format(km);
  return `${value} km`;
}

/** Só os dígitos do CEP, no máximo oito. */
export function onlyPostalDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8);
}

/** `01310100` → `01310-100`, sem atrapalhar quem ainda está digitando. */
export function maskPostalCode(value: string): string {
  const digits = onlyPostalDigits(value);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function isValidPostalCode(value: string): boolean {
  return onlyPostalDigits(value).length === 8;
}
