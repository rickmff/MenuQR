import { DemoMenuManager } from '@/components/demo/demo-pages';
import { demoMode } from '@/lib/demo/config';
import { CategoryManager } from '@/components/painel/category-manager';
import { CustomerViewLink } from '@/components/painel/customer-view-link';
import { PanelHeader, PanelPage } from '@/components/painel/panel-page';
import { countItems } from '@/lib/menu-utils';
import { requireBusiness } from '@/server/auth/guards';
import { getMenu } from '@/server/repositories/menu';

export const metadata = { title: 'Cardápio', robots: { index: false } };

export default async function MenuManagerPage({
  searchParams,
}: {
  searchParams: Promise<{ salvo?: string }>;
}) {
  const { salvo: salvoDemo } = await searchParams;
  if (demoMode) return <DemoMenuManager saved={Boolean(salvoDemo)} />;

  const { business } = await requireBusiness('/painel/cardapio');
  const menu = await getMenu(business.id);
  const { salvo } = await searchParams;

  return (
    <PanelPage>
      <PanelHeader
        title="Cardápio"
        description={`${menu.length} ${menu.length === 1 ? 'categoria' : 'categorias'} · ${countItems(menu)} ${
          countItems(menu) === 1 ? 'item' : 'itens'
        }`}
        actions={<CustomerViewLink slug={business.slug} published={business.published} />}
      />

      {salvo && (
        <p
          role="status"
          className="rounded-sm bg-success-bg px-4 py-3 text-body2 font-medium text-gray-700"
        >
          Item salvo. O cardápio publicado já está atualizado.
        </p>
      )}

      <CategoryManager businessId={business.id} menu={menu} />
    </PanelPage>
  );
}
