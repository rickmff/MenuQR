import { notFound } from 'next/navigation';
import { DemoPreviewLayout } from '@/components/demo/demo-pages';
import { PanelPage } from '@/components/painel/panel-page';
import { PREVIEW_PATH, PreviewFrame } from '@/components/painel/preview-frame';
import { demoMode } from '@/lib/demo/config';
import { requireBusiness } from '@/server/auth/guards';
import { loadStoreForPreview } from '@/server/store-data';

/**
 * A casca da prévia fica no LAYOUT, e não em cada página, pelo mesmo motivo do
 * cardápio público: ela sobrevive à troca entre o cardápio e o prato. É isso
 * que mantém o toast depois de "Adicionar", a sacola aberta ao voltar de uma
 * edição e a rolagem da moldura. As páginas desenham só o miolo.
 */
export default async function PreviewLayout({ children }: { children: React.ReactNode }) {
  if (demoMode) return <DemoPreviewLayout>{children}</DemoPreviewLayout>;

  const { business: owned } = await requireBusiness(PREVIEW_PATH);
  const data = await loadStoreForPreview(owned.slug);
  if (!data) notFound();

  return (
    <PanelPage>
      <PreviewFrame business={data.business} menu={data.menu}>
        {children}
      </PreviewFrame>
    </PanelPage>
  );
}
