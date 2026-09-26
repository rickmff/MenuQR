import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { LeaveGuardHost } from "@/components/painel/leave-guard";
import { PANEL_GUTTER } from "@/components/painel/panel-page";
import { Logo } from "@/components/platform/logo";
import { Container } from "@/components/ui/container";
import { ToastProvider } from "@/components/ui/toast";
import { platform } from "@/lib/platform";

/**
 * A casca do painel: barra do topo, abas e a coluna de conteúdo.
 *
 * Um componente só para o painel com banco, o modo demonstração e o super
 * admin — eles só diferem no que fica à direita da barra (o `UserButton` do
 * Clerk, o e-mail e o "Sair" do demo) e nas abas. Enquanto eram dois arquivos,
 * cada um tinha o seu respiro: `py-12` de um lado, `py-8` do outro.
 */
export function PanelShell({
  actions,
  nav,
  home,
  badge,
  notice,
  floating,
  children,
}: {
  /** Botões à direita da barra do topo. */
  actions: ReactNode;
  /** As abas da área. No painel do lojista, só depois que o restaurante existe. */
  nav?: ReactNode;
  /** Para onde o logo leva. Sem isto, o início do painel do lojista. */
  home?: { href: string; label: string };
  /** Selo ao lado do logo, que diz em que área a pessoa está ("Super admin"). */
  badge?: ReactNode;
  /** Aviso que vale para o painel inteiro (assinatura vencendo), acima do conteúdo. */
  notice?: ReactNode;
  /**
   * Camada que acompanha o painel inteiro — hoje, o guia de configuração. Não
   * cobre a coluna: aberto, ela cede o espaço (veja o `<main>`).
   */
  floating?: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations("painel.shell");
  const homeLink = home ?? {
    href: "/painel",
    label: t("logoLabel", { name: platform.name }),
  };
  return (
    // O toast é o retorno de salvar, excluir e copiar em qualquer tela do painel.
    <ToastProvider placement="panel">
      <div className="group/shell flex min-h-dvh flex-col bg-gray-50">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl">
          {/* A barra fica na mesma coluna do conteúdo (`max-w-panel`), e não na
            largura cheia da página: alinhada à esquerda com o logo e à direita
            com a ação da tela. Antes a foto de perfil sobrava uns 11rem à
            direita do cartão que estava logo abaixo dela. */}
          <Container>
            <div className="flex h-14 max-w-panel items-center gap-4">
              <Link
                href={homeLink.href}
                aria-label={homeLink.label}
                className="press rounded-sm"
              >
                <Logo size="sm" />
              </Link>
              {badge}

              <div className="ml-auto flex items-center gap-3">{actions}</div>
            </div>
          </Container>

          {nav}
        </header>

        {/* Com o guia de configuração aberto no canto, a coluna cede o espaço
          dele (`--setup-guide-reserve`, no globals.css) em vez de passar por
          baixo: o guia cobria "Criar categoria" e "Adicionar ao cardápio".
          `data-setup-docked` diz a partir de que largura o CSS mostra o guia
          aberto (`lg` ou `xl`); a reserva começa na mesma largura. */}
        <Container
          as="main"
          id="conteudo"
          className={`flex-1 ${PANEL_GUTTER} lg:group-has-[[data-setup-docked=lg]]/shell:pr-(--setup-guide-reserve) xl:group-has-[[data-setup-docked=xl]]/shell:pr-(--setup-guide-reserve)`}
        >
          {notice && <div className="mb-6 w-full max-w-panel">{notice}</div>}
          {children}
        </Container>

        {floating}
        {/* A pergunta "Descartar alterações?" de todo o painel (ver leave-guard.tsx). */}
        <LeaveGuardHost />
      </div>
    </ToastProvider>
  );
}
