'use client';

import { CalendarClock, Info, TriangleAlert } from 'lucide-react';
import { usePathname } from 'next/navigation';
import type { BillingNotice } from '@/components/painel/billing-notice';
import { Banner, type BannerTone } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';

const ICONS: Record<BillingNotice['tone'], typeof Info> = {
  info: Info,
  warning: TriangleAlert,
  error: TriangleAlert,
  neutral: CalendarClock,
};

const SUBSCRIPTION_PATH = '/painel/assinatura';

/**
 * Aviso da assinatura no topo do painel. Some na própria tela de assinatura,
 * que já diz tudo isso com o QR ao lado — mesmo truque do guia de
 * configuração, que se esconde em "Dados do negócio".
 */
export function BillingBanner({ notice }: { notice: BillingNotice | null }) {
  const pathname = usePathname();
  if (!notice || pathname === SUBSCRIPTION_PATH) return null;

  const Icon = ICONS[notice.tone];
  const tone: BannerTone = notice.tone;
  return (
    <Banner tone={tone} icon={<Icon className="size-5" />} title={notice.title} role={tone === 'error' ? 'alert' : 'status'}>
      <p>{notice.message}</p>
      <div className="mt-2">
        <Button href={SUBSCRIPTION_PATH} variant="text" size="sm">
          {notice.label}
        </Button>
      </div>
    </Banner>
  );
}
