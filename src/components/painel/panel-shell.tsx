import Link from 'next/link';
import type { ReactNode } from 'react';
import { DashboardNav } from '@/components/painel/dashboard-nav';
import { PANEL_GUTTER } from '@/components/painel/panel-page';
import { Logo } from '@/components/platform/logo';
import { Container } from '@/components/ui/container';
import { platform } from '@/lib/platform';

/**
 * A casca do painel: barra do topo, abas e a coluna de conteúdo.
 *
 * Um componente só para o painel com banco e para o modo demonstração — eles
 * só diferem no que fica à direita da barra (o `UserButton` do Clerk lá, o
 * e-mail e o "Sair" aqui). Enquanto eram dois arquivos, cada um tinha o seu
 * respiro: `py-12` de um lado, `py-8` do outro.
 */
export function PanelShell({
  actions,
  nav = true,
  floating,
  children,
}: {
  /** Botões à direita da barra do topo. */
  actions: ReactNode;
  /** As abas só aparecem depois que o restaurante existe. */
  nav?: boolean;
  /** Camada que flutua sobre o painel inteiro — hoje, o guia de configuração. */
  floating?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl">
        <Container className="flex h-14 items-center gap-4">
          <Link href="/painel" aria-label={`${platform.name}, painel`} className="press rounded-sm">
            <Logo size="sm" />
          </Link>

          <div className="ml-auto flex items-center gap-3">{actions}</div>
        </Container>

        {nav && <DashboardNav />}
      </header>

      <Container as="main" id="conteudo" className={`flex-1 ${PANEL_GUTTER}`}>
        {children}
      </Container>

      {floating}
    </div>
  );
}
