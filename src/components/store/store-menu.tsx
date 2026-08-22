import { MenuBrowser } from './menu-browser';
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
}: {
  business: Business;
  categories: MenuCategory[];
  floatingCart?: boolean;
}) {
  return (
    <>
      {/* O nome já aparece no cabeçalho; aqui o título fica só para buscadores
          e leitores de tela, mantendo um h1 por página. */}
      <h1 className="sr-only">Cardápio do {business.name}</h1>

      <div className={`container-page pt-2 ${floatingCart ? 'pb-32' : 'pb-10'}`}>
        {categories.length === 0 ? (
          <p className="py-24 text-center text-ink-500">
            Este cardápio ainda não tem itens publicados.
          </p>
        ) : (
          <MenuBrowser categories={categories.map(toCardCategory)} basePath={`/r/${business.slug}`} />
        )}
      </div>
    </>
  );
}
