'use client';

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
import { LOGGED_HINT_COOKIE } from '@/server/auth/cookie-name';

const navigation = [
  { href: '/#recursos', label: 'Recursos' },
  { href: '/#como-funciona', label: 'Como funciona' },
  { href: '/#planos', label: 'Planos' },
  { href: '/#perguntas', label: 'Dúvidas' },
];

function hasLoggedHint(): boolean {
  return document.cookie.split('; ').includes(`${LOGGED_HINT_COOKIE}=1`);
}

// Cookie não avisa quando muda. Reler ao voltar para a aba cobre os casos reais:
// entrar ou sair em outra aba, e o "voltar" do navegador restaurando a página.
function subscribeToHint(onChange: () => void): () => void {
  window.addEventListener('focus', onChange);
  window.addEventListener('pageshow', onChange);
  return () => {
    window.removeEventListener('focus', onChange);
    window.removeEventListener('pageshow', onChange);
  };
}

// Com banco, a sessão é um cookie `httpOnly` e o que dá para ler é a dica gravada
// junto dele. No modo demonstração a conta vive no store do navegador.
const session = demoMode
  ? { subscribe: subscribeToDemo, isLogged: () => currentUser() !== null }
  : { subscribe: subscribeToHint, isLogged: hasLoggedHint };

/**
 * "Tem alguém logado neste navegador?" — só para escolher os botões do cabeçalho.
 *
 * A página é estática: o servidor sempre responde `false`, e é esse valor que a
 * hidratação usa, então o HTML bate. O valor real entra logo depois, sem erro de
 * hidratação e sem `setState` em efeito. A resposta não autoriza nada: com a dica
 * velha, "Ir para o painel" cai no login.
 */
function useLoggedIn(): boolean {
  return useSyncExternalStore(session.subscribe, session.isLogged, () => false);
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const logged = useLoggedIn();

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
      <Container className="flex h-14 items-center gap-4">
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
                Criar conta
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
              Criar conta
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
