'use client';

import { SearchX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ItemCard } from '@/components/store/item-card';
import { savedMenuScroll } from '@/components/store/nav-marker';
import { readScrollTop, useScrollRoot, writeScrollTop } from '@/components/store/scroll-root';
import { useStore } from '@/components/store/store-provider';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs } from '@/components/ui/tabs';
import { prefersReducedMotion, scrollBehavior } from '@/lib/reduced-motion';
import type { MenuCategoryCard } from '@/lib/types';

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Altura do que fica fixo no topo acima da lista: a barra da loja e as abas. */
function stickyTop(tabs: HTMLElement | null): number {
  const bar = document.querySelector<HTMLElement>('[data-store-top-bar]');
  return (bar?.offsetHeight ?? 56) + (tabs?.offsetHeight ?? 48);
}

/**
 * A lista do cardápio no formato dos apps de delivery: abas de categoria que
 * grudam logo abaixo da barra da loja e acompanham a rolagem, seções com
 * título grande e as linhas de item — duas colunas no desktop.
 *
 * A busca abre pelo ícone do topo (é uma camada no histórico); com ela aberta
 * a tela vira só os resultados. Todos os itens são renderizados no servidor —
 * a busca é apenas visual, então o HTML entregue aos buscadores continua com o
 * cardápio completo.
 */
