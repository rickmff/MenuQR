import Link from 'next/link';
import { DemoItemEditor } from '@/components/demo/demo-pages';
import { demoMode } from '@/lib/demo/config';
import { ItemForm } from '@/components/painel/item-form';
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
      <div className="mx-auto max-w-2xl surface p-8 text-center">
        <h1 className="text-2xl font-semibold">Crie uma categoria primeiro</h1>
        <p className="mt-2 text-ink-500">
          Os itens ficam organizados em categorias, como “Hambúrgueres” ou “Bebidas”.
        </p>
        <Link
          href="/painel/cardapio"
          className="mt-6 inline-block btn btn-primary"
        >
          Voltar ao cardápio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold">Novo item</h1>
      <p className="mt-2 text-ink-500">
        Preencha os dados do prato. Você pode ajustar tudo depois, inclusive esgotar o item em um clique.
      </p>

      <div className="mt-8">
        <ItemForm businessId={business.id} categories={menu} defaultCategoryId={categoria} />
      </div>
    </div>
  );
}
