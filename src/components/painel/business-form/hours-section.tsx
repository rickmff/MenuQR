'use client';

import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { AddButton } from '@/components/ui/add-button';
import { Banner } from '@/components/ui/banner';
import { IconButton } from '@/components/ui/icon-button';
import { Switch } from '@/components/ui/switch';
import { fieldClass } from '@/components/ui/text-field';
import { cn } from '@/lib/cn';
import { dayName, WEEKDAYS } from '@/lib/hours';
import { hoursErrorKey, hoursFieldName, MAX_RANGES_PER_DAY } from '@/lib/hours-form';
import { useUiText } from '@/lib/use-ui-text';
import type { Business, WeeklyHours } from '@/lib/types';

interface RangeDraft {
  open: string;
  close: string;
}

interface DayDraft {
  /** Desligado: os campos saem do envio e o servidor grava o dia como fechado. */
  enabled: boolean;
  /** Uma ou duas faixas (almoço e jantar). */
  ranges: RangeDraft[];
}

/**
 * A faixa sugerida: a de quem liga um dia que nunca teve horário, e a da aba
 * inteira enquanto nada foi gravado.
 */
const SUGGESTED: RangeDraft = { open: '18:00', close: '23:00' };
const EMPTY_RANGE: RangeDraft = { open: '', close: '' };

function hasSavedHours(hours: WeeklyHours): boolean {
  return Object.values(hours).some((ranges) => ranges.length > 0);
}

/**
 * Sugerir 18h–23h? Só para quem ainda está configurando: nunca publicou e não
 * tem faixa gravada. "Nenhuma faixa" sozinho também é a semana que um
 * restaurante no ar fechou de propósito (férias, reforma) — reabrir a aba com
 * os sete dias ligados mostrava algo diferente do gravado, e salvar por outro
 * motivo reabria a semana inteira. Publicado, a aba mostra o que está gravado.
 */
function suggestsHours(business: Business): boolean {
  return !business.published && !hasSavedHours(business.hours);
}

/**
 * O que a aba mostra ao abrir. Com a sugestão, os sete dias aparecem ligados
 * das 18h às 23h — só na tela: o passo do guia continua pendente até o
 * lojista salvar. Antes o cadastro gravava esse horário sozinho e o passo
 * nascia "concluído" com um dado que ninguém viu.
 */
function initialDays(hours: WeeklyHours, suggest: boolean): DayDraft[] {
  return WEEKDAYS.map((_, day) => {
    if (suggest) return { enabled: true, ranges: [{ ...SUGGESTED }] };
    const ranges = (hours[day] ?? []).slice(0, MAX_RANGES_PER_DAY).map((range) => ({ ...range }));
    return ranges.length > 0 ? { enabled: true, ranges } : { enabled: false, ranges: [{ ...EMPTY_RANGE }] };
  });
}

/**
 * A aba Horários. Cada dia tem o interruptor e até duas faixas; o erro de um
 * dia volta do servidor com a chave `hours-{dia}` e aparece na linha dele, com
 * a borda de erro no campo que falta.
 *
 * Os campos são controlados e não emitem o "mexeu" do formulário com o nome do
 * erro (`hours-2-0-open` não é `hours-2`), então cada mudança avisa por
 * `markEdited(hours-{dia})` — é o que apaga o erro daquele dia.
 */
