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

/* ------------------------------------------------- variações de leitura */

function hexToRgb(hex: string): [number, number, number] {
  const clean = normalizeHexColor(hex).slice(1);
  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const channelHex = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, '0');
  return `#${channelHex(r)}${channelHex(g)}${channelHex(b)}`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const [r, g, b] = hexToRgb(hex).map((value) => value / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/**
 * Versão da cor da marca legível como TEXTO sobre fundo claro.
 *
 * Cores claras (amarelo, lima, ciano) não têm contraste suficiente para
 * escrever sobre o fundo do cardápio, então escurecemos o mesmo tom até
 * atingir 4,5:1. Se nem o tom mais escuro resolver, cai para o quase-preto —
 * melhor perder a cor do que a leitura.
 */
export function readableOnLight(brand: string, background = '#faf7f4', minRatio = 4.5): string {
  const { h, s, l } = hexToHsl(brand);
  // Mantém alguma saturação: escurecer sem cor vira cinza.
  const saturation = Math.max(s, 0.4);

  for (let step = 0; step <= 24; step += 1) {
    const candidate = hslToHex(h, saturation, Math.max(0.05, l - step * 0.03));
    if (contrastRatio(candidate, background) >= minRatio) return candidate;
  }
  return '#1c1815';
}
