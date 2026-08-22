'use client';

import Link from 'next/link';
import { DemoBanner } from '@/components/demo/demo-banner';
import { CartBar } from '@/components/store/cart-bar';
import { CartDrawer } from '@/components/store/cart-drawer';
import { ItemDetail } from '@/components/store/item-detail';
import { JsonLd } from '@/components/json-ld';
import { MenuBrowser } from '@/components/store/menu-browser';
import { StoreFooter } from '@/components/store/store-footer';
import { StoreHeader } from '@/components/store/store-header';
import { StoreProvider } from '@/components/store/store-provider';
import { normalizeHexColor, readableOnLight, readableTextColor } from '@/lib/colors';
import { findPublishedStore, useDemoState } from '@/lib/demo/store';
import { findItemBySlug, toCardCategory, visibleMenu } from '@/lib/menu-utils';
import { platform } from '@/lib/platform';
import { breadcrumbSchema, businessSchema, graph, menuItemSchema, menuSchema } from '@/lib/seo';
import type { Business, MenuCategory } from '@/lib/types';

function brandStyle(business: Business): React.CSSProperties {
  const brand = normalizeHexColor(business.brandColor);
  return {
    '--tenant-brand': brand,
    '--tenant-brand-text': readableTextColor(brand),
    '--tenant-brand-ink': readableOnLight(brand),
  } as React.CSSProperties;
}

function StoreLoading() {
  return <div className="container-page py-24 text-center text-ink-500">Carregando cardápio…</div>;
}

function NotFound({ slug }: { slug: string }) {
  return (
    <div className="container-page py-24 text-center">
      <p className="font-display text-5xl font-bold text-flame-500">404</p>
      <h1 className="mt-4 text-3xl font-semibold">Cardápio não encontrado</h1>
      <p className="mx-auto mt-3 max-w-md text-ink-500">
        Não existe um cardápio publicado em <span className="font-mono">/r/{slug}</span> neste navegador.
        No modo demonstração, o cardápio só aparece no aparelho em que foi criado.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/r/sabor-e-brasa" className="btn btn-primary">
          Ver o cardápio de exemplo
        </Link>
        <Link href="/" className="btn btn-outline">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}

function StoreShell({
  business,
  menu,
  children,
}: {
  business: Business;
  menu: MenuCategory[];
  children: React.ReactNode;
}) {
  return (
    <StoreProvider business={business} menu={menu}>
      <div className="flex min-h-dvh flex-col" style={brandStyle(business)}>
        <StoreHeader />
        <main id="conteudo" className="flex-1">
          <div className="container-page pt-4">
            <DemoBanner compact />
          </div>
          {children}
        </main>
        <StoreFooter business={business} />
        <CartBar />
        <CartDrawer />
      </div>
    </StoreProvider>
  );
}

/** Cardápio público lido do navegador. */
export function DemoStorePage({ slug }: { slug: string }) {
  const state = useDemoState();
  const data = findPublishedStore(state, slug);
  if (!state.ready) return <StoreLoading />;
  if (!data) return <NotFound slug={slug} />;

  const { business, menu } = data;
  const categories = visibleMenu(menu);

  return (
    <StoreShell business={business} menu={menu}>
      <JsonLd
        id={`ld-store-${business.slug}`}
        data={graph(
          businessSchema(business),
          menuSchema(business, categories),
          breadcrumbSchema([
            { name: platform.name, path: '/' },
            { name: business.name, path: `/r/${business.slug}` },
          ]),
        )}
      />

      <h1 className="sr-only">Cardápio do {business.name}</h1>

      <div className="container-page pb-32 pt-2">
        {categories.length === 0 ? (
          <p className="py-24 text-center text-ink-500">Este cardápio ainda não tem itens publicados.</p>
        ) : (
          <MenuBrowser categories={categories.map(toCardCategory)} basePath={`/r/${business.slug}`} />
        )}
      </div>
    </StoreShell>
  );
}

/** Página de um prato, também lida do navegador. */
export function DemoStoreItemPage({ slug, itemSlug }: { slug: string; itemSlug: string }) {
  const state = useDemoState();
  const data = findPublishedStore(state, slug);
  const found = data ? findItemBySlug(data.menu, itemSlug) : undefined;
  if (!state.ready) return <StoreLoading />;
  if (!data || !found) return <NotFound slug={slug} />;

  const { business, menu } = data;
  const { item, category } = found;

  return (
    <StoreShell business={business} menu={menu}>
      <JsonLd
        id={`ld-item-${item.slug}`}
        data={graph(
          menuItemSchema(business, item),
          breadcrumbSchema([
            { name: platform.name, path: '/' },
            { name: business.name, path: `/r/${business.slug}` },
            { name: item.name, path: `/r/${business.slug}/item/${item.slug}` },
          ]),
        )}
      />
      <ItemDetail business={business} category={category} item={item} />
    </StoreShell>
  );
}
