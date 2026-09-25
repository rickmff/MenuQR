import { DemoItemEditor } from '@/components/demo/demo-pages';
import { demoMode } from '@/lib/demo/config';
import { ItemForm } from '@/components/painel/item-form';
import { PanelHeader, PanelPage } from '@/components/painel/panel-page';
import { Button } from '@/components/ui/button';
import { NavIcon } from '@/components/ui/button-icons';
import { Card } from '@/components/ui/card';
import { requireBusiness } from '@/server/auth/guards';
import { getMenu } from '@/server/repositories/menu';

export const metadata = { title: 'Novo item', robots: { index: false } };

export default async function NewItemPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria: categoriaDemo } = await searchParams;
  if (demoMode) return <DemoItemEditor categoryId={categoriaDemo} />;

  const { business } = await requireBusiness('/painel/cardapio');
  const menu = await getMenu(business.id);
  const { categoria } = await searchParams;

  if (menu.length === 0) {
    return (
      <PanelPage width="form">
        <Card padding="lg" className="text-center">
          <h1 className="text-h5 font-bold text-gray-700">Crie uma categoria primeiro</h1>
          <p className="mt-2 text-body2 text-gray-600">
            Os itens ficam organizados em categorias, como “Hambúrgueres” ou “Bebidas”.
          </p>
          <Button href="/painel/cardapio" className="mt-6" after={<NavIcon />}>
            Voltar ao cardápio
          </Button>
        </Card>
      </PanelPage>
    );
  }

  return (
    <PanelPage width="form">
      <PanelHeader
        title="Novo item"
        description="Preencha os dados do prato. Você pode ajustar tudo depois, inclusive esgotar o item em um clique."
      />

      <ItemForm businessId={business.id} categories={menu} defaultCategoryId={categoria} />
    </PanelPage>
  );
}