export function HoursSection({
  business,
  error,
  markEdited,
}: {
  business: Business;
  error: (field: string) => string | undefined;
  markEdited: (field?: string) => void;
}) {
  const t = useTranslations('painel.businessForm.hours');
  const uiText = useUiText();
  const [days, setDays] = useState<DayDraft[]>(() => initialDays(business.hours, suggestsHours(business)));
  // Lido do que está gravado, não do estado: some quando o salvar chega.
  const suggested = suggestsHours(business);

  const updateDay = (day: number, change: (current: DayDraft) => DayDraft) => {
    setDays((current) => current.map((entry, index) => (index === day ? change(entry) : entry)));
    markEdited(hoursErrorKey(day));
  };

  /*
   * O interruptor não apaga o que está digitado: quem fecha a segunda por um
   * tempo volta a abrir com o horário de antes. Ligar um dia sem horário
   * nenhum já traz a faixa sugerida para ajustar.
   */
  const toggleDay = (day: number, enabled: boolean) =>
    updateDay(day, (current) => {
      const blank = current.ranges.every((range) => !range.open && !range.close);
      return enabled && blank ? { enabled, ranges: [{ ...SUGGESTED }] } : { ...current, enabled };
    });

  const setRange = (day: number, index: number, patch: Partial<RangeDraft>) =>
    updateDay(day, (current) => ({
      ...current,
      ranges: current.ranges.map((range, position) => (position === index ? { ...range, ...patch } : range)),
    }));

  const addRange = (day: number) =>
    updateDay(day, (current) => ({ ...current, ranges: [...current.ranges, { ...EMPTY_RANGE }] }));

  const removeRange = (day: number, index: number) =>
    updateDay(day, (current) => ({ ...current, ranges: current.ranges.filter((_, position) => position !== index) }));

  return (
    <>
      <p className="text-body2 text-gray-600">{t('intro')}</p>
      {suggested && <Banner tone="info">{t('suggestion')}</Banner>}

      <ul className="space-y-2">
        {days.map((entry, day) => {
          const label = dayName(day, uiText);
          const dayError = error(hoursErrorKey(day));
          const errorId = `${hoursErrorKey(day)}-error`;
          // Com um campo vazio, a borda vai nele; sem nenhum (faixas que se
          // cruzam), em todos os do dia — é o conjunto que precisa mudar.
          const anyEmpty = entry.ranges.some((range) => !range.open || !range.close);
          const invalid = (value: string) => Boolean(dayError) && (!anyEmpty || !value);

          return (
            <li key={WEEKDAYS[day]} className="rounded-sm bg-gray-200 px-4 py-3">
              <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                <div className="flex h-10 items-center gap-3">
                  <Switch
                    checked={entry.enabled}
                    label={t('opensOnDay', { day: label })}
                    onChange={(next) => toggleDay(day, next)}
                  />
                  <span
                    className={cn('w-32 text-body2 font-medium', entry.enabled ? 'text-gray-700' : 'text-gray-600')}
                  >
                    {label}
                  </span>
                </div>

                {/* Escondido, não desmontado: `disabled` tira os campos do envio (o
                    servidor lê o dia como fechado) e o horário digitado fica guardado
                    para quando o dia voltar a abrir. */}
                <div className={cn('flex-col gap-2', entry.enabled ? 'flex' : 'hidden')}>
                  {entry.ranges.map((range, index) => {
                    const second = index > 0;
                    return (
                      <div key={index} className="flex items-center gap-2">
                        {/* A largura mora no contêiner: `fieldClass` já traz `w-full`,
                            e sem tailwind-merge um `w-auto` junto brigaria com ele. */}
                        <div className="w-28">
                          <input
                            type="time"
                            name={hoursFieldName(day, index, 'open')}
                            value={range.open}
                            disabled={!entry.enabled}
                            onChange={(event) => setRange(day, index, { open: event.target.value })}
                            aria-label={t(second ? 'opensAtSecond' : 'opensAt', { day: label })}
                            aria-invalid={invalid(range.open) || undefined}
                            aria-describedby={dayError ? errorId : undefined}
                            className={fieldClass(invalid(range.open), 'h-10')}
                          />
                        </div>
                        <span className="text-body2 text-gray-600">{t('to')}</span>
                        <div className="w-28">
                          <input
                            type="time"
                            name={hoursFieldName(day, index, 'close')}
                            value={range.close}
                            disabled={!entry.enabled}
                            onChange={(event) => setRange(day, index, { close: event.target.value })}
                            aria-label={t(second ? 'closesAtSecond' : 'closesAt', { day: label })}
                            aria-invalid={invalid(range.close) || undefined}
                            aria-describedby={dayError ? errorId : undefined}
                            className={fieldClass(invalid(range.close), 'h-10')}
                          />
                        </div>
                        {second && (
                          <IconButton
                            label={t('removeRange', { day: label })}
                            icon={<Trash2 className="size-4" />}
                            onClick={() => removeRange(day, index)}
                          />
                        )}
                      </div>
                    );
                  })}
                  {entry.ranges.length < MAX_RANGES_PER_DAY && (
                    <AddButton
                      type="button"
                      onClick={() => addRange(day)}
                      aria-label={t('addRangeFor', { day: label })}
                      className="self-start"
                    >
                      {t('addRange')}
                    </AddButton>
                  )}
                </div>

                {!entry.enabled && (
                  <span className="flex h-10 items-center text-body2 text-gray-600">{t('closed')}</span>
                )}
              </div>

              {/* `error-pressed`: o `error` passa dos 4,5:1 só sobre o branco;
                  sobre o cinza do dia fica em 3,9:1 (D20). */}
              {dayError && (
                <p id={errorId} role="alert" className="mt-2 text-caption font-medium text-error-pressed">
                  {dayError}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
