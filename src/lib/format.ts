/** Formatação de moeda, telefone e texto usada em todo o site. */

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatPrice(value: number): string {
  return currency.format(Number.isFinite(value) ? value : 0);
}

/** Formato exigido pelo schema.org (`priceCurrency` separado): "29.90". */
export function schemaPrice(value: number): string {
  return (Number.isFinite(value) ? value : 0).toFixed(2);
}

export function onlyDigits(value: string): string {
  return (value ?? '').replace(/\D/g, '');
}

/** Máscara progressiva: (11) 98765-4321 */
export function maskPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function isValidPhone(value: string): boolean {
  const digits = onlyDigits(value);
  return digits.length === 10 || digits.length === 11;
}

/** Lê valores digitados como "R$ 1.234,50" e devolve 1234.5. */
export function parseMoney(value: string): number {
  const raw = (value ?? '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number.parseFloat(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Formato E.164 para links tel: e schema.org. Ex.: +5511987654321 */
export function toE164(digits: string): string {
  return `+${onlyDigits(digits)}`;
}
