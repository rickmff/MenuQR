import { notFound } from 'next/navigation';
import { ItemForm } from '@/components/painel/item-form';
import { requireBusiness } from '@/server/auth/guards';
import { getItem, getMenu } from '@/server/repositories/menu';

export const metadata = { title: 'Editar item', robots: { index: false } };

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { business } = await requireBusiness('/painel/cardapio');
  const { id } = await params;

  const [item, menu] = await Promise.all([getItem(id, business.id), getMenu(business.id)]);
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold">Editar item</h1>
      <p className="mt-2 text-charcoal-500">{item.name}</p>

      <div className="mt-8">
        <ItemForm businessId={business.id} categories={menu} item={item} />
      </div>
    </div>
  );
}
