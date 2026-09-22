'use client';

import { useAuth } from '@clerk/nextjs';
import { Menu } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Logo } from '@/components/platform/logo';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { IconButton } from '@/components/ui/icon-button';
import { cn } from '@/lib/cn';
import { demoMode } from '@/lib/demo/config';
import { currentUser, subscribe as subscribeToDemo } from '@/lib/demo/store';
import { platform } from '@/lib/platform';

const navigation = [
  { href: '/#como-funciona', label: 'Como funciona' },
  { href: '/#capacidades', label: 'Capacidades' },
];

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // A barra é lisa no topo e ganha o divisor assim que a página rola.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b bg-white pt-safe transition-colors duration-150 ease-standard',
        scrolled ? 'border-gray-200' : 'border-transparent',
      )}
    >
      <Container
        className={cn(
          'flex items-center gap-4 transition-[height] duration-150 ease-standard',
          scrolled ? 'h-14' : 'h-16',
        )}
      >
        <Link href="/" aria-label={`${platform.name}, página inicial`} className="press rounded-sm">
          <Logo />
        </Link>

        <nav aria-label="Navegação principal" className="hidden lg:block">
          <ul className="flex items-center">
            {navigation.map((entry) => (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  className="press flex h-10 items-center rounded-full px-4 text-body2 font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-700"
                >
                  {entry.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Alinhado à direita e com altura fixa: a troca de botões não empurra nada. */}
        <div className="ml-auto flex items-center gap-1">
          {logged ? (
            <Button href="/painel" size="sm" pill className="animate-fade-in">
              Ir para o painel
            </Button>
          ) : (
            <>
              <div className="hidden sm:block">
                <Button href="/entrar" variant="text" size="sm" pill>
                  Entrar
                </Button>
              </div>
              <Button href="/criar-conta" size="sm" pill>
                Criar cardápio
              </Button>
            </>
          )}
          <IconButton
            label="Abrir menu"
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
        title="Menu"
        footer={
          logged ? (
            <Button href="/painel" fullWidth>
              Ir para o painel
            </Button>
          ) : (
            <Button href="/criar-conta" fullWidth>
              Criar cardápio
            </Button>
          )
        }
      >
        <nav aria-label="Menu da plataforma">
          <ul>
            {(logged ? navigation : [...navigation, { href: '/entrar', label: 'Entrar' }]).map((entry) => (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  onClick={() => setMenuOpen(false)}
                  className="press flex min-h-14 items-center border-b border-gray-200 px-4 text-body1 text-gray-700 active:bg-gray-50"
                >
                  {entry.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </BottomSheet>
    </header>
  );
}
