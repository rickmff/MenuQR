import { DemoDashboard } from '@/components/demo/demo-pages';
import { QrCode } from '@/components/painel/qr-code';
import { SharePanel } from '@/components/painel/share-panel';
import { demoMode } from '@/lib/demo/config';
import { describePublishBlocker, publishBlocker } from '@/lib/menu-utils';
import { getUiText } from '@/lib/ui-text-server';
import { absoluteUrl } from '@/lib/site';
import { requireBusiness } from '@/server/auth/guards';
import { getMenu } from '@/server/repositories/menu';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'painel' });
  return { title: t('meta.share') };
}

/** Primeira aba do painel: o link e o QR que levam o cardápio ao cliente. */
export default async function DashboardHome() {
  if (demoMode) return <DemoDashboard />;

  const { business } = await requireBusiness();
  const menu = await getMenu(business.id);

  return (
    <SharePanel
      businessId={business.id}
      businessName={business.name}
      slug={business.slug}
      publicUrl={absoluteUrl(`/r/${business.slug}`)}
      published={business.published}
      blockedReason={describePublishBlocker(publishBlocker(business, menu), await getUiText())}
      qr={<QrCode url={absoluteUrl(`/r/${business.slug}`)} />}
    />
  );
}
