'use client';

import Link from 'next/link';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { DemoBanner } from '@/components/demo/demo-banner';
import { CartDrawer } from '@/components/store/cart-drawer';
import { DishImage } from '@/components/store/dish-image';
import { ItemCard } from '@/components/store/item-card';
import { ItemOrderPanel } from '@/components/store/item-order-panel';
import { MenuBrowser } from '@/components/store/menu-browser';
import { OpeningBadge } from '@/components/store/opening-badge';
import { StoreFooter } from '@/components/store/store-footer';
import { StoreHeader } from '@/components/store/store-header';
import { StoreProvider } from '@/components/store/store-provider';
import { normalizeHexColor, readableTextColor } from '@/lib/colors';
import { findPublishedStore, useDemoState } from '@/lib/demo/store';
import { formatPrice } from '@/lib/format';
import { findItemBySlug, priceFrom, toCardCategory, toCardItem, visibleMenu } from '@/lib/menu-utils';
import { platform } from '@/lib/platform';
import type { Business, MenuCategory } from '@/lib/types';

function brandStyle(business: Business): React.CSSProperties {
  const brand = normalizeHexColor(business.brandColor);
  return {
    '--tenant-brand': brand,
    '--tenant-brand-text': readableTextColor(brand),
    '--tenant-brand-ink': brand,
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
  const cheapestFee = business.delivery.zones.length
    ? Math.min(...business.delivery.zones.map((zone) => zone.fee))
    : 0;
  const cheapestItem = priceFrom(menu);

  return (
    <StoreShell business={business} menu={menu}>
      <section className="border-b border-ink-200 bg-linear-to-b from-ink-100 to-ink-50">
        <div className="container-page py-12 lg:py-16">
          <OpeningBadge hours={business.hours} />
          <h1 className="mt-5 text-4xl font-semibold sm:text-5xl lg:text-6xl">{business.name}</h1>
          {business.tagline && <p className="mt-2 text-lg text-ink-700">{business.tagline}</p>}
          {business.description && (
            <p className="mt-4 max-w-2xl leading-relaxed text-ink-700">{business.description}</p>
          )}

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 text-sm">
            {business.delivery.enabled && business.delivery.zones.length > 0 && (
              <div>
                <dt className="text-ink-500">Entrega a partir de</dt>
                <dd className="mt-0.5 font-display text-xl font-semibold">{formatPrice(cheapestFee)}</dd>
              </div>
            )}
            {cheapestItem > 0 && (
              <div>
                <dt className="text-ink-500">Pratos a partir de</dt>
                <dd className="mt-0.5 font-display text-xl font-semibold">{formatPrice(cheapestItem)}</dd>
              </div>
            )}
            {business.delivery.enabled && business.delivery.minOrder > 0 && (
              <div>
                <dt className="text-ink-500">Pedido mínimo</dt>
                <dd className="mt-0.5 font-display text-xl font-semibold">
                  {formatPrice(business.delivery.minOrder)}
                </dd>
              </div>
            )}
            {business.pickup.enabled && (
              <div>
                <dt className="text-ink-500">Retirada no local</dt>
                <dd className="mt-0.5 font-display text-xl font-semibold">
                  {business.pickup.eta || 'Disponível'}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </section>

      <div className="container-page pb-20">
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
  const basePath = `/r/${business.slug}`;
  const related = category.items.filter((entry) => entry.id !== item.id).slice(0, 4);

  return (
    <StoreShell business={business} menu={menu}>
      <div className="container-page py-8">
        <Breadcrumbs
          trail={[
            { name: platform.name, path: '/' },
            { name: business.name, path: basePath },
            { name: item.name, path: `${basePath}/item/${item.slug}` },
          ]}
        />

        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          <DishImage
            image={item.image}
            alt={item.imageAlt || item.name}
            priority
            className="aspect-4/3 w-full rounded-card border border-ink-200"
            emojiClassName="text-[7rem]"
            sizes="(max-width: 1024px) 100vw, 560px"
          />

          <div>
            <p className="text-sm font-medium text-ink-500">
              {category.icon} {category.name}
            </p>
            <h1 className="mt-2 text-4xl font-semibold">{item.name}</h1>
            {item.description && <p className="mt-3 text-lg text-ink-700">{item.description}</p>}
            <p className="mt-4 font-display text-3xl font-bold text-(--tenant-brand-ink)">
              {formatPrice(item.price)}
            </p>

            <div className="mt-8">
              <ItemOrderPanel item={item} />
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-16 border-t border-ink-200 pt-10">
            <h2 className="font-display text-2xl font-semibold">Também em {category.name}</h2>
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {related.map((entry) => (
                <ItemCard key={entry.id} item={toCardItem(entry)} basePath={basePath} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </StoreShell>
  );
}
