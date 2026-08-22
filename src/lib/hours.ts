import type { OpeningRange, WeeklyHours } from './types';

export const DAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const;

/** Códigos usados pelo schema.org/OpeningHoursSpecification. */
export const SCHEMA_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export interface OpeningStatus {
  open: boolean;
  /** Horário de fechamento quando aberto. */
  closesAt?: string;
  /** Próxima abertura quando fechado. */
  nextDay?: number;
  nextTime?: string;
  daysAhead?: number;
}

function toMinutes(time: string): number {
  const [hours = '0', minutes = '0'] = (time ?? '').split(':');
  return Number.parseInt(hours, 10) * 60 + Number.parseInt(minutes, 10);
}

/**
 * Diz se a loja está aberta em `reference`, considerando faixas que atravessam
 * a meia-noite (18:00 → 00:30 conta como aberto às 00:10 do dia seguinte).
 */
export function getOpeningStatus(hours: WeeklyHours, reference: Date = new Date()): OpeningStatus {
  const day = reference.getDay();
  const minutes = reference.getHours() * 60 + reference.getMinutes();

  const check = (dayIndex: number, offset: number): OpeningStatus | null => {
    for (const range of hours[dayIndex] ?? []) {
      const open = toMinutes(range.open);
      let close = toMinutes(range.close);
      if (close <= open) close += 24 * 60;
      const current = minutes + offset;
      if (current >= open && current < close) return { open: true, closesAt: range.close };
    }
    return null;
  };

  const today = check(day, 0);
  if (today) return today;

  // Faixa aberta ontem que ainda está correndo (madrugada).
  const yesterday = check((day + 6) % 7, 24 * 60);
  if (yesterday) return yesterday;

  for (let daysAhead = 0; daysAhead < 8; daysAhead += 1) {
    const index = (day + daysAhead) % 7;
    for (const range of hours[index] ?? []) {
      if (daysAhead > 0 || toMinutes(range.open) > minutes) {
        return { open: false, nextDay: index, nextTime: range.open, daysAhead };
      }
    }
  }
  return { open: false };
}

export function describeNextOpening(status: OpeningStatus): string {
  if (status.open) return `Aberto agora até ${status.closesAt}`;
  if (!status.nextTime || status.nextDay === undefined) return 'Fechado no momento';
  if (status.daysAhead === 0) return `Abre hoje às ${status.nextTime}`;
  if (status.daysAhead === 1) return `Abre amanhã às ${status.nextTime}`;
  return `Abre ${DAY_NAMES[status.nextDay]?.toLowerCase()} às ${status.nextTime}`;
}

/** Lista pronta para exibição no rodapé e na página de contato. */
export function getWeeklyHours(hours: WeeklyHours) {
  return DAY_NAMES.map((label, index) => {
    const ranges: OpeningRange[] = hours[index] ?? [];
    return {
      index,
      label,
      ranges,
      text: ranges.length ? ranges.map((range) => `${range.open} às ${range.close}`).join(' · ') : 'Fechado',
    };
  });
}
