import { UtensilsCrossed } from 'lucide-react';
import { MenuBrowser } from './menu-browser';
import { SearchAware } from './search-aware';
import { StoreCover } from './store-cover';
import { StoreScreen } from './store-screen';
import { StoreIdentity } from './store-identity';
import { EmptyState } from '@/components/ui/empty-state';
import { toCardCategory } from '@/lib/menu-utils';
import type { Business, MenuCategory } from '@/lib/types';

/**
 * A tela do cardápio, de cima para baixo como nos apps de delivery: a capa, a
 * folha branca que sobe sobre ela com a identidade da loja (logo, nome,
 * status, Entrega | Retirada, tempo e taxa) e, na segunda dobra, as abas e a
 * lista.
 *
 * Usado pelo cardápio servido pelo banco, pelo modo demonstração e pela prévia
 * do painel — é o que garante que o cardápio de exemplo e os cardápios gerados
 * pelos lojistas sejam exatamente a mesma tela.
 */
export function StoreMenu({
  business,
  categories,
  /** Na prévia os pratos abrem dentro do painel: o endereço público dá 404 em rascunho. */
  basePath = `/r/${business.slug}`,
}: {
  business: Business;
  categories: MenuCategory[];
  basePath?: string;
}) {
  return (
    // Um nó só dentro da transição: a tela inteira desliza como uma peça.
    <StoreScreen>
      <div>
      {/* O nome aparece grande na identidade, mas como parágrafo: o título da
          página fica para buscadores e leitores de tela, um h1 por página. */}
      <h1 className="sr-only">Cardápio do {business.name}</h1>

      <SearchAware>
        <StoreCover cover={business.cover} alt={`Capa de ${business.name}`} />
      </SearchAware>

      <div className="relative -mt-6 rounded-t-xl bg-white lg:rounded-none">
        <div className="mx-auto w-full max-w-page px-4 md:px-6 lg:px-8">
          <SearchAware>
            <StoreIdentity />
          </SearchAware>

          {categories.length === 0 ? (
            <EmptyState
              icon={<UtensilsCrossed className="size-12" />}
              title="Este cardápio ainda não tem itens publicados."
            />
          ) : (
            <MenuBrowser categories={categories.map(toCardCategory)} basePath={basePath} />
          )}
        </div>
      </div>
      </div>
    </StoreScreen>
  );
}
