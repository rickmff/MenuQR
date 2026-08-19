'use client';

import { useEffect, useMemo, useState } from 'react';
import { ItemCard } from '@/components/item-card';
import { cn } from '@/lib/cn';
import type { MenuCategoryCard } from '@/lib/types';

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Navegação do cardápio: busca e filtro por categoria.
 * Todos os itens são renderizados no servidor — o filtro é apenas visual,
 * então o HTML entregue aos buscadores continua com o cardápio completo.
 */
export function MenuBrowser({ categories }: { categories: MenuCategoryCard[] }) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('todas');

  // Suporta /cardapio?busca=termo (usado também pelo SearchAction do schema.org).
  useEffect(() => {
    const term = new URLSearchParams(window.location.search).get('busca');
    // Sincroniza com a URL (sistema externo) apenas na montagem; manter fora do
    // estado inicial evita divergência entre o HTML do servidor e a hidratação.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (term) setQuery(term);
  }, []);

  const filtered = useMemo(() => {
    const term = normalize(query).trim();
    return categories
      .filter((category) => activeCategory === 'todas' || category.slug === activeCategory)
      .map((category) => ({
        category,
        items: category.items.filter((item) => {
          if (!term) return true;
          return (
            normalize(item.name).includes(term) ||
            normalize(item.description).includes(term) ||
            normalize(category.name).includes(term) ||
            (item.tags ?? []).some((tag) => normalize(tag).includes(term))
          );
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [categories, query, activeCategory]);

  const totalFound = filtered.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <div>
      <div className="sticky top-(--header-height) z-30 -mx-5 border-b border-cream-200 bg-cream-50/95 px-5 py-3 backdrop-blur-md lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="busca-cardapio" className="sr-only">
              Buscar no cardápio
            </label>
            <div className="flex items-center gap-3 rounded-full border border-cream-200 bg-white px-5 py-2.5 shadow-soft">
              <span aria-hidden="true">🔎</span>
              <input
                id="busca-cardapio"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar prato, bebida ou ingrediente…"
                className="w-full bg-transparent text-base outline-none"
              />
            </div>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <CategoryChip
              active={activeCategory === 'todas'}
              onClick={() => setActiveCategory('todas')}
              label="Tudo"
            />
            {categories.map((category) => (
              <CategoryChip
                key={category.slug}
                active={activeCategory === category.slug}
                onClick={() => setActiveCategory(category.slug)}
                label={`${category.icon} ${category.name}`}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {totalFound} {totalFound === 1 ? 'item encontrado' : 'itens encontrados'}
      </p>

      {filtered.length === 0 ? (
        <p className="py-20 text-center text-charcoal-500">
          Nenhum item encontrado para “{query}”. Tente outro termo.
        </p>
      ) : (
        filtered.map(({ category, items }) => (
          <section key={category.slug} id={category.slug} className="pt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl font-semibold">
                <span aria-hidden="true">{category.icon}</span> {category.name}
              </h2>
              <span className="text-sm text-charcoal-500">
                {items.length} {items.length === 1 ? 'item' : 'itens'}
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-charcoal-500">{category.description}</p>
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} category={category} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-ember-500 bg-ember-500 text-white'
          : 'border-cream-200 bg-white text-charcoal-700 hover:border-ember-400',
      )}
    >
      {label}
    </button>
  );
}
