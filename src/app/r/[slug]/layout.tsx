import { notFound } from 'next/navigation';
import { CartDrawer } from '@/components/store/cart-drawer';
import { StoreFooter } from '@/components/store/store-footer';
import { StoreHeader } from '@/components/store/store-header';
import { StoreProvider } from '@/components/store/store-provider';
import { normalizeHexColor, readableTextColor } from '@/lib/colors';
import { loadPublishedStore } from '@/server/store-data';

/** O cardápio é servido estático e revalidado quando o lojista salva algo. */
export const revalidate = 300;

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await loadPublishedStore(slug);
  if (!data) notFound();

  const { business, menu } = data;
  const brand = normalizeHexColor(business.brandColor);

  return (
    <StoreProvider business={business} menu={menu}>
      {/* A cor da marca vira variável CSS: todo o cardápio se adapta a ela. */}
      <div
        className="flex min-h-dvh flex-col"
        style={
          {
            '--tenant-brand': brand,
            '--tenant-brand-text': readableTextColor(brand),
            '--tenant-brand-ink': brand,
          } as React.CSSProperties
        }
      >
        <StoreHeader />
        <main id="conteudo" className="flex-1">
          {children}
        </main>
        <StoreFooter business={business} />
        <CartDrawer />
      </div>
    </StoreProvider>
  );
}
