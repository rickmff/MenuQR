import { CartSheet } from '@/components/store/cart/cart-sheet';
import { HideOnItem } from '@/components/store/hide-on-item';
import { StoreFooter } from '@/components/store/store-footer';
import { StoreHeader } from '@/components/store/store-header';
import { StoreProvider } from '@/components/store/store-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/tag';
import { ToastProvider } from '@/components/ui/toast';
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
    <div className="space-y-6">
      <Card padding="sm" className="flex flex-wrap items-center gap-3">
        <Tag size="md">Prévia</Tag>
        <p className="text-body2 text-gray-600">
          {business.published
            ? 'Este é o cardápio que os clientes veem agora.'
            : 'Só você enxerga esta página. Publique para liberar o link público.'}
        </p>
        <Button href="/painel" variant="text" size="sm" className="ml-auto">
          Voltar ao painel
        </Button>
      </Card>

      <StoreProvider business={business} menu={menu} basePath={PREVIEW_PATH}>
        <ToastProvider>
          <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
            <StoreHeader />
            {children}
            <HideOnItem>
              <StoreFooter business={business} />
            </HideOnItem>
            <CartSheet />
          </div>
        </ToastProvider>
      </StoreProvider>
    </div>
  );
}
