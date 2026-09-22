import { Check, CircleCheck, Plus } from 'lucide-react';
import { Tag } from '@/components/ui/tag';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import type { MenuOptionGroup } from '@/lib/types';

function helperFor(group: MenuOptionGroup): string {
  if (group.type === 'single') return 'Escolha 1 opção';
  if (group.required) return group.max ? `Escolha de 1 a ${group.max}` : 'Escolha pelo menos 1';
  if (!group.max) return 'Escolha quantas quiser';
  return group.max === 1 ? 'Escolha até 1 opção' : `Escolha até ${group.max} opções`;
}

/**
 * Um grupo de complementos como no app do iFood: cabeçalho numa faixa cinza
 * que gruda no topo enquanto o grupo rola, o selo OBRIGATÓRIO até a escolha
 * ser feita (e um check verde depois), e o controle no canto DIREITO da linha
 * — "+" para múltipla escolha, rádio para escolha única. A linha inteira é o
 * rótulo do input, que fica escondido mas continua acessível.
 */
export function OptionGroup({
  group,
  itemId,
  selected,
  onSelectSingle,
  onToggleMulti,
}: {
  group: MenuOptionGroup;
  itemId: string;
  selected: string | string[] | undefined;
  onSelectSingle: (choiceId: string) => void;
  onToggleMulti: (choiceId: string) => void;
}) {
  const isMulti = group.type === 'multi';
  const chosen = Array.isArray(selected) ? selected : [];
  const satisfied = isMulti ? chosen.length > 0 : typeof selected === 'string' && selected !== '';
  const limitReached = isMulti && group.max !== null && chosen.length >= group.max;
  const headingId = `grupo-${group.id}`;

  return (
    <section role="group" aria-labelledby={headingId}>
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
          <CircleCheck aria-hidden="true" className="size-6 shrink-0 text-positive" />
        ) : null}
        <span className="sr-only" aria-live="polite">
          {satisfied ? 'Escolha feita' : group.required ? 'Obrigatório' : ''}
        </span>
      </div>

      <div>
        {group.choices.map((choice) => {
          const checked = isMulti ? chosen.includes(choice.id) : selected === choice.id;
          const disabled = isMulti && limitReached && !checked;
          return (
            <label
              key={choice.id}
              className={cn(
                'press flex min-h-14 items-center gap-3 border-b border-gray-200 px-4 py-3 last:border-b-0 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-primary',
                disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer active:bg-gray-50',
              )}
            >
              <input
                type={isMulti ? 'checkbox' : 'radio'}
                name={`${itemId}-${group.id}`}
                value={choice.id}
                checked={checked}
                disabled={disabled}
                onChange={() => (isMulti ? onToggleMulti(choice.id) : onSelectSingle(choice.id))}
                className="sr-only"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-body2 font-medium text-gray-700">{choice.name}</span>
                {choice.price > 0 && (
                  <span className="mt-0.5 block text-caption text-gray-600">+ {formatPrice(choice.price)}</span>
                )}
              </span>

              {isMulti ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-full transition-colors duration-150 ease-standard',
                    checked ? 'bg-primary text-white' : 'text-primary',
                  )}
                >
                  {checked ? <Check className="size-5" /> : <Plus className="size-6" />}
                </span>
              ) : (
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-[22px] shrink-0 place-items-center rounded-full border-2 transition-colors duration-150 ease-standard',
                    checked ? 'border-primary' : 'border-gray-300',
                  )}
                >
                  {checked && <span className="size-3 rounded-full bg-primary" />}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </section>
  );
}
