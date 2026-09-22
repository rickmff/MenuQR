import { redirect } from 'next/navigation';
import { DemoDashboard } from '@/components/demo/demo-pages';
import { QrCode } from '@/components/painel/qr-code';
import { SharePanel } from '@/components/painel/share-panel';
import { demoMode } from '@/lib/demo/config';
import { publishBlocker } from '@/lib/menu-utils';
import { absoluteUrl } from '@/lib/site';
import { requireUser } from '@/server/auth/guards';
import { getBusinessByOwner } from '@/server/repositories/businesses';
import { getMenu } from '@/server/repositories/menu';

export const metadata = { title: 'Compartilhar cardápio' };

/** Primeira aba do painel: o link e o QR que levam o cardápio ao cliente. */
export default async function DashboardHome() {
  if (demoMode) return <DemoDashboard />;

  const user = await requireUser();
  const business = await getBusinessByOwner(user.id);
  if (!business) redirect('/painel/comecar');

  const menu = await getMenu(business.id);

  return (
    <SharePanel
      businessId={business.id}
      businessName={business.name}
      slug={business.slug}
      publicUrl={absoluteUrl(`/r/${business.slug}`)}
      published={business.published}
      blockedReason={publishBlocker(business, menu)}
      qr={<QrCode url={absoluteUrl(`/r/${business.slug}`)} />}
    />
  );
}
