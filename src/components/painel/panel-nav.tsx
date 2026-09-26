"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { useScrollFade } from "@/components/painel/use-scroll-fade";
import { Container } from "@/components/ui/container";

export interface PanelNavEntry {
  href: string;
  label: string;
  /** Rótulo abaixo de `sm`, onde as abas não cabem inteiras. */
  short?: string;
  /** Começo das rotas que acendem a aba, quando não é o próprio `href`. */
  match?: string;
  /** Acende só no próprio `href` — a raiz da área, que é o começo de todas as outras. */
  exact?: boolean;
  icon: LucideIcon;
}

/**
 * As abas de uma área do painel, com destaque para a seção aberta. Um desenho
 * só para o painel do lojista (`DashboardNav`) e o do super admin (`AdminNav`):
 * quem chama decide as abas, aqui mora a aparência.
 */
export function PanelNav({
  label,
  entries,
}: {
  label: string;
  entries: PanelNavEntry[];
}) {
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);

  // Com quatro abas a lista passa da largura do celular: rola até a ativa (sem
  // isto, quem abre "Conta" via as três primeiras e nenhuma marcada) e marca
  // com um degradê a borda onde há mais abas.
  useScrollFade(listRef, pathname);

  return (
    <nav aria-label={label} className="border-t border-gray-200">
      <Container>
        {/* Mesma coluna do conteúdo. O `-ml-4` cancela o `px-4` da primeira
            aba, para o rótulo dela começar na mesma vertical do logo e do
            título da tela — em qualquer largura, porque o que sai aqui volta
            no respiro do próprio link. */}
        <ul
          ref={listRef}
          className="scrollbar-none scroll-fade-x -ml-4 flex max-w-panel gap-1 overflow-x-auto"
        >
          {entries.map((entry) => {
            const active = entry.exact
              ? pathname === entry.href
              : pathname.startsWith(entry.match ?? entry.href);
            const Icon = entry.icon;
            return (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  aria-current={active ? "page" : undefined}
                  className={`press inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-body2 font-semibold transition-colors duration-150 ease-standard ${
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-600 hover:text-gray-700"
                  }`}
                >
                  {/* `aria-hidden`: o rótulo ao lado já diz o que a aba é. */}
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  {entry.short ? (
                    <>
                      <span className="sm:hidden">{entry.short}</span>
                      <span className="max-sm:hidden">{entry.label}</span>
                    </>
                  ) : (
                    entry.label
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