export function MenuBrowser({
  categories,
  basePath,
}: {
  categories: MenuCategoryCard[];
  basePath: string;
}) {
  const t = useTranslations('store.menu');
  const { business, embedded, search, setSearch, searchOpen, openSearch } = useStore();
  const [activeCategory, setActiveCategory] = useState(categories[0]?.slug ?? '');
  const [announcement, setAnnouncement] = useState('');
  const tabsRef = useRef<HTMLDivElement>(null);
  const isScrollingTo = useRef(false);
  const scrollRoot = useScrollRoot();
  const deferredSearch = useDeferredValue(search);
  const searching = searchOpen && search.trim().length > 0;

  // Voltar de um prato (router.back ou o voltar do sistema) remonta o cardápio:
  // a rolagem guardada NA entrada do histórico no clique (ver nav-marker) é
  // devolvida antes da pintura. Sem ela o navegador restauraria cedo demais,
  // com a lista ainda por montar, e a pessoa voltaria ao topo.
  useLayoutEffect(() => {
    const saved = savedMenuScroll();
    if (saved !== null) writeScrollTop(scrollRoot?.current, saved);
  }, [scrollRoot]);

  // Quem restaura é o efeito acima; a restauração automática do navegador
  // disputaria com ele. Só na página pública: na prévia quem rola é a moldura.
  useEffect(() => {
    if (embedded || !('scrollRestoration' in window.history)) return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, [embedded]);

  // Suporta ?busca=termo, usado quando o cliente chega de uma busca externa.
  useEffect(() => {
    const term = new URLSearchParams(window.location.search).get('busca');
    if (!term) return;
    setSearch(term);
    openSearch();
  }, [setSearch, openSearch]);

  // Abrir a busca leva a lista ao topo (os resultados começam sob a barra);
  // fechar devolve a pessoa ao ponto em que estava. Só nas TROCAS — voltar de
  // um prato aberto pelos resultados monta com a busca já aberta e a rolagem
  // guardada, que o efeito de restauração acima devolve.
  const beforeSearch = useRef<{ open: boolean; top: number }>({ open: searchOpen, top: 0 });
  useEffect(() => {
    const previous = beforeSearch.current;
    if (previous.open === searchOpen) return;
    const root = scrollRoot?.current;
    if (searchOpen) {
      beforeSearch.current = { open: true, top: readScrollTop(root) };
      writeScrollTop(root, 0);
    } else {
      beforeSearch.current = { open: false, top: 0 };
      writeScrollTop(root, previous.top);
    }
  }, [searchOpen, scrollRoot]);

  const results = useMemo(() => {
    const term = normalize(deferredSearch).trim();
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
  }, [categories, deferredSearch]);

  // O leitor de tela ouve a contagem só quando a pessoa para de digitar: o
  // useDeferredValue não é debounce e falaria a cada tecla.
  useEffect(() => {
    if (!searching) return;
    const timer = window.setTimeout(() => {
      setAnnouncement(t('resultsAnnouncement', { count: results.length, term: search }));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [searching, results.length, search, t]);

  // Aba ativa acompanha a seção visível (como nos apps de delivery).
  useEffect(() => {
    if (searchOpen) return;
    const sections = categories
      .map((category) => document.getElementById(`cat-${category.slug}`))
      .filter((element): element is HTMLElement => Boolean(element));
    if (!sections.length) return;

    let observer: IntersectionObserver | null = null;
    const connect = () => {
      observer?.disconnect();
      // A faixa "ativa" começa logo abaixo da barra + abas (medidas: o notch
      // entra na conta e o rootMargin não aceita env()).
      const top = stickyTop(tabsRef.current);
      observer = new IntersectionObserver(
        (entries) => {
          if (isScrollingTo.current) return;
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
          if (visible) setActiveCategory(visible.target.id.replace('cat-', ''));
        },
        { root: scrollRoot?.current ?? null, rootMargin: `-${top + 1}px 0px -60% 0px`, threshold: 0 },
      );
      for (const section of sections) observer.observe(section);
    };
    connect();
    window.addEventListener('resize', connect);
    window.addEventListener('orientationchange', connect);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', connect);
      window.removeEventListener('orientationchange', connect);
    };
  }, [categories, searchOpen, scrollRoot]);

  const goToCategory = useCallback((slug: string) => {
    const section = document.getElementById(`cat-${slug}`);
    if (!section) return;
    isScrollingTo.current = true;
    setActiveCategory(slug);
    // O `scroll-margin-top` global ([id] no globals.css) para a seção logo
    // abaixo da barra + abas.
    section.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    window.setTimeout(
      () => {
        isScrollingTo.current = false;
      },
      prefersReducedMotion() ? 0 : 700,
    );
  }, []);

  if (searchOpen) {
    return (
      // A folha branca sobe 24px sobre a capa (escondida na busca): o respiro compensa.
      <section className="animate-fade-in pt-[calc(var(--top-inset)+2.5rem)]" aria-labelledby="resultados-busca">
        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>
        {searching ? (
          <>
            <h2 id="resultados-busca" className="text-body2 text-gray-600">
              {t('results', { count: results.length, term: search })}
            </h2>
            {results.length === 0 ? (
              <EmptyState
                icon={<SearchX className="size-12" />}
                title={t('noResults', { term: search })}
                action={
                  <Button variant="secondary" size="sm" pill onClick={() => setSearch('')}>
                    {t('clearSearch')}
                  </Button>
                }
              />
            ) : (
              <ul className="mt-2 lg:grid lg:grid-cols-2 lg:gap-x-10">
                {results.map(({ item }) => (
                  <ItemCard key={item.id} item={item} basePath={basePath} storeSlug={business.slug} />
                ))}
              </ul>
            )}
          </>
        ) : (
          <h2 id="resultados-busca" className="text-body2 text-gray-600">
            {t('searchHint')}
          </h2>
        )}
      </section>
    );
  }

  return (
    <div>
      <div ref={tabsRef} className="sticky top-(--top-inset) z-30 -mx-4 mt-6 md:-mx-6 lg:-mx-8">
        <Tabs
          label={t('categories')}
          tone="ink"
          size="lg"
          items={categories.map((category) => ({ id: category.slug, label: category.name }))}
          activeId={activeCategory}
          onSelect={goToCategory}
          listClassName="px-1 md:px-3 lg:px-5"
        />
      </div>

      {categories.map((category, index) => (
        <section key={category.slug} id={`cat-${category.slug}`} className="pt-8">
          <h2 className="font-display text-h5 font-bold text-gray-900">{category.name}</h2>
          {category.description && <p className="mt-1 max-w-2xl text-body2 text-gray-600">{category.description}</p>}

          <ul className="mt-2 lg:grid lg:grid-cols-2 lg:gap-x-10">
            {category.items.map((item, itemIndex) => (
              <ItemCard
                key={item.id}
                item={item}
                basePath={basePath}
                storeSlug={business.slug}
                priority={index === 0 && itemIndex < 2}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
