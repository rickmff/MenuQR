'use client';

import Link from 'next/link';
import { useState } from 'react';
import { platform } from '@/lib/platform';

const navigation = [
  { href: '/#recursos', label: 'Recursos' },
  { href: '/#como-funciona', label: 'Como funciona' },
  { href: '/#planos', label: 'Planos' },
  { href: '/#perguntas', label: 'Dúvidas' },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-cream-200 bg-cream-50/90 backdrop-blur-md">
      <div className="container-page flex h-(--header-height) items-center gap-4">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg" aria-label={`${platform.name}, página inicial`}>
          <span
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-xl bg-linear-to-br from-ember-500 to-ember-700 text-lg"
          >
            🍽️
          </span>
          <span className="font-display text-lg font-semibold">{platform.name}</span>
        </Link>

        <nav aria-label="Navegação principal" className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-1">
            {navigation.map((entry) => (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-charcoal-700 hover:bg-cream-100"
                >
                  {entry.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-4">
          <Link
            href="/entrar"
            className="hidden rounded-xl px-4 py-2.5 text-sm font-semibold text-charcoal-700 hover:bg-cream-100 sm:block"
          >
            Entrar
          </Link>
          <Link
            href="/criar-conta"
            className="rounded-xl bg-ember-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ember-600"
          >
            Criar conta grátis
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="menu-plataforma"
            className="grid size-11 place-items-center rounded-xl border border-cream-200 bg-white lg:hidden"
          >
            <span aria-hidden="true">{menuOpen ? '✕' : '☰'}</span>
            <span className="sr-only">{menuOpen ? 'Fechar menu' : 'Abrir menu'}</span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="menu-plataforma" aria-label="Navegação principal" className="border-t border-cream-200 lg:hidden">
          <ul className="container-page flex flex-col py-2">
            {[...navigation, { href: '/entrar', label: 'Entrar' }].map((entry) => (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-2 py-3 text-base font-medium text-charcoal-700 hover:bg-cream-100"
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
