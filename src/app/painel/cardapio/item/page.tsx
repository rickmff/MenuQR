import Link from 'next/link';
import { ItemForm } from '@/components/painel/item-form';
import { requireBusiness } from '@/server/auth/guards';
import { getMenu } from '@/server/repositories/menu';

export const metadata = { title: 'Novo item', robots: { index: false } };

export default async function NewItemPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { business } = await requireBusiness('/painel/cardapio');
  const menu = await getMenu(business.id);
  const { categoria } = await searchParams;

  if (menu.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-card border border-cream-200 bg-white p-8 text-center">
        <h1 className="text-2xl font-semibold">Crie uma categoria primeiro</h1>
        <p className="mt-2 text-charcoal-500">
          Os itens ficam organizados em categorias, como “Hambúrgueres” ou “Bebidas”.
        </p>
        <Link
          href="/painel/cardapio"
          className="mt-6 inline-block rounded-xl bg-ember-500 px-6 py-3 font-semibold text-white hover:bg-ember-600"
        >
          Voltar ao cardápio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold">Novo item</h1>
      <p className="mt-2 text-charcoal-500">
        Preencha os dados do prato. Você pode ajustar tudo depois, inclusive esgotar o item em um clique.
      </p>

      <div className="mt-8">
        <ItemForm businessId={business.id} categories={menu} defaultCategoryId={categoria} />
      </div>
    </div>
  );
}
