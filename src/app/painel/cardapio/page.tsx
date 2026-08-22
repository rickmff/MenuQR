import Link from 'next/link';
import { CategoryManager } from '@/components/painel/category-manager';
import { countItems } from '@/lib/menu-utils';
import { requireBusiness } from '@/server/auth/guards';
import { getMenu } from '@/server/repositories/menu';

export const metadata = { title: 'Cardápio', robots: { index: false } };

export default async function MenuManagerPage({
  searchParams,
}: {
  searchParams: Promise<{ salvo?: string }>;
}) {
  const { business } = await requireBusiness('/painel/cardapio');
  const menu = await getMenu(business.id);
  const { salvo } = await searchParams;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Cardápio</h1>
          <p className="mt-2 text-charcoal-500">
            {menu.length} {menu.length === 1 ? 'categoria' : 'categorias'} · {countItems(menu)}{' '}
            {countItems(menu) === 1 ? 'item' : 'itens'}
          </p>
        </div>
        {business.published && (
          <Link
            href={`/r/${business.slug}`}
            target="_blank"
            rel="noopener"
            className="rounded-xl border border-cream-200 bg-white px-5 py-2.5 text-sm font-semibold hover:border-ember-400"
          >
            Ver como o cliente vê ↗
          </Link>
        )}
      </header>

      {salvo && (
        <p
          role="status"
          className="mt-6 rounded-xl bg-whatsapp-500/12 px-4 py-3 text-sm font-medium text-whatsapp-600"
        >
          Item salvo. O cardápio publicado já está atualizado.
        </p>
      )}

      <div className="mt-8">
        <CategoryManager businessId={business.id} menu={menu} />
      </div>
    </div>
  );
}
