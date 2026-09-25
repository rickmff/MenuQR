import type { OpeningRange, WeeklyHours } from './types';

/**
 * A leitura da aba de horários — uma só para a server action e para o modo
 * demonstração, que precisam recusar exatamente os mesmos envios.
 *
 * Módulo puro: não conhece idioma. Devolve o motivo de cada dia recusado, e
 * quem chama escreve a frase ("Terça-feira: informe a abertura…") no idioma
 * de quem salvou.
 */

/** Até quantas faixas um dia tem: almoço e jantar. */
export const MAX_RANGES_PER_DAY = 2;

/**
 * Por que um dia não pode ser gravado. `extraEmpty` é o segundo horário
 * acrescentado e deixado em branco: a correção ali é tirá-lo, não desligar o
 * dia, e a frase precisa dizer isso.
 */
export type HoursProblem = 'incomplete' | 'extraEmpty' | 'overlap';

/**
 * A chave da frase de cada motivo — igual em `painel.actions` (servidor) e em
 * `demo.actions` (modo demonstração).
 */
export const HOURS_MESSAGE = {
  incomplete: 'hoursIncomplete',
  extraEmpty: 'hoursExtraEmpty',
  overlap: 'hoursOverlap',
} as const satisfies Record<HoursProblem, string>;

/** Nome do campo de uma faixa: `hours-2-0-open` é a abertura da primeira faixa de terça. */
export function hoursFieldName(day: number, range: number, edge: 'open' | 'close'): string {
  return `hours-${day}-${range}-${edge}`;
}

/** A chave do erro de um dia (`hours-2`): a mensagem mora na linha daquele dia. */
export function hoursErrorKey(day: number): string {
  return `hours-${day}`;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_MINUTES = 24 * 60;

function toMinutes(time: string): number {
  const [hours = '0', minutes = '0'] = time.split(':');
  return Number.parseInt(hours, 10) * 60 + Number.parseInt(minutes, 10);
}

/**
 * A faixa em minutos, com o fechamento depois da abertura: 18:00–02:00 vai
 * até 26:00, como `getOpeningStatus` lê. Abertura igual ao fechamento é o dia
 * inteiro.
 */
function span(range: OpeningRange): [number, number] {
  const open = toMinutes(range.open);
  let close = toMinutes(range.close);
  if (close <= open) close += DAY_MINUTES;
  return [open, close];
}

function overlaps(a: OpeningRange, b: OpeningRange): boolean {
  const [aOpen, aClose] = span(a);
  const [bOpen, bClose] = span(b);
  return aOpen < bClose && bOpen < aClose;
}

function read(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

interface RawRange {
  open: string;
  close: string;
  /**
   * O campo veio no envio. Um dia ligado manda as faixas mesmo vazias; o
   * interruptor desligado tira os campos do envio (`disabled`).
   */
  sent: boolean;
}

/**
 * As faixas enviadas para um dia. O formato de hoje é `hours-{dia}-{n}-open`;
 * o antigo, de uma faixa só (`hours-{dia}-open`), vale como a faixa 0 — uma
 * aba aberta antes da atualização continua salvando. No antigo, os dois em
 * branco eram o jeito de fechar o dia, e continuam sendo.
 */
function rawRanges(formData: FormData, day: number): RawRange[] {
  const ranges: RawRange[] = [];
  for (let index = 0; index < MAX_RANGES_PER_DAY; index += 1) {
    const openKey = hoursFieldName(day, index, 'open');
    const closeKey = hoursFieldName(day, index, 'close');
    ranges.push({
      open: read(formData, openKey),
      close: read(formData, closeKey),
      sent: formData.has(openKey) || formData.has(closeKey),
    });
  }
  if (!ranges.some((range) => range.sent)) {
    ranges[0] = {
      open: read(formData, `hours-${day}-open`),
      close: read(formData, `hours-${day}-close`),
      sent: false,
    };
  }
  return ranges;
}

/**
 * Lê os sete dias. Dia sem nenhum campo (o interruptor desligado tira os
 * campos do envio) é dia fechado. Uma faixa que está na tela pela metade, em
 * branco ou fora do formato HH:MM recusa o dia com `incomplete` — na tela,
 * fechar o dia é o interruptor, e um dia ligado sem horário não pode virar
 * "fechado" calado; o segundo horário todo em branco recusa com `extraEmpty`.
 * Duas faixas que se cruzam recusam com `overlap`. As faixas
 * de um dia são gravadas na ordem do relógio — é nessa ordem que a loja
 * procura a próxima abertura.
 */
export function readHoursForm(formData: FormData): {
  hours: WeeklyHours;
  problems: Partial<Record<number, HoursProblem>>;
} {
  const hours: WeeklyHours = {};
  const problems: Partial<Record<number, HoursProblem>> = {};

  for (let day = 0; day < 7; day += 1) {
    const ranges: OpeningRange[] = [];
    let refused: HoursProblem | null = null;
    for (const [index, { open, close, sent }] of rawRanges(formData, day).entries()) {
      if (!open && !close && !sent) continue;
      if (!TIME_PATTERN.test(open) || !TIME_PATTERN.test(close)) {
        refused = index > 0 && !open && !close ? 'extraEmpty' : 'incomplete';
        break;
      }
      ranges.push({ open, close });
    }
    if (refused) {
      problems[day] = refused;
      hours[day] = [];
      continue;
    }
    ranges.sort((a, b) => toMinutes(a.open) - toMinutes(b.open));
    if (ranges.some((range, index) => ranges.slice(index + 1).some((other) => overlaps(range, other)))) {
      problems[day] = 'overlap';
    }
    hours[day] = ranges;
  }

  return { hours, problems };
}
