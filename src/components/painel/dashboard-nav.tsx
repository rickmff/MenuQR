'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Container } from '@/components/ui/container';

const navigation = [
  { href: '/painel', label: 'Compartilhar' },
  { href: '/painel/cardapio', label: 'Cardápio' },
  { href: '/painel/negocio', label: 'Dados do negócio' },
  { href: '/painel/conta', label: 'Conta' },
];

/** Abas do painel com destaque para a seção aberta. */
export function DashboardNav() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  // Com quatro abas a lista passa da largura do celular: sem isto, quem abre
  // "Conta" vê as três primeiras e nenhuma marcada.
  useEffect(() => {
    navRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [pathname]);

  return (
    <nav ref={navRef} aria-label="Seções do painel" className="border-t border-gray-200">
      <Container as="ul" className="scrollbar-none flex gap-1 overflow-x-auto">
        {navigation.map((entry) => {
          const active =
            entry.href === '/painel' ? pathname === entry.href : pathname.startsWith(entry.href);
          return (
            <li key={entry.href}>
              <Link
                href={entry.href}
                aria-current={active ? 'page' : undefined}
                className={`press inline-block whitespace-nowrap border-b-2 px-4 py-3 text-body2 font-semibold transition-colors duration-150 ease-standard ${
                  active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 hover:text-gray-700'
                }`}
              >
                {entry.label}
              </Link>
            </li>
          );
        })}
      </Container>
    </nav>
  );
}
