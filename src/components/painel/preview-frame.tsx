import { StoreFrame } from '@/components/store/store-frame';
import { Button } from '@/components/ui/button';
import { NavIcon } from '@/components/ui/button-icons';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/tag';
import type { Business, MenuCategory } from '@/lib/types';

/** Raiz dos links do cardápio quando ele é visto por dentro do painel. */
export const PREVIEW_PATH = '/painel/previa';

/**
 * Moldura da prévia: a MESMA casca do cardápio público (`StoreFrame embedded`),
 * dentro de um "aparelho" que rola por dentro, com todos os links presos em
 * `/painel/previa`. Em rascunho o endereço público responde 404 de propósito —
 * se a prévia apontasse para ele, clicar num prato tiraria o lojista do painel
 * direto para uma página de erro.
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
        <Button href="/painel" variant="text" size="sm" className="ml-auto" after={<NavIcon />}>
          Voltar ao painel
        </Button>
      </Card>

      <StoreFrame business={business} menu={menu} basePath={PREVIEW_PATH} embedded>
        {children}
      </StoreFrame>
    </div>
  );
}
