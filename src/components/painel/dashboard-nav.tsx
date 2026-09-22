'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

const navigation = [
  { href: '/painel', label: 'Compartilhar' },
  { href: '/painel/cardapio', label: 'Cardápio' },
  { href: '/painel/negocio', label: 'Dados do negócio' },
  { href: '/painel/conta', label: 'Conta' },
];

/** Abas do painel com destaque para a seção aberta. */
export function DashboardNav() {
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);

  // Com quatro abas a lista passa da largura do celular: sem isto, quem abre
  // "Conta" vê as três primeiras e nenhuma marcada.
  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [pathname]);

  return (
    <nav aria-label="Seções do painel" className="border-t border-ink-200">
      <ul ref={listRef} className="container-page flex gap-1 overflow-x-auto">
        {navigation.map((entry) => {
          const active =
            entry.href === '/painel' ? pathname === entry.href : pathname.startsWith(entry.href);
          return (
            <li key={entry.href}>
              <Link
                href={entry.href}
                aria-current={active ? 'page' : undefined}
                className={`inline-block whitespace-nowrap border-b-2 px-4 py-3.5 text-body2 font-medium transition-colors ${
                  active
                    ? 'border-flame-500 text-ink-950'
                    : 'border-transparent text-ink-500 hover:text-ink-950'
                }`}
              >
                {entry.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
