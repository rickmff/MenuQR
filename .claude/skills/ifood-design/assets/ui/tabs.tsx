'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef } from 'react';
import { cn } from '@/lib/cn';

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
  className?: string;
}

/**
 * Tabs do iFood: só texto, rolagem horizontal sem barra, ativa em vermelho com
 * um traço de 2px que DESLIZA até ela, e a ativa sempre centralizada.
 *
 * O indicador é posicionado direto no DOM (sem estado) para não re-renderizar a
 * lista a cada troca e para não chamar setState dentro de efeito.
 */
export function Tabs({ items, activeId, onSelect, label, className }: TabsProps) {
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
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      list.scrollTo({
        left: active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2,
        behavior: reduce ? 'auto' : 'smooth',
      });
    };

    place(true);
    const observer = new ResizeObserver(() => place(false));
    observer.observe(list);
    return () => observer.disconnect();
  }, [activeId, items]);

  const tabClass = (active: boolean) =>
    cn(
      'press block whitespace-nowrap px-4 py-3.5 text-body2 font-semibold',
      active ? 'text-primary' : 'text-gray-600 hover:text-gray-700',
    );

  return (
    <nav aria-label={label} className={cn('border-b border-gray-200 bg-white', className)}>
      <ul ref={listRef} className="scrollbar-none relative flex overflow-x-auto">
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
                  onClick={() => onSelect?.(item.id)}
                  className={tabClass(active)}
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
          className="pointer-events-none absolute bottom-0 left-0 h-0.5 bg-primary opacity-0 transition-[transform,width] duration-200 ease-standard"
        />
      </ul>
    </nav>
  );
}
