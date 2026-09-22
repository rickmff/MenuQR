import { Check, CircleCheck, Plus } from 'lucide-react';
import { Stepper } from '@/components/ui/stepper';
import { Tag } from '@/components/ui/tag';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import type { MenuChoice, MenuOptionGroup } from '@/lib/types';

function helperFor(group: MenuOptionGroup): string {
  if (group.type === 'single') return 'Escolha 1 opção';
  if (group.required) return group.max ? `Escolha de 1 a ${group.max}` : 'Escolha pelo menos 1';
  if (!group.max) return 'Escolha quantas quiser';
  return group.max === 1 ? 'Escolha até 1 opção' : `Escolha até ${group.max} opções`;
}

/** Id da seção do grupo: é para onde a página rola quando falta uma escolha obrigatória. */
export function optionGroupId(groupId: string): string {
  return `grupo-${groupId}`;
}

const ROW = 'flex min-h-14 items-center gap-3 border-b border-gray-200 px-4 py-3 last:border-b-0';
/** Linha que é um <label> de input escondido: o contorno de foco vai para a linha inteira. */
const LABEL_ROW = `${ROW} has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-primary`;

function ChoiceText({ choice, showPrice = true }: { choice: MenuChoice; showPrice?: boolean }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block text-body2 font-medium text-gray-700">{choice.name}</span>
      {showPrice && choice.price > 0 && (
        <span className="mt-0.5 block text-caption text-gray-600">+ {formatPrice(choice.price)}</span>
      )}
    </span>
  );
}

/**
 * Um grupo de complementos como na página de item do iFood: cabeçalho numa
 * faixa cinza que gruda no topo enquanto o grupo rola, o selo OBRIGATÓRIO até
 * a escolha ser feita (e um check verde depois), e o controle no canto DIREITO
 * da linha — rádio na escolha única; "+" que vira um stepper "− 1 +" nos
 * adicionais (quantidade por opção, até o máximo do grupo); caixa de marcar
 * nos ingredientes que dá para tirar.
 *
 * Rádio e caixa ficam dentro de um <label> que cobre a linha, com o input
 * escondido mas acessível. Os adicionais são botões com o nome da opção no
 * rótulo, porque uma linha tem dois controles.
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
  const isSingle = group.type === 'single';
  const chosen = Array.isArray(selected) ? selected : [];
  const satisfied = isSingle ? typeof selected === 'string' && selected !== '' : chosen.length > 0;
  const limitReached = !isSingle && group.max !== null && chosen.length >= group.max;
  const headingId = `${optionGroupId(group.id)}-titulo`;

  return (
    <section
      id={optionGroupId(group.id)}
      role="group"
      aria-labelledby={headingId}
      className="scroll-mt-(--app-bar-height) lg:scroll-mt-0"
    >
      <div className="sticky top-(--app-bar-height) z-30 flex items-center justify-between gap-3 bg-gray-50 px-4 py-3 lg:top-0">
        <div className="min-w-0">
          <h2 id={headingId} className="text-body1 font-semibold text-gray-700">
            {group.name}
          </h2>
          <p className="text-caption text-gray-600">{helperFor(group)}</p>
        </div>
        {group.required && !satisfied ? (
          <Tag tone="dark">Obrigatório</Tag>
        ) : satisfied ? (
          <CircleCheck aria-hidden="true" className="size-6 shrink-0 animate-badge-pop text-positive" />
        ) : null}
        <span className="sr-only" aria-live="polite">
          {satisfied ? 'Escolha feita' : group.required ? 'Obrigatório' : ''}
        </span>
      </div>

      <div>
        {group.choices.map((choice) => {
          if (isSingle) {
            const checked = selected === choice.id;
            return (
              <label key={choice.id} className={cn(LABEL_ROW, 'cursor-pointer active:bg-gray-50')}>
                <input
                  type="radio"
                  name={`${itemId}-${group.id}`}
                  value={choice.id}
                  checked={checked}
                  onChange={() => onSelectSingle(choice.id)}
                  className="sr-only"
                />
                <ChoiceText choice={choice} />
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-[22px] shrink-0 place-items-center rounded-full border-2 transition-colors duration-150 ease-standard',
                    checked ? 'border-primary' : 'border-gray-300',
                  )}
                >
                  {checked && <span className="size-3 animate-fade-in rounded-full bg-primary" />}
                </span>
              </label>
            );
          }

          if (group.type === 'remove') {
            const checked = chosen.includes(choice.id);
            const disabled = limitReached && !checked;
            return (
              <label
                key={choice.id}
                className={cn(
                  LABEL_ROW,
                  disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer active:bg-gray-50',
                )}
              >
                <input
                  type="checkbox"
                  name={`${itemId}-${group.id}`}
                  value={choice.id}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onAdjust(choice.id, checked ? -1 : 1)}
                  className="sr-only"
                />
                <ChoiceText choice={choice} showPrice={false} />
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-[22px] shrink-0 place-items-center rounded-xs border-2 transition-colors duration-150 ease-standard',
                    checked ? 'border-primary bg-primary text-white' : 'border-gray-300',
                  )}
                >
                  {checked && <Check className="size-4 animate-fade-in" strokeWidth={3} />}
                </span>
              </label>
            );
          }

          // Adicional: "+" solto; com uma unidade ou mais, o stepper toma o lugar.
          const count = chosen.filter((id) => id === choice.id).length;
          const blocked = count === 0 && limitReached;
          return (
            <div key={choice.id} className={cn(ROW, blocked && 'opacity-40')}>
              <ChoiceText choice={choice} />
              <div className="flex shrink-0 items-center justify-end">
                {count === 0 ? (
                  <button
                    type="button"
                    disabled={blocked}
                    onClick={() => onAdjust(choice.id, 1)}
                    aria-label={`Adicionar ${choice.name}`}
                    className="press -mr-2.5 grid size-11 place-items-center rounded-full text-primary active:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
                  >
                    <Plus aria-hidden="true" className="size-6" />
                  </button>
                ) : (
                  <Stepper
                    variant="plain"
                    size="sm"
                    value={count}
                    min={0}
                    // O "+" da opção fecha quando o grupo chega ao máximo.
                    max={limitReached ? count : 99}
                    onChange={(next) => onAdjust(choice.id, next > count ? 1 : -1)}
                    label={choice.name}
                    className="-mr-2 animate-fade-in"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
