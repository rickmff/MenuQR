import { MenuBrowser } from './menu-browser';
import { OpeningBadge } from './opening-badge';
import { formatPrice } from '@/lib/format';
import { timeZoneForState } from '@/lib/hours';
import { toCardCategory } from '@/lib/menu-utils';
import type { Business, MenuCategory } from '@/lib/types';

/**
 * Miolo do cardápio: busca, abas de categoria e a lista de pratos.
 *
 * Usado pelo cardápio servido pelo banco, pelo modo demonstração e pela prévia
 * do painel — é o que garante que o cardápio de exemplo e os cardápios gerados
 * pelos lojistas sejam exatamente a mesma tela.
 */
export function StoreMenu({
  business,
  categories,
  /** Sem a barra flutuante da sacola (prévia do painel) não precisa da folga. */
  floatingCart = true,
  /** Na prévia os pratos abrem dentro do painel: o endereço público dá 404 em rascunho. */
  basePath = `/r/${business.slug}`,
}: {
  business: Business;
  categories: MenuCategory[];
  floatingCart?: boolean;
  basePath?: string;
}) {
  return (
    <>
      {/* O nome já aparece no cabeçalho; aqui o título fica só para buscadores
          e leitores de tela, mantendo um h1 por página. */}
      <h1 className="sr-only">Cardápio do {business.name}</h1>

      <div className={`container-page pt-2 ${floatingCart ? 'pb-32' : 'pb-10'}`}>
        {/* Aberto/fechado antes de montar o pedido — e não só ao abrir a sacola. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pb-1 pt-2 text-caption text-ink-500">
          <OpeningBadge hours={business.hours} timeZone={timeZoneForState(business.address.state)} />
          {business.delivery.enabled && business.delivery.minOrder > 0 && (
            <span>Pedido mínimo {formatPrice(business.delivery.minOrder)}</span>
          )}
          {!business.delivery.enabled && business.pickup.enabled && <span>Somente retirada no local</span>}
        </div>

        {categories.length === 0 ? (
          <p className="py-24 text-center text-ink-500">
            Este cardápio ainda não tem itens publicados.
          </p>
        ) : (
          <MenuBrowser categories={categories.map(toCardCategory)} basePath={basePath} />
        )}
      </div>
    </>
  );
}
