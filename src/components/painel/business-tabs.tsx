'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BUSINESS_SECTIONS } from '@/components/painel/business-sections';
import { cn } from '@/lib/cn';

const SECTIONS = Object.values(BUSINESS_SECTIONS);

/**
 * As abas de "Dados do negócio". Cada uma é uma tela com um assunto só, e cada
 * uma salva sozinha: o lojista muda a taxa de um bairro sem passar por logo,
 * horário e formas de pagamento.
 */
export function BusinessTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Seções do negócio" className="border-b border-gray-200">
      <ul className="scrollbar-none flex gap-1 overflow-x-auto">
        {SECTIONS.map((section) => {
          const active = pathname === section.href;
          return (
            <li key={section.href}>
              <Link
                href={section.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'press inline-block whitespace-nowrap border-b-2 px-4 py-3 text-body2 font-semibold transition-colors duration-150 ease-standard',
                  active ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-700',
                )}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
