import Link from 'next/link';
import type { ReactNode } from 'react';
import { DashboardNav } from '@/components/painel/dashboard-nav';
import { PANEL_GUTTER } from '@/components/painel/panel-page';
import { Logo } from '@/components/platform/logo';
import { Container } from '@/components/ui/container';
import { ToastProvider } from '@/components/ui/toast';
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
  notice,
  floating,
  children,
}: {
  /** Botões à direita da barra do topo. */
  actions: ReactNode;
  /** As abas só aparecem depois que o restaurante existe. */
  nav?: boolean;
  /** Aviso que vale para o painel inteiro (assinatura vencendo), acima do conteúdo. */
  notice?: ReactNode;
  /** Camada que flutua sobre o painel inteiro — hoje, o guia de configuração. */
  floating?: ReactNode;
  children: ReactNode;
}) {
  return (
    // O toast é o retorno de salvar, excluir e copiar em qualquer tela do painel.
    <ToastProvider>
    <div className="flex min-h-dvh flex-col bg-gray-50">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl">
        {/* A barra fica na mesma coluna do conteúdo (`max-w-panel`), e não na
            largura cheia da página: alinhada à esquerda com o logo e à direita
            com a ação da tela. Antes a foto de perfil sobrava uns 11rem à
            direita do cartão que estava logo abaixo dela. */}
        <Container>
          <div className="flex h-14 max-w-panel items-center gap-4">
            <Link href="/painel" aria-label={`${platform.name}, painel`} className="press rounded-sm">
              <Logo size="sm" />
            </Link>

            <div className="ml-auto flex items-center gap-3">{actions}</div>
          </div>
        </Container>

        {nav && <DashboardNav />}
      </header>

      <Container as="main" id="conteudo" className={`flex-1 ${PANEL_GUTTER}`}>
        {notice && <div className="mb-6 w-full max-w-panel">{notice}</div>}
        {children}
      </Container>

      {floating}
    </div>
    </ToastProvider>
  );
}
