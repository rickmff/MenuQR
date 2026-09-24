'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import { scrollBehavior } from '@/lib/reduced-motion';

export interface TabItem {
  id: string;
  label: string;
  /** Com href a tab é um link (abas do painel); sem href é um botão (categorias). */
  href?: string;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onSelect?: (id: string) => void;
  /** Nome da navegação para leitores de tela. */
  label: string;
  /**
   * primary: ativa em verde com traço de 2px (painel) · ink: ativa em grafite
   * com traço de 3px — as abas de categoria dos apps de delivery.
   */
  tone?: 'primary' | 'ink';
  /** md: rótulo de 14 · lg: rótulo de 16 e alvo de 44px (cardápio). */
  size?: 'md' | 'lg';
  className?: string;
  /** Classes da lista (recuo lateral para alinhar a primeira aba à margem). */
  listClassName?: string;
}

const TAB_SIZES = {
  md: 'px-4 py-3.5 text-body2',
  lg: 'min-h-11 px-3 py-3 text-body1',
} as const;

const TONES = {
  primary: { active: 'text-primary', indicator: 'h-0.5 bg-primary' },
  ink: { active: 'text-gray-900', indicator: 'h-[3px] rounded-full bg-gray-900' },
} as const;

/**
 * Tabs: só texto, rolagem horizontal sem barra, traço que DESLIZA até a ativa,
 * e a ativa sempre centralizada.
 *
 * O indicador é posicionado direto no DOM (sem estado) para não re-renderizar a
 * lista a cada troca e para não chamar setState dentro de efeito.
 *
 * Teclado: a lista é uma parada só de Tab (roving tabindex); ←/→ e Home/End
 * escolhem a aba vizinha, a primeira ou a última.
 */
export function Tabs({
  items,
  activeId,
  onSelect,
  label,
  tone = 'primary',
  size = 'md',
  className,
  listClassName,
}: TabsProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const indicatorRef = useRef<HTMLLIElement>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    const indicator = indicatorRef.current;
    if (!list || !indicator) return;

    const place = (center: boolean) => {
      const active = list.querySelector<HTMLElement>(`[data-tab="${CSS.escape(activeId)}"]`);
      if (!active) {
        indicator.style.opacity = '0';
        return;
      }
      indicator.style.opacity = '1';
      indicator.style.width = `${active.offsetWidth}px`;
      indicator.style.transform = `translateX(${active.offsetLeft}px)`;
      if (!center) return;
      // Rola só a lista (nunca a página) até a tab ativa ficar no meio.
      list.scrollTo({
        left: active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2,
        behavior: scrollBehavior(),
      });
    };

    place(true);
    const observer = new ResizeObserver(() => place(false));
    observer.observe(list);
    return () => observer.disconnect();
  }, [activeId, items]);

  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (!onSelect) return;
    const index = items.findIndex((item) => item.id === activeId);
    const target =
      event.key === 'ArrowRight'
        ? Math.min(items.length - 1, index + 1)
        : event.key === 'ArrowLeft'
          ? Math.max(0, index - 1)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? items.length - 1
              : -1;
    const next = items[target];
    if (target < 0 || !next) return;
    event.preventDefault();
    onSelect(next.id);
    listRef.current
      ?.querySelector<HTMLElement>(`[data-tab="${CSS.escape(next.id)}"] > *`)
      ?.focus({ preventScroll: true });
  };

  const tabClass = (active: boolean) =>
    cn(
      'press block whitespace-nowrap font-semibold',
      TAB_SIZES[size],
      active ? TONES[tone].active : 'text-gray-600 hover:text-gray-700',
    );

  return (
    <nav aria-label={label} className={cn('border-b border-gray-200 bg-white', className)}>
      <ul
        ref={listRef}
        onKeyDown={handleKeyDown}
        className={cn('scrollbar-none relative flex overflow-x-auto', listClassName)}
      >
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id} data-tab={item.id} className="shrink-0">
              {item.href !== undefined ? (
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={tabClass(active)}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  type="button"
                  aria-current={active ? 'true' : undefined}
                  tabIndex={active ? 0 : -1}
                  onClick={() => onSelect?.(item.id)}
                  className={cn(tabClass(active), 'cursor-pointer')}
                >
                  {item.label}
                </button>
              )}
            </li>
          );
        })}
        <li
          ref={indicatorRef}
          aria-hidden="true"
          role="presentation"
          className={cn(
            'pointer-events-none absolute bottom-0 left-0 opacity-0 transition-[transform,width] duration-200 ease-standard',
            TONES[tone].indicator,
          )}
        />
      </ul>
    </nav>
  );
}
