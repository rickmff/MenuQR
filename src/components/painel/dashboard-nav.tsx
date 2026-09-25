'use client';

import { Share2, Store, User, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Container } from '@/components/ui/container';

/** `label` é a chave em `painel.nav`. */
const navigation: { href: string; label: 'share' | 'menu' | 'business' | 'account'; icon: LucideIcon }[] = [
  { href: '/painel', label: 'share', icon: Share2 },
  { href: '/painel/cardapio', label: 'menu', icon: UtensilsCrossed },
  { href: '/painel/negocio', label: 'business', icon: Store },
  { href: '/painel/conta', label: 'account', icon: User },
];

/** Abas do painel com destaque para a seção aberta. */
export function DashboardNav() {
  const pathname = usePathname();
  const t = useTranslations('painel.nav');
  const navRef = useRef<HTMLElement>(null);

  // Com quatro abas a lista passa da largura do celular: sem isto, quem abre
  // "Conta" vê as três primeiras e nenhuma marcada.
  useEffect(() => {
    navRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [pathname]);

  return (
    <nav ref={navRef} aria-label={t('label')} className="border-t border-gray-200">
      <Container>
        {/* Mesma coluna do conteúdo. O `-ml-4` cancela o `px-4` da primeira
            aba, para o rótulo dela começar na mesma vertical do logo e do
            título da tela — em qualquer largura, porque o que sai aqui volta
            no respiro do próprio link. */}
        <ul className="scrollbar-none -ml-4 flex max-w-panel gap-1 overflow-x-auto">
          {navigation.map((entry) => {
            const active =
              entry.href === '/painel' ? pathname === entry.href : pathname.startsWith(entry.href);
            const Icon = entry.icon;
            return (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  aria-current={active ? 'page' : undefined}
                  className={`press inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-body2 font-semibold transition-colors duration-150 ease-standard ${
                    active
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-600 hover:text-gray-700'
                  }`}
                >
                  {/* `aria-hidden`: o rótulo ao lado já diz o que a aba é. */}
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  {t(entry.label)}
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </nav>
  );
}
