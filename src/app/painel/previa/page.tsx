import { notFound } from 'next/navigation';
import { DemoPreview } from '@/components/demo/demo-pages';
import { PREVIEW_PATH } from '@/components/painel/preview-frame';
import { StoreMenu } from '@/components/store/store-menu';
import { demoMode } from '@/lib/demo/config';
import { visibleMenu } from '@/lib/menu-utils';
import { requireBusiness } from '@/server/auth/guards';
import { loadStoreForPreview } from '@/server/store-data';

export const metadata = { title: 'Prévia do cardápio', robots: { index: false, follow: false } };

/**
 * Prévia do cardápio dentro do painel — funciona mesmo antes de publicar,
 * e só o dono do negócio consegue acessar. A moldura vem do layout; aqui fica
 * a mesma tela do cardápio público (StoreMenu): o que o lojista vê é
 * exatamente o que o cliente vê no link.
 */
export default async function PreviewPage() {
  if (demoMode) return <DemoPreview />;

  const { business: owned } = await requireBusiness(PREVIEW_PATH);
  const data = await loadStoreForPreview(owned.slug);
  if (!data) notFound();

  return <StoreMenu business={data.business} categories={visibleMenu(data.menu)} basePath={PREVIEW_PATH} />;
}
