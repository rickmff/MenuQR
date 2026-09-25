import { useTranslations } from 'next-intl';
import { StoreFrame } from '@/components/store/store-frame';
import { Button } from '@/components/ui/button';
import { NavIcon } from '@/components/ui/button-icons';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/tag';
import { demoMode } from '@/lib/demo/config';
import type { Business, MenuCategory } from '@/lib/types';

/** Raiz dos links do cardápio quando ele é visto por dentro do painel. */
export const PREVIEW_PATH = '/painel/previa';

/**
 * Moldura da prévia: a MESMA casca do cardápio público (`StoreFrame embedded`),
 * dentro de um "aparelho" que rola por dentro, com todos os links presos em
 * `/painel/previa`. Em rascunho o endereço público mostra o aviso de cardápio
 * fora do ar — se a prévia apontasse para ele, clicar num prato tiraria o
 * lojista do painel direto para esse aviso.
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
  const t = useTranslations('painel.preview');
  // "Só você enxerga esta página" é verdade com banco. No demo, o link copiado
  // quando o cardápio estava no ar leva o cardápio no endereço e continua
  // abrindo em quem o recebeu: a frase do rascunho diz isso.
  const draftText = demoMode ? t('draftDemo') : t('draft');
  return (
    <div className="space-y-6">
      <Card padding="sm" className="flex flex-wrap items-center gap-3">
        <Tag size="md">{t('tag')}</Tag>
        <p className="text-body2 text-gray-600">
          {business.published ? t('published') : draftText}
        </p>
        <Button href="/painel" variant="text" size="sm" className="ml-auto" after={<NavIcon />}>
          {t('backToDashboard')}
        </Button>
      </Card>

      <StoreFrame business={business} menu={menu} basePath={PREVIEW_PATH} embedded>
        {children}
      </StoreFrame>
    </div>
  );
}
