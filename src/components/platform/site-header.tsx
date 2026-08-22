'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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

  // Ganha borda e sombra assim que a página sai do topo.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b bg-ink-50/85 backdrop-blur-xl transition-shadow duration-300 ${
        scrolled ? 'border-ink-200 shadow-soft' : 'border-ink-200/60'
      }`}
    >
      <div className="container-page flex h-(--header-height) items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${platform.name}, página inicial`}>
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-xl bg-ink-950 text-base text-ink-50"
          >
            ◍
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">{platform.name}</span>
        </Link>

        <nav aria-label="Navegação principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {navigation.map((entry) => (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  className="rounded-full px-3.5 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-950"
                >
                  {entry.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/entrar"
            className="hidden rounded-full px-4 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-950 sm:block"
          >
            Entrar
          </Link>
          <Link href="/criar-conta" className="btn btn-sm btn-primary">
            Criar conta
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="menu-plataforma"
            className="grid size-10 place-items-center rounded-xl border border-ink-200 bg-white lg:hidden"
          >
            <span aria-hidden="true">{menuOpen ? '✕' : '☰'}</span>
            <span className="sr-only">{menuOpen ? 'Fechar menu' : 'Abrir menu'}</span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="menu-plataforma"
          aria-label="Navegação principal"
          className="border-t border-ink-200 bg-ink-50 lg:hidden"
        >
          <ul className="container-page flex flex-col py-2">
            {[...navigation, { href: '/entrar', label: 'Entrar' }].map((entry) => (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-xl px-3 py-3 text-base font-medium text-ink-700 hover:bg-ink-100"
                >
                  {entry.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
