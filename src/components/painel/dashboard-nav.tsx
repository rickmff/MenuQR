'use client';

import { Share2, Store, User, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';
import { BUSINESS_SECTIONS, ONBOARDING_ORDER } from '@/components/painel/business-sections';
import { useScrollFade } from '@/components/painel/use-scroll-fade';
import { Container } from '@/components/ui/container';

type NavLabel = 'share' | 'menu' | 'business' | 'account';

/**
 * `label` é a chave em `painel.nav`; `short`, o rótulo abaixo de `sm`, onde as
 * quatro abas não cabem inteiras. `match` é o começo das rotas que acendem a
 * aba, quando não é o próprio `href`.
 */
const navigation: {
  href: string;
  label: NavLabel;
  short?: 'businessShort';
  match?: string;
  icon: LucideIcon;
}[] = [
  { href: '/painel', label: 'share', icon: Share2 },
  { href: '/painel/cardapio', label: 'menu', icon: UtensilsCrossed },
  {
    // Direto na primeira aba ("Endereço e entrega"), a mesma em que o guia
    // começa o negócio — e não em `/painel/negocio`, que é a Identidade.
    href: BUSINESS_SECTIONS[ONBOARDING_ORDER[0] ?? 'entrega'].href,
    label: 'business',
    short: 'businessShort',
    match: '/painel/negocio',
    icon: Store,
  },
  { href: '/painel/conta', label: 'account', icon: User },
];

/** Abas do painel com destaque para a seção aberta. */
export function DashboardNav() {
  const pathname = usePathname();
  const t = useTranslations('painel.nav');
  const listRef = useRef<HTMLUListElement>(null);

  // Com quatro abas a lista passa da largura do celular: rola até a ativa (sem
  // isto, quem abre "Conta" via as três primeiras e nenhuma marcada) e marca
  // com um degradê a borda onde há mais abas.
  useScrollFade(listRef, pathname);

  return (
    <nav aria-label={t('label')} className="border-t border-gray-200">
      <Container>
        {/* Mesma coluna do conteúdo. O `-ml-4` cancela o `px-4` da primeira
            aba, para o rótulo dela começar na mesma vertical do logo e do
            título da tela — em qualquer largura, porque o que sai aqui volta
            no respiro do próprio link. */}
        <ul ref={listRef} className="scrollbar-none scroll-fade-x -ml-4 flex max-w-panel gap-1 overflow-x-auto">
          {navigation.map((entry) => {
            const active =
              entry.href === '/painel'
                ? pathname === entry.href
                : pathname.startsWith(entry.match ?? entry.href);
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
                  {entry.short ? (
                    <>
                      <span className="sm:hidden">{t(entry.short)}</span>
                      <span className="max-sm:hidden">{t(entry.label)}</span>
                    </>
                  ) : (
                    t(entry.label)
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </nav>
  );
}
