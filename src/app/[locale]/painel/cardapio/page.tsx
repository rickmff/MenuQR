import { DemoMenuManager } from '@/components/demo/demo-pages';
import { demoMode } from '@/lib/demo/config';
import { MenuEditor } from '@/components/painel/menu-editor';
import { CustomerViewLink } from '@/components/painel/customer-view-link';
import { PanelHeader, PanelPage } from '@/components/painel/panel-page';
import { countItems } from '@/lib/menu-utils';
import { requireBusiness } from '@/server/auth/guards';
import { getMenu } from '@/server/repositories/menu';

export const metadata = { title: 'Cardápio', robots: { index: false } };

export default async function MenuManagerPage() {
  if (demoMode) return <DemoMenuManager />;

  const { business } = await requireBusiness('/painel/cardapio');
  const menu = await getMenu(business.id);

  return (
    <PanelPage>
      <PanelHeader
        title="Cardápio"
        description={`${menu.length} ${menu.length === 1 ? 'categoria' : 'categorias'} · ${countItems(menu)} ${
          countItems(menu) === 1 ? 'item' : 'itens'
        }`}
        actions={<CustomerViewLink slug={business.slug} published={business.published} />}
      />

      <MenuEditor businessId={business.id} menu={menu} />
    </PanelPage>
  );
}
