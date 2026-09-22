'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { ItemCard } from '@/components/store/item-card';
import { cn } from '@/lib/cn';
import type { MenuCategoryCard } from '@/lib/types';

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Cardápio no formato de aplicativo de delivery: busca fixa no topo, abas de
 * categoria que acompanham a rolagem e listas com divisórias.
 *
 * Todos os itens são renderizados no servidor — a busca é apenas visual, então
 * o HTML entregue aos buscadores continua com o cardápio completo.
 */
export function MenuBrowser({
  categories,
  basePath,
}: {
  categories: MenuCategoryCard[];
  basePath: string;
}) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(categories[0]?.slug ?? '');
  const tabsRef = useRef<HTMLDivElement>(null);
  const isScrollingTo = useRef(false);

  // Suporta ?busca=termo, usado quando o cliente chega de uma busca externa.
  useEffect(() => {
    const term = new URLSearchParams(window.location.search).get('busca');
    // Sincroniza com a URL (sistema externo) apenas na montagem.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (term) setQuery(term);
  }, []);

  const searching = query.trim().length > 0;

  const results = useMemo(() => {
    const term = normalize(query).trim();
    if (!term) return [];
    return categories.flatMap((category) =>
      category.items
        .filter(
          (item) =>
            normalize(item.name).includes(term) ||
            normalize(item.description).includes(term) ||
            normalize(category.name).includes(term) ||
            item.tags.some((tag) => normalize(tag).includes(term)),
        )
        .map((item) => ({ item, category })),
    );
  }, [categories, query]);

  // Aba ativa acompanha a seção visível (como nos apps de delivery).
  useEffect(() => {
    if (searching) return;
    const sections = categories
      .map((category) => document.getElementById(`cat-${category.slug}`))
      .filter((element): element is HTMLElement => Boolean(element));
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingTo.current) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveCategory(visible.target.id.replace('cat-', ''));
      },
      { rootMargin: '-180px 0px -65% 0px', threshold: 0 },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [categories, searching]);

  // Mantém a aba ativa visível na régua horizontal.
  useEffect(() => {
    const tab = tabsRef.current?.querySelector<HTMLElement>(`[data-tab="${activeCategory}"]`);
    tab?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeCategory]);

  const goToCategory = useCallback((slug: string) => {
    const section = document.getElementById(`cat-${slug}`);
    if (!section) return;
    isScrollingTo.current = true;
    setActiveCategory(slug);
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      isScrollingTo.current = false;
    }, 700);
  }, []);

  return (
    <div>
      {/* Busca e abas ficam grudadas logo abaixo do cabeçalho. */}
      <div className="sticky top-(--app-bar-height) z-30 -mx-5 border-b border-gray-200 bg-white px-5 pt-3 lg:-mx-8 lg:px-8">
        <label htmlFor="busca-cardapio" className="sr-only">
          Buscar no cardápio
        </label>
        <div className="flex h-12 items-center gap-2.5 rounded-xl bg-gray-50 px-4 transition-colors duration-150 ease-standard focus-within:bg-white focus-within:shadow-medium">
          <Search aria-hidden="true" className="size-5 shrink-0 text-gray-400" />
          <input
            id="busca-cardapio"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar no cardápio"
            className="w-full bg-transparent text-body1 text-gray-700 outline-none placeholder:text-gray-400"
          />
          {searching && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpar busca"
              className="press grid size-8 shrink-0 place-items-center rounded-full text-gray-600 active:bg-gray-100"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          )}
        </div>

        {!searching && (
          <div
            ref={tabsRef}
            className="-mx-5 mt-2 flex gap-1 overflow-x-auto px-5 pb-1 lg:-mx-8 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {categories.map((category) => (
              <button
                key={category.slug}
                type="button"
                data-tab={category.slug}
                onClick={() => goToCategory(category.slug)}
                aria-current={activeCategory === category.slug ? 'true' : undefined}
                className={cn(
                  'press shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-body2 font-semibold transition-colors duration-150 ease-standard',
                  activeCategory === category.slug
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600',
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {searching ? (
        <section className="pt-6" aria-live="polite">
          <h2 className="text-body2 text-gray-600">
            {results.length} {results.length === 1 ? 'resultado' : 'resultados'} para “{query}”
          </h2>
          {results.length === 0 ? (
            <p className="py-16 text-center text-body2 text-gray-600">
              Nenhum item encontrado para “{query}”
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-gray-200">
              {results.map(({ item }) => (
                <ItemCard key={item.id} item={item} basePath={basePath} />
              ))}
            </ul>
          )}
        </section>
      ) : (
        categories.map((category, index) => (
          <section key={category.slug} id={`cat-${category.slug}`} className="scroll-mt-40 pt-8">
            <h2 className="text-subtitle font-bold text-gray-700">{category.name}</h2>
            {category.description && (
              <p className="mt-1 max-w-2xl text-body2 text-gray-600">{category.description}</p>
            )}

            <ul className="mt-1 divide-y divide-gray-200">
              {category.items.map((item, itemIndex) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  basePath={basePath}
                  priority={index === 0 && itemIndex < 2}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
