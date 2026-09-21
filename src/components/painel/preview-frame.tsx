import Link from 'next/link';
import { CartDrawer } from '@/components/store/cart-drawer';
import { StoreFooter } from '@/components/store/store-footer';
import { StoreHeader } from '@/components/store/store-header';
import { StoreProvider } from '@/components/store/store-provider';
import type { Business, MenuCategory } from '@/lib/types';

/** Raiz dos links do cardápio quando ele é visto por dentro do painel. */
export const PREVIEW_PATH = '/painel/previa';

/**
 * Moldura da prévia: a mesma casca do cardápio público, com todos os links
 * presos em `/painel/previa`. Em rascunho o endereço público responde 404 de
 * propósito — se a prévia apontasse para ele, clicar num prato tiraria o lojista
 * do painel direto para uma página de erro.
 *
 * Só a barra flutuante da sacola fica de fora, porque aqui o cardápio está
 * dentro do painel.
 */
export function PreviewFrame({
  business,
  menu,
  children,
}: {
  business: Business;
  menu: MenuCategory[];
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="surface mb-6 flex flex-wrap items-center gap-3 p-4">
        <span className="rounded-sm bg-ink-100 px-2 py-1 text-caption font-bold uppercase tracking-wide text-ink-700">
          Prévia
        </span>
        <p className="text-body2 text-ink-500">
          {business.published
            ? 'Este é o cardápio que os clientes veem agora.'
            : 'Só você enxerga esta página. Publique para liberar o link público.'}
        </p>
        <Link href="/painel" className="ml-auto text-body2 font-semibold text-flame-600 hover:text-flame-700">
          Voltar ao painel
        </Link>
      </div>

      <StoreProvider business={business} menu={menu} basePath={PREVIEW_PATH}>
        <div className="overflow-hidden rounded-card border border-ink-200 bg-ink-50">
          <StoreHeader />
          {children}
          <StoreFooter business={business} />
          <CartDrawer />
        </div>
      </StoreProvider>
    </div>
  );
}
