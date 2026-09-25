'use client';

import { SearchX } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { DemoBanner } from '@/components/demo/demo-banner';
import { JsonLd } from '@/components/json-ld';
import { ItemDetail } from '@/components/store/item-detail';
import { StoreFrame } from '@/components/store/store-frame';
import { StoreMenu } from '@/components/store/store-menu';
import { Button } from '@/components/ui/button';
import { NavIcon } from '@/components/ui/button-icons';
import { EmptyState } from '@/components/ui/empty-state';
import { ItemMissing } from '@/components/store/item-missing';
import { ItemSkeleton, StoreSkeleton } from '@/components/ui/skeleton';
import { findPublishedStore, useDemoState } from '@/lib/demo/store';
import { findItemBySlug, visibleMenu } from '@/lib/menu-utils';
import { platform } from '@/lib/platform';
import { breadcrumbSchema, businessSchema, graph, menuItemSchema, menuSchema } from '@/lib/seo';

function NotFound({ slug }: { slug: string }) {
  const t = useTranslations('demo.store');
  return (
    <div className="mx-auto w-full max-w-narrow px-4 py-12">
      <EmptyState
        icon={<SearchX className="size-12" />}
        title={t('notFoundTitle')}
        description={t('notFoundDescription', { slug })}
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button href="/r/sabor-e-brasa" after={<NavIcon />}>{t('seeSample')}</Button>
            <Button href="/" variant="secondary" after={<NavIcon />}>
              {t('backHome')}
            </Button>
          </div>
        }
      />
    </div>
  );
}

/**
 * Casca do cardápio no modo demonstração, montada pelo LAYOUT da rota (e não
 * por cada página) para sobreviver à navegação entre o cardápio e o prato: é
 * isso que mantém a sacola aberta ao voltar de uma edição e o toast vivo
 * depois de "Adicionar". É a mesma casca do cardápio servido pelo banco
 * (StoreFrame): só entra a faixa avisando que os dados vivem no navegador.
 */
export function DemoStoreLayout({ slug, children }: { slug: string; children: React.ReactNode }) {
  const state = useDemoState();
  const data = findPublishedStore(state, slug);
  const onItem = usePathname().includes('/item/');
  // Enquanto lê o cardápio do navegador: o esqueleto da tela que vai aparecer.
  if (!state.ready) return onItem ? <ItemSkeleton /> : <StoreSkeleton />;
  if (!data) return <NotFound slug={slug} />;

  return (
    <StoreFrame business={data.business} menu={data.menu} notice={<DemoBanner compact />}>
      {children}
    </StoreFrame>
  );
}

/** Cardápio público lido do navegador. Carregamento e 404 são do layout. */
export function DemoStorePage({ slug }: { slug: string }) {
  const state = useDemoState();
  const locale = useLocale();
  const data = findPublishedStore(state, slug);
  if (!data) return null;

  const { business, menu } = data;
  const categories = visibleMenu(menu);

  return (
    <>
      <JsonLd
        id={`ld-store-${business.slug}`}
        data={graph(
          businessSchema(business, [], locale),
          menuSchema(business, categories, locale),
          breadcrumbSchema([
            { name: platform.name, path: '/' },
            { name: business.name, path: `/r/${business.slug}` },
          ]),
        )}
      />

      <StoreMenu business={business} categories={categories} />
    </>
  );
}

/** Página de um prato, também lida do navegador. */
export function DemoStoreItemPage({ slug, itemSlug }: { slug: string; itemSlug: string }) {
  const state = useDemoState();
  const data = findPublishedStore(state, slug);
  if (!data) return null;

  const found = findItemBySlug(data.menu, itemSlug);
  // A mesma tela do 404 de prato do cardápio com banco: dentro da casca, com o "‹".
  if (!found) return <ItemMissing />;

  const { business } = data;
  const { item, category } = found;

  return (
    <>
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
    </>
  );
}
