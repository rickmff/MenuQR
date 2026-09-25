"use client";

import { useAuth } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Logo } from "@/components/platform/logo";
import { LocaleMenu, LocaleSwitcher } from "@/components/locale-switcher";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { NavIcon } from "@/components/ui/button-icons";
import { Container } from "@/components/ui/container";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/cn";
import { demoMode } from "@/lib/demo/config";
import { currentUser, subscribe as subscribeToDemo } from "@/lib/demo/store";
import { platform } from "@/lib/platform";

/** Âncoras da landing; o rótulo sai de `platform.nav.<chave>`. */
const navigation = [
  { href: "/#como-funciona", key: "howItWorks" },
  { href: "/#capacidades", key: "capabilities" },
  { href: "/#preco", key: "pricing" },
] as const;

/**
 * "Tem alguém logado neste navegador?" — só para escolher os botões do
 * cabeçalho. A resposta não autoriza nada: se a sessão tiver caído, "Ir para o
 * painel" cai no login.
 *
 * A página é estática, então o servidor sempre responde `false` e é esse valor
 * que a hidratação usa — o HTML bate. O valor real entra logo depois, sem erro
 * de hidratação e sem `setState` em efeito. Por isso são dois componentes e não
 * um `if` no meio dos hooks: `demoMode` é constante de build, cada um chama
 * sempre os mesmos hooks, e no modo demonstração não existe Clerk para
 * perguntar.
 */
export function SiteHeader() {
  return demoMode ? <DemoSiteHeader /> : <ClerkSiteHeader />;
}

/** Modo demonstração: a conta vive no store do navegador. */
function DemoSiteHeader() {
  const logged = useSyncExternalStore(
    subscribeToDemo,
    () => currentUser() !== null,
    () => false,
  );
  return <Header logged={logged} />;
}

function ClerkSiteHeader() {
  // Antes de o Clerk carregar, `isSignedIn` é `undefined` — o mesmo "deslogado"
  // que o HTML estático já mostra.
  const { isSignedIn } = useAuth();
  return <Header logged={Boolean(isSignedIn)} />;
}

function Header({ logged }: { logged: boolean }) {
  const t = useTranslations("platform");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // A barra encolhe e o vidro fica mais denso assim que a página rola.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 pt-safe">
      {/*
       * O vidro é uma camada à parte, e não o fundo do <header>: ela desce 2rem
       * além da barra e some numa máscara, então o conteúdo da página entra no
       * desfoque por baixo e desaparece sem nenhuma linha. O <header> em si não
       * tem fundo nem borda — só o conteúdo, que fica na faixa 100% opaca.
       */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 -bottom-8 top-0 backdrop-blur-xl transition-colors duration-150 ease-standard",
          "[-webkit-mask-image:linear-gradient(to_bottom,#000_0,#000_62%,transparent_100%)]",
          "[mask-image:linear-gradient(to_bottom,#000_0,#000_62%,transparent_100%)]",
          scrolled ? "bg-white/70" : "bg-white/55",
        )}
      />

      <Container
        className={cn(
          "relative flex items-center gap-4 transition-[height] duration-150 ease-standard",
          scrolled ? "h-16" : "h-32",
          // Celular deitado: 128px eram um terço da tela e empurravam o CTA do
          // hero para fora da primeira dobra.
          "[@media(max-height:500px)]:h-16",
        )}
      >
        <Link
          href="/"
          aria-label={t("header.homeLabel", { name: platform.name })}
          className="press rounded-sm"
        >
          <Logo />
        </Link>

        <nav aria-label={t("header.mainNav")} className="hidden lg:block">
          <ul className="flex items-center">
            {navigation.map((entry) => (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  className="press flex h-10 items-center rounded-full px-4 text-body2 font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-700"
                >
                  {t(`nav.${entry.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Alinhado à direita e com altura fixa: a troca de botões não empurra nada. */}
        <div className="ml-auto flex items-center gap-1">
          {/* Só a bandeira, que abre a lista. Abaixo de `sm` a barra já está no
           * limite (veja abaixo) e o idioma mora na gaveta do menu. */}
          <div className="hidden sm:block">
            <LocaleMenu />
          </div>
          {/* Grafite, não verde: este botão é a MESMA ação do CTA do hero, na
           * mesma dobra. Em verde, os dois disputavam e nenhum era o
           * principal. Aqui ele espera; lá embaixo ele chama (D19). */}
          {/* Abaixo de 390px (iPhone SE e mini, Android de 360) logo, botão e
           * menu somam 359px e o menu saía da tela. Ali o botão fica só na
           * gaveta, que já o traz no rodapé. */}
          {logged ? (
            <div className="hidden min-[390px]:block">
              <Button
                href="/painel"
                variant="dark"
                size="sm"
                pill
                after={<NavIcon />}
                className="animate-fade-in"
              >
                {t("header.goToDashboard")}
              </Button>
            </div>
          ) : (
            <>
              <div className="hidden sm:block">
                <Button
                  href="/entrar"
                  variant="ghost"
                  size="sm"
                  pill
                  after={<NavIcon />}
                >
                  {t("header.signIn")}
                </Button>
              </div>
              <div className="hidden min-[390px]:block">
                <Button
                  href="/criar-conta"
                  variant="dark"
                  size="sm"
                  pill
                  after={<NavIcon />}
                >
                  {t("header.createMenu")}
                </Button>
              </div>
            </>
          )}
          <IconButton
            label={t("header.openMenu")}
            icon={<Menu className="size-6" />}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="lg:hidden"
          />
        </div>
      </Container>

      <BottomSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={t("header.sheetTitle")}
        footer={
          logged ? (
            <Button
              href="/painel"
              variant="brand"
              fullWidth
              after={<NavIcon />}
            >
              {t("header.goToDashboard")}
            </Button>
          ) : (
            <Button
              href="/criar-conta"
              variant="brand"
              fullWidth
              after={<NavIcon />}
            >
              {t("header.createMenu")}
            </Button>
          )
        }
      >
        <nav aria-label={t("header.sheetNav")}>
          <ul>
            {(logged
              ? navigation
              : [...navigation, { href: "/entrar", key: "signIn" } as const]
            ).map((entry) => (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  onClick={() => setMenuOpen(false)}
                  className="press flex min-h-14 items-center border-b border-gray-200 px-4 text-body1 text-gray-700 active:bg-gray-50"
                >
                  {t(`nav.${entry.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <LocaleSwitcher className="px-4 pt-5" />
      </BottomSheet>
    </header>
  );
}
