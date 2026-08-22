import { notFound } from 'next/navigation';
import { DemoItemEditor } from '@/components/demo/demo-pages';
import { demoMode } from '@/lib/demo/config';
import { ItemForm } from '@/components/painel/item-form';
import { requireBusiness } from '@/server/auth/guards';
import { getItem, getMenu } from '@/server/repositories/menu';

export const metadata = { title: 'Editar item', robots: { index: false } };

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (demoMode) return <DemoItemEditor itemId={id} />;

  const { business } = await requireBusiness('/painel/cardapio');

  const [item, menu] = await Promise.all([getItem(id, business.id), getMenu(business.id)]);
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold">Editar item</h1>
      <p className="mt-2 text-ink-500">{item.name}</p>

      <div className="mt-8">
        <ItemForm businessId={business.id} categories={menu} item={item} />
      </div>
    </div>
  );
}
