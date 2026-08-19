'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useCart } from '@/components/cart-provider';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { restaurant } from '@/lib/restaurant';

const navigation = [
  { href: '/cardapio', label: 'Cardápio' },
  { href: '/sobre', label: 'Sobre nós' },
  { href: '/entrega', label: 'Entrega' },
  { href: '/contato', label: 'Contato' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { itemCount, subtotal, openCart } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-cream-200 bg-cream-50/90 backdrop-blur-md">
      <div className="container-page flex h-(--header-height) items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg py-1"
          aria-label={`${restaurant.name} — página inicial`}
        >
          <span
            aria-hidden="true"
            className="grid size-11 place-items-center rounded-xl bg-linear-to-br from-ember-500 to-ember-700 text-xl shadow-soft"
          >
            {restaurant.logo}
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-lg font-semibold text-charcoal-900">{restaurant.name}</span>
            <span className="hidden text-xs text-charcoal-500 sm:block">{restaurant.tagline}</span>
          </span>
        </Link>

        <nav aria-label="Navegação principal" className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-1">
            {navigation.map((entry) => {
              const active = pathname === entry.href || pathname.startsWith(`${entry.href}/`);
              return (
                <li key={entry.href}>
                  <Link
                    href={entry.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-ember-50 text-ember-700'
                        : 'text-charcoal-700 hover:bg-cream-100 hover:text-charcoal-900',
                    )}
                  >
                    {entry.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <button
            type="button"
            onClick={() => openCart('cart')}
            className="relative flex items-center gap-2 rounded-xl bg-charcoal-900 px-4 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-charcoal-700"
          >
            <span aria-hidden="true">🛒</span>
            <span className="hidden sm:inline">
              {itemCount > 0 ? formatPrice(subtotal) : 'Carrinho'}
            </span>
            <span className="sr-only">
              Abrir carrinho{itemCount > 0 ? ` com ${itemCount} itens` : ' vazio'}
            </span>
            {itemCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-ember-500 text-[11px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="menu-mobile"
            className="grid size-11 place-items-center rounded-xl border border-cream-200 bg-white text-charcoal-900 lg:hidden"
          >
            <span aria-hidden="true">{menuOpen ? '✕' : '☰'}</span>
            <span className="sr-only">{menuOpen ? 'Fechar menu' : 'Abrir menu'}</span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="menu-mobile" aria-label="Navegação principal" className="border-t border-cream-200 bg-cream-50 lg:hidden">
          <ul className="container-page flex flex-col py-2">
            {navigation.map((entry) => (
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
