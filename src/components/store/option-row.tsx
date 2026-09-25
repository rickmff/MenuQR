'use client';

import { Check, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Stepper } from '@/components/ui/stepper';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import type { MenuChoice } from '@/lib/types';

/** Linha de opção: nome e preço à esquerda, o controle de 24px à direita, sem divisor. */
const ROW = '-mx-4 flex min-h-14 items-center gap-4 px-4 py-4';
/** Linha que é um <label> de input escondido: o contorno de foco vai para a linha inteira. */
const LABEL_ROW = `${ROW} press has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-primary`;

function ChoiceText({ choice, showPrice = true }: { choice: MenuChoice; showPrice?: boolean }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block text-body1 text-gray-700">{choice.name}</span>
      {showPrice && choice.price > 0 && (
        <span className="mt-0.5 block text-body2 tabular-nums text-gray-600">+ {formatPrice(choice.price)}</span>
      )}
    </span>
  );
}

/** Escolha única: rádio desenhado de 24px; marcado, o círculo enche de verde com o ponto branco. */
export function RadioRow({
  choice,
  name,
  checked,
  onSelect,
}: {
  choice: MenuChoice;
  name: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <label className={cn(LABEL_ROW, 'cursor-pointer active:bg-gray-50 lg:hover:bg-gray-50')}>
      <input type="radio" name={name} value={choice.id} checked={checked} onChange={onSelect} className="sr-only" />
      <ChoiceText choice={choice} />
      <span
        aria-hidden="true"
        className={cn(
          'grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors duration-150 ease-standard',
          checked ? 'border-primary bg-primary' : 'border-gray-400 bg-white',
        )}
      >
        {checked && <span className="size-2.5 animate-check-in rounded-full bg-white" />}
      </span>
    </label>
  );
}

/** Tirar ingrediente: caixa de marcar de 24px, cantos 6. Chegando ao máximo, as outras apagam. */
export function CheckboxRow({
  choice,
  name,
  checked,
  disabled,
  onToggle,
}: {
  choice: MenuChoice;
  name: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={cn(
        LABEL_ROW,
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer active:bg-gray-50 lg:hover:bg-gray-50',
      )}
    >
      <input
        type="checkbox"
        name={name}
        value={choice.id}
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
        className="sr-only"
      />
      <ChoiceText choice={choice} showPrice={false} />
      <span
        aria-hidden="true"
        className={cn(
          'grid size-6 shrink-0 place-items-center rounded-[6px] border-2 transition-colors duration-150 ease-standard',
          checked ? 'border-primary bg-primary text-white' : 'border-gray-400 bg-white',
        )}
      >
        {checked && <Check className="size-4 animate-check-in" strokeWidth={3} />}
      </span>
    </label>
  );
}

/**
 * Adicional com quantidade: um "+" num círculo cinza que vira a pílula "− n +"
 * com a primeira unidade. A linha inteira também acrescenta uma unidade (antes
 * só o "+" reagia), e com o grupo no máximo as que estão em zero apagam.
 */
export function StepperRow({
  choice,
  count,
  blocked,
  atLimit,
  onAdjust,
}: {
  choice: MenuChoice;
  count: number;
  /** Grupo no máximo e esta opção em zero: nada a fazer aqui. */
  blocked: boolean;
  /** Grupo no máximo: o "+" desta opção fecha. */
  atLimit: boolean;
  onAdjust: (delta: 1 | -1) => void;
}) {
  const t = useTranslations('store.optionGroup');
  return (
    <div className={cn(ROW, 'relative', blocked && 'opacity-40')}>
      {/* A linha acrescenta uma unidade; o controle da direita fica por cima dela. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        disabled={blocked || atLimit}
        onClick={() => onAdjust(1)}
        className="absolute inset-0 cursor-pointer active:bg-gray-50 disabled:cursor-default lg:hover:bg-gray-50 disabled:lg:hover:bg-transparent"
      />
      <span className="pointer-events-none relative min-w-0 flex-1">
        <ChoiceText choice={choice} />
      </span>
      <div className="relative flex shrink-0 items-center justify-end">
        {count === 0 ? (
          <button
            type="button"
            disabled={blocked}
            onClick={() => onAdjust(1)}
            aria-label={t('addChoice', { name: choice.name })}
            className="press hit-44 relative grid size-8 cursor-pointer place-items-center rounded-full bg-gray-100 text-gray-900 active:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            <Plus aria-hidden="true" className="size-5" />
          </button>
        ) : (
          <Stepper
            variant="soft"
            size="sm"
            value={count}
            min={0}
            // O "+" da opção fecha quando o grupo chega ao máximo.
            max={atLimit ? count : 99}
            onChange={(next) => onAdjust(next > count ? 1 : -1)}
            label={choice.name}
            className="animate-pill-reveal"
          />
        )}
      </div>
    </div>
  );
}
