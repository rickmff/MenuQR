'use client';

import { SearchX } from 'lucide-react';
import { DemoBanner } from '@/components/demo/demo-banner';
import { JsonLd } from '@/components/json-ld';
import { ItemDetail } from '@/components/store/item-detail';
import { StoreFrame } from '@/components/store/store-frame';
import { StoreMenu } from '@/components/store/store-menu';
import { Button } from '@/components/ui/button';
import { NavIcon } from '@/components/ui/button-icons';
import { EmptyState } from '@/components/ui/empty-state';
import { StoreSkeleton } from '@/components/ui/skeleton';
import { findPublishedStore, useDemoState } from '@/lib/demo/store';
import { findItemBySlug, visibleMenu } from '@/lib/menu-utils';
import { platform } from '@/lib/platform';
import { breadcrumbSchema, businessSchema, graph, menuItemSchema, menuSchema } from '@/lib/seo';

function NotFound({ slug }: { slug: string }) {
  return (
    <div className="mx-auto w-full max-w-narrow px-4 py-12">
      <EmptyState
        icon={<SearchX className="size-12" />}
        title="Cardápio não encontrado"
        description={`Não existe um cardápio publicado em /r/${slug} neste navegador, e este link não trouxe o cardápio junto. Sem banco de dados, o cardápio viaja dentro do endereço: peça a quem enviou para copiar o link outra vez no painel — o link completo é longo e alguns aplicativos cortam o final.`}
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button href="/r/sabor-e-brasa" after={<NavIcon />}>Ver o cardápio de exemplo</Button>
            <Button href="/" variant="secondary" after={<NavIcon />}>
              Voltar ao início
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
  if (!state.ready) return <StoreSkeleton />;
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
  const data = findPublishedStore(state, slug);
  if (!data) return null;

  const { business, menu } = data;
  const categories = visibleMenu(menu);

  return (
    <>
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
    </>
  );
}

/** Página de um prato, também lida do navegador. */
export function DemoStoreItemPage({ slug, itemSlug }: { slug: string; itemSlug: string }) {
  const state = useDemoState();
  const data = findPublishedStore(state, slug);
  if (!data) return null;

  const found = findItemBySlug(data.menu, itemSlug);
  if (!found) {
    return (
      <EmptyState
        icon={<SearchX className="size-12" />}
        title="Item não encontrado"
        description="Este prato não está neste cardápio."
        action={<Button href={`/r/${slug}`}>Voltar ao cardápio</Button>}
      />
    );
  }

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
