import Link from 'next/link';
import { DemoPreview } from '@/components/demo/demo-pages';
import { demoMode } from '@/lib/demo/config';
import { notFound } from 'next/navigation';
import { CartDrawer } from '@/components/store/cart-drawer';
import { StoreFooter } from '@/components/store/store-footer';
import { StoreHeader } from '@/components/store/store-header';
import { StoreMenu } from '@/components/store/store-menu';
import { StoreProvider } from '@/components/store/store-provider';
import { brandStyle } from '@/components/store/store-frame';
import { visibleMenu } from '@/lib/menu-utils';
import { requireBusiness } from '@/server/auth/guards';
import { loadStoreForPreview } from '@/server/store-data';

export const metadata = { title: 'Prévia do cardápio', robots: { index: false, follow: false } };

/**
 * Prévia do cardápio dentro do painel — funciona mesmo antes de publicar,
 * e só o dono do negócio consegue acessar.
 */
export default async function PreviewPage() {
  if (demoMode) return <DemoPreview />;

  const { business: owned } = await requireBusiness('/painel/previa');
  const data = await loadStoreForPreview(owned.slug);
  if (!data) notFound();

  const { business, menu } = data;
  const categories = visibleMenu(menu);

  return (
    <div className="-my-10">
      <div className="mb-6 flex flex-wrap items-center gap-3 surface p-4">
        <span className="rounded-md bg-ink-100 px-2 py-1 text-xs font-bold uppercase tracking-wide text-ink-700">
          Prévia
        </span>
        <p className="text-sm text-ink-500">
          {business.published
            ? 'Este é o cardápio que os clientes veem agora.'
            : 'Só você enxerga esta página. Publique para liberar o link público.'}
        </p>
        <Link href="/painel" className="ml-auto text-sm font-semibold text-flame-600 hover:text-flame-700">
          Voltar ao painel
        </Link>
      </div>

      {/* Mesma tela do cardápio público (StoreMenu): o que o lojista vê aqui é
          exatamente o que o cliente vê no link. Só a barra flutuante da sacola
          fica de fora, porque aqui o cardápio está dentro do painel. */}
      <StoreProvider business={business} menu={menu}>
        <div
          className="overflow-hidden rounded-card border border-ink-200 bg-ink-50"
          style={brandStyle(business)}
        >
          <StoreHeader />
          <StoreMenu business={business} categories={categories} floatingCart={false} />
          <StoreFooter business={business} />
          <CartDrawer />
        </div>
      </StoreProvider>
    </div>
  );
}
