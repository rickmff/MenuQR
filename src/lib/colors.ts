/** Utilidades de cor para a personalização de marca de cada restaurante. */

function channel(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.replace(/./g, (c) => c + c) : clean;
  const r = Number.parseInt(full.slice(0, 2), 16) || 0;
  const g = Number.parseInt(full.slice(2, 4), 16) || 0;
  const b = Number.parseInt(full.slice(4, 6), 16) || 0;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

/**
 * Escolhe preto ou branco para escrever sobre a cor da marca, garantindo
 * contraste mínimo mesmo quando o lojista escolhe uma cor clara.
 */
export function readableTextColor(background: string): string {
  return contrastRatio('#ffffff', background) >= contrastRatio('#1c1815', background)
    ? '#ffffff'
    : '#1c1815';
}

export function isValidHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export function normalizeHexColor(value: string, fallback = '#c2410c'): string {
  return isValidHexColor(value) ? value.toLowerCase() : fallback;
}
