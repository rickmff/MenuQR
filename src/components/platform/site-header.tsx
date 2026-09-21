'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/platform/logo';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { IconButton } from '@/components/ui/icon-button';
import { cn } from '@/lib/cn';
import { platform } from '@/lib/platform';

const navigation = [
  { href: '/#recursos', label: 'Recursos' },
  { href: '/#como-funciona', label: 'Como funciona' },
  { href: '/#planos', label: 'Planos' },
  { href: '/#perguntas', label: 'Dúvidas' },
];

export function SiteHeader() {
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

        <div className="ml-auto flex items-center gap-1">
          <div className="hidden sm:block">
            <Button href="/entrar" variant="text" size="sm" pill>
              Entrar
            </Button>
          </div>
          <Button href="/criar-conta" size="sm" pill>
            Criar conta
          </Button>
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
          <Button href="/criar-conta" fullWidth>
            Criar conta
          </Button>
        }
      >
        <nav aria-label="Menu da plataforma">
          <ul>
            {[...navigation, { href: '/entrar', label: 'Entrar' }].map((entry) => (
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
