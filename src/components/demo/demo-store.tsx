'use client';

import Link from 'next/link';
import { DemoBanner } from '@/components/demo/demo-banner';
import { ItemDetail } from '@/components/store/item-detail';
import { JsonLd } from '@/components/json-ld';
import { StoreFrame } from '@/components/store/store-frame';
import { StoreMenu } from '@/components/store/store-menu';
import { findPublishedStore, useDemoState } from '@/lib/demo/store';
import { findItemBySlug, visibleMenu } from '@/lib/menu-utils';
import { platform } from '@/lib/platform';
import { breadcrumbSchema, businessSchema, graph, menuItemSchema, menuSchema } from '@/lib/seo';
import type { Business, MenuCategory } from '@/lib/types';

function StoreLoading() {
  return <div className="container-page py-24 text-center text-ink-500">Carregando cardápio…</div>;
}

function NotFound({ slug }: { slug: string }) {
  return (
    <div className="container-page py-24 text-center">
      <p className="font-display text-5xl font-bold text-flame-500">404</p>
      <h1 className="mt-4 text-3xl font-semibold">Cardápio não encontrado</h1>
      <p className="mx-auto mt-3 max-w-md text-ink-500">
        Não existe um cardápio publicado em <span className="font-mono">/r/{slug}</span> neste
        navegador, e este link não trouxe o cardápio junto.
      </p>
      <p className="mx-auto mt-3 max-w-md text-sm text-ink-500">
        Sem banco de dados, o cardápio viaja dentro do endereço. Peça a quem enviou para copiar o
        link outra vez no painel — o link completo é longo e alguns aplicativos cortam o final.
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
  // A casca é a mesma do cardápio servido pelo banco (StoreFrame): só entra a
  // faixa avisando que os dados vivem no navegador.
  return (
    <StoreFrame business={business} menu={menu} notice={<DemoBanner compact />}>
      {children}
    </StoreFrame>
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

      <StoreMenu business={business} categories={categories} />
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
