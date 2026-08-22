import { notFound } from 'next/navigation';
import { demoMode } from '@/lib/demo/config';
import { StoreFrame } from '@/components/store/store-frame';
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
  // No modo demonstração a própria página monta a casca (dados no navegador).
  if (demoMode) return children;

  const { slug } = await params;
  const data = await loadPublishedStore(slug);
  if (!data) notFound();

  return (
    <StoreFrame business={data.business} menu={data.menu}>
      {children}
    </StoreFrame>
  );
}
