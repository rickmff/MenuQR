import { notFound } from 'next/navigation';
import { DemoPreview } from '@/components/demo/demo-pages';
import { PREVIEW_PATH, PreviewFrame } from '@/components/painel/preview-frame';
import { StoreMenu } from '@/components/store/store-menu';
import { demoMode } from '@/lib/demo/config';
import { visibleMenu } from '@/lib/menu-utils';
import { requireBusiness } from '@/server/auth/guards';
import { loadStoreForPreview } from '@/server/store-data';

export const metadata = { title: 'Prévia do cardápio', robots: { index: false, follow: false } };

/**
 * Prévia do cardápio dentro do painel — funciona mesmo antes de publicar,
 * e só o dono do negócio consegue acessar.
 */
export default async function PreviewPage() {
  if (demoMode) return <DemoPreview />;

  const { business: owned } = await requireBusiness(PREVIEW_PATH);
  const data = await loadStoreForPreview(owned.slug);
  if (!data) notFound();

  const { business, menu } = data;

  return (
    <div className="-my-10">
      {/* Mesma tela do cardápio público (StoreMenu): o que o lojista vê aqui é
          exatamente o que o cliente vê no link. */}
      <PreviewFrame business={business} menu={menu}>
        <StoreMenu
          business={business}
          categories={visibleMenu(menu)}
          floatingCart={false}
          basePath={PREVIEW_PATH}
        />
      </PreviewFrame>
    </div>
  );
}
