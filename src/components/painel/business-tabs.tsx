'use client';

import { Clock, MapPin, MessageCircle, Palette, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';
import {
  BUSINESS_SECTIONS,
  ONBOARDING_ORDER,
  type BusinessSection,
} from '@/components/painel/business-sections';
import { useScrollFade } from '@/components/painel/use-scroll-fade';
import { cn } from '@/lib/cn';

/**
 * O ícone de cada aba. Mora aqui, e não em `business-sections.ts`: aquele
 * módulo é importado pela server action, e `lucide-react` não entra no
 * servidor por causa de um rótulo.
 */
const SECTION_ICONS: Record<BusinessSection, LucideIcon> = {
  /* `Palette` e não `Store`: a loja virou o ícone de "Dados do negócio" no
     menu de cima, e repetir o mesmo desenho dois níveis seguidos não diz nada. */
  identidade: Palette,
  contato: MessageCircle,
  horarios: Clock,
  entrega: MapPin,
};

/**
 * As abas de "Dados do negócio". Cada uma é uma tela com um assunto só, e cada
 * uma salva sozinha: o lojista muda a taxa de um bairro sem passar por logo,
 * contato e horário.
 *
 * A ordem vem de `ONBOARDING_ORDER` — a mesma lista que o checklist percorre,
 * e a única em que a ordem está escrita à mão.
 */
export function BusinessTabs() {
  const pathname = usePathname();
  const t = useTranslations('painel');
  const listRef = useRef<HTMLUListElement>(null);

  // No celular as quatro abas passam da largura da tela: a lista rola até a
  // aberta (antes, quem chegava em "Endereço e entrega" via três abas cinzas e
  // nenhuma marcada) e o degradê na borda diz que há mais abas.
  useScrollFade(listRef, pathname);

  return (
    <nav aria-label={t('business.tabsLabel')} className="border-b border-gray-200">
      <ul ref={listRef} className="scrollbar-none scroll-fade-x flex gap-1 overflow-x-auto">
        {ONBOARDING_ORDER.map((key) => {
          const section = BUSINESS_SECTIONS[key];
          const Icon = SECTION_ICONS[key];
          const active = pathname === section.href;
          return (
            <li key={section.href}>
              <Link
                href={section.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'press inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-body2 font-semibold transition-colors duration-150 ease-standard',
                  active ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-700',
                )}
              >
                {/* `aria-hidden`: o rótulo ao lado já diz o que a aba é. */}
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                {t(`sections.${key}.label`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
