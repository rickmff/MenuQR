import { CircleCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CheckboxRow, RadioRow, StepperRow } from '@/components/store/option-row';
import type { Translate } from '@/lib/i18n';
import type { MenuOptionGroup } from '@/lib/types';

/** `t` é o tradutor de `store.optionGroup`. */
function helperFor(group: MenuOptionGroup, count: number, t: Translate): string {
  if (group.type !== 'single' && group.max !== null && count >= group.max) {
    return t('maxReached', { max: group.max });
  }
  if (group.type === 'single') return t('chooseOne');
  if (group.required) return group.max ? t('chooseRange', { max: group.max }) : t('chooseAtLeastOne');
  if (!group.max) return t('chooseAny');
  return t('chooseUpTo', { max: group.max });
}

/** Id da seção do grupo: é para onde a página rola quando falta uma escolha obrigatória. */
export function optionGroupId(groupId: string): string {
  return `grupo-${groupId}`;
}

/**
 * Um grupo de complementos como nos apps de delivery: título grande solto
 * (sem faixa), a regra da escolha logo abaixo e, à direita, o selo
 * "Obrigatório" até a escolha ser feita — um check verde depois. As linhas vêm
 * sem divisor, com o controle no canto DIREITO: rádio na escolha única; "+"
 * que vira "− n +" nos adicionais; caixa de marcar nos ingredientes que dá
 * para tirar.
 *
 * Rádio e caixa ficam dentro de um <label> que cobre a linha, com o input
 * escondido mas acessível.
 */
export function OptionGroup({
  group,
  itemId,
  selected,
  onSelectSingle,
  onAdjust,
}: {
  group: MenuOptionGroup;
  itemId: string;
  selected: string | string[] | undefined;
  onSelectSingle: (choiceId: string) => void;
  /** +1 acrescenta uma unidade da opção (ou marca); −1 tira uma (ou desmarca). */
  onAdjust: (choiceId: string, delta: 1 | -1) => void;
}) {
  const t = useTranslations('store.optionGroup');
  const isSingle = group.type === 'single';
  const chosen = Array.isArray(selected) ? selected : [];
  const satisfied = isSingle ? typeof selected === 'string' && selected !== '' : chosen.length > 0;
  const limitReached = !isSingle && group.max !== null && chosen.length >= group.max;
  const headingId = `${optionGroupId(group.id)}-titulo`;
  const name = `${itemId}-${group.id}`;

  return (
    <section
      id={optionGroupId(group.id)}
      role="group"
      aria-labelledby={headingId}
      // O "‹" flutua no canto: ao rolar até o grupo que falta, o título para abaixo dele.
      className="scroll-mt-[calc(var(--safe-top)+4.5rem)] px-4 pt-8 lg:scroll-mt-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={headingId} className="font-display text-h5 font-bold text-gray-900">
            {group.name}
          </h2>
          <p className="mt-1 text-body2 text-gray-600">{helperFor(group, chosen.length, t)}</p>
        </div>
        {group.required && !satisfied ? (
          <span className="mt-1 shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-caption font-semibold text-gray-700">
            {t('required')}
          </span>
        ) : satisfied ? (
          <CircleCheck aria-hidden="true" className="mt-1 size-6 shrink-0 animate-badge-pop text-positive" />
        ) : null}
        <span className="sr-only" aria-live="polite">
          {satisfied ? t('satisfied') : group.required ? t('required') : ''}
        </span>
      </div>

      <div className="mt-2">
        {group.choices.map((choice) => {
          if (isSingle) {
            return (
              <RadioRow
                key={choice.id}
                choice={choice}
                name={name}
                checked={selected === choice.id}
                onSelect={() => onSelectSingle(choice.id)}
              />
            );
          }
          if (group.type === 'remove') {
            const checked = chosen.includes(choice.id);
            return (
              <CheckboxRow
                key={choice.id}
                choice={choice}
                name={name}
                checked={checked}
                disabled={limitReached && !checked}
                onToggle={() => onAdjust(choice.id, checked ? -1 : 1)}
              />
            );
          }
          const count = chosen.filter((id) => id === choice.id).length;
          return (
            <StepperRow
              key={choice.id}
              choice={choice}
              count={count}
              blocked={count === 0 && limitReached}
              atLimit={limitReached}
              onAdjust={(delta) => onAdjust(choice.id, delta)}
            />
          );
        })}
      </div>
    </section>
  );
}
