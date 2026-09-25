import type { UiText } from './i18n';
import type { OpeningRange, WeeklyHours } from './types';

/**
 * Chave de cada dia (0 = domingo, como em `Date.getDay()`). O nome na tela sai
 * de `ui.hours.days.<chave>` — use `dayName(index, text)`.
 */
export const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

export type Weekday = (typeof WEEKDAYS)[number];

/** "Segunda-feira" / "Monday". */
export function dayName(index: number, { t }: Pick<UiText, 't'>): string {
  const key = WEEKDAYS[index];
  return key ? t(`hours.days.${key}`) : '';
}

// Um formatador por idioma: a sacola recalcula o status a cada tecla.
const clockFormatters = new Map<string, Intl.DateTimeFormat>();

/**
 * Hora guardada ("18:30") no jeito de ler do idioma: "18:30" em português,
 * "6:30 PM" em inglês. Não tem fuso: é a hora de parede do restaurante.
 */
export function formatClock(time: string, locale: string): string {
  const [hours, minutes] = (time ?? '').split(':').map((part) => Number.parseInt(part, 10));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return time;
  let formatter = clockFormatters.get(locale);
  if (!formatter) {
    try {
      const h12 = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12;
      formatter = new Intl.DateTimeFormat(locale, {
        hour: h12 ? 'numeric' : '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      });
    } catch {
      return time;
    }
    clockFormatters.set(locale, formatter);
  }
  return formatter.format(Date.UTC(2020, 0, 1, hours! % 24, minutes!));
}

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

/** Horário de Brasília: vale para a maior parte do país e para endereço sem UF. */
export const DEFAULT_TIME_ZONE = 'America/Sao_Paulo';

/** Só as UFs fora do horário de Brasília; o resto cai no padrão. */
const STATE_TIME_ZONES: Record<string, string> = {
  AC: 'America/Rio_Branco',
  AM: 'America/Manaus',
  RR: 'America/Boa_Vista',
  RO: 'America/Porto_Velho',
  MT: 'America/Cuiaba',
  MS: 'America/Campo_Grande',
};

/**
 * Fuso do restaurante, tirado da UF do endereço — não existe coluna de fuso no
 * banco. Fernando de Noronha (PE) e o extremo oeste do Amazonas fogem do fuso
 * do próprio estado; pela UF não dá para separar, então seguem o do estado.
 */
export function timeZoneForState(uf: string | null | undefined): string {
  return STATE_TIME_ZONES[(uf ?? '').trim().toUpperCase()] ?? DEFAULT_TIME_ZONE;
}

/** Data e hora "de parede" de um instante, no fuso pedido. */
export interface ZonedDateParts {
  /** 0 = domingo, como em `Date.getDay()`. */
  weekday: number;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

// Criar um Intl.DateTimeFormat é caro, e a sacola recalcula o status a cada
// tecla digitada no checkout.
const zonedFormatters = new Map<string, Intl.DateTimeFormat>();

function zonedFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = zonedFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    zonedFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/**
 * Lê o relógio no fuso do restaurante, e não no do aparelho: celular com fuso
 * errado, ou cliente viajando, via a loja aberta com ela fechada — e o botão
 * de enviar pedido segue a mesma conta.
 */
export function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  try {
    const parts = zonedFormatter(timeZone).formatToParts(date);
    const read = (type: Intl.DateTimeFormatPartTypes) =>
      Number.parseInt(parts.find((part) => part.type === type)?.value ?? '', 10);
    const year = read('year');
    const month = read('month');
    const day = read('day');
    const hour = read('hour');
    const minute = read('minute');
    if ([year, month, day, hour, minute].every(Number.isFinite)) {
      return {
        // Dia da semana pela data já convertida: não depende do idioma do Intl.
        weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
        year,
        month,
        day,
        // Alguns motores escrevem a meia-noite como 24.
        hour: hour % 24,
        minute,
      };
    }
  } catch {
    /* navegador sem a base de fusos: cai no relógio do aparelho, logo abaixo */
  }
  // Melhor o comportamento antigo do que derrubar a loja inteira por um RangeError.
  return {
    weekday: date.getDay(),
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
}

function toMinutes(time: string): number {
  const [hours = '0', minutes = '0'] = (time ?? '').split(':');
  return Number.parseInt(hours, 10) * 60 + Number.parseInt(minutes, 10);
}

/**
 * Diz se a loja está aberta em `reference`, considerando faixas que atravessam
 * a meia-noite (18:00 → 00:30 conta como aberto às 00:10 do dia seguinte).
 * Dia e hora são os do fuso do restaurante (`timeZoneForState`).
 */
export function getOpeningStatus(
  hours: WeeklyHours,
  timeZone: string,
  reference: Date = new Date(),
): OpeningStatus {
  const local = getZonedDateParts(reference, timeZone);
  const day = local.weekday;
  const minutes = local.hour * 60 + local.minute;

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

/**
 * Frase completa do status: "Aberto agora até 23:00", "Abre amanhã às 18:00".
 * Para o curto "Aberto até 23:00", use `t('hours.openUntil', { time: formatClock(...) })`.
 */
export function describeNextOpening(status: OpeningStatus, text: UiText): string {
  const { t, locale } = text;
  if (status.open) return t('hours.openNowUntil', { time: formatClock(status.closesAt ?? '', locale) });
  if (!status.nextTime || status.nextDay === undefined) return t('hours.closedNow');
  const time = formatClock(status.nextTime, locale);
  if (status.daysAhead === 0) return t('hours.opensToday', { time });
  if (status.daysAhead === 1) return t('hours.opensTomorrow', { time });
  return t('hours.opensOn', { day: WEEKDAYS[status.nextDay] ?? '', time });
}

/** Uma faixa de horário: "18:00 às 23:00" / "6:00 PM – 11:00 PM". */
export function describeRange(range: OpeningRange, { t, locale }: UiText): string {
  return t('hours.range', { open: formatClock(range.open, locale), close: formatClock(range.close, locale) });
}

/** Lista pronta para exibição no rodapé e na página de contato. */
export function getWeeklyHours(hours: WeeklyHours, text: UiText) {
  return WEEKDAYS.map((_, index) => {
    const ranges: OpeningRange[] = hours[index] ?? [];
    return {
      index,
      label: dayName(index, text),
      ranges,
      text: ranges.length
        ? ranges.map((range) => describeRange(range, text)).join(' · ')
        : text.t('hours.closed'),
    };
  });
}
