import { ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import { CopyLink } from '@/components/painel/copy-link';
import { OnboardingGuide } from '@/components/painel/onboarding-guide';
import { PublishToggle } from '@/components/painel/publish-toggle';
import { ShareButton } from '@/components/share-button';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/tag';

/**
 * A tela de compartilhar tem um objetivo só: levar o cardápio até o cliente.
 * Por isso ela carrega o link, o QR e — porque nenhum dos dois funciona antes
 * de publicar — o estado de publicação. Números, pendências e configuração
 * moram nas outras abas.
 *
 * Serve ao painel com banco e ao modo demonstração, que só diferem nos dados.
 */
export function SharePanel({
  businessId,
  businessName,
  slug,
  publicUrl,
  published,
  blockedReason,
  shareUrl,
  qr,
}: {
  businessId: string;
  businessName: string;
  slug: string;
  publicUrl: string;
  published: boolean;
  blockedReason?: string | null;
  /** No modo demonstração o link carrega o cardápio dentro dele. */
  shareUrl?: string;
  /** O QR vem pronto: com banco é gerado no servidor; no demo, no navegador. */
  qr: ReactNode;
}) {
  const url = shareUrl ?? publicUrl;

  return (
    <div className="space-y-6">
      <OnboardingGuide businessId={businessId} />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h4 font-bold text-gray-700">Compartilhar cardápio</h1>
          <p className="mt-2 flex items-center gap-2 text-body2 text-gray-600">
            {businessName}
            <Tag tone={published ? 'positive' : 'neutral'}>{published ? 'No ar' : 'Rascunho'}</Tag>
          </p>
        </div>
        <PublishToggle businessId={businessId} published={published} blockedReason={blockedReason} />
      </header>

      {!published && (
        <Card padding="sm" className="bg-warning-bg">
          <p className="text-body2 text-gray-700">
            O link e o QR code abaixo já são os definitivos, mas só abrem depois que você publicar. O
            endereço não muda ao publicar: o QR que você imprimir agora continua valendo.
          </p>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr] lg:gap-6">
        <Card padding="md">
          <h2 className="text-subtitle font-bold text-gray-700">Link do cardápio</h2>
          <p className="mt-1 text-body2 text-gray-600">
            Para a bio do Instagram, o status do WhatsApp e o Google.
          </p>

          <p className="mt-4 break-all rounded-sm bg-gray-50 px-4 py-3 font-mono text-body2 text-gray-700">
            {url}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <CopyLink url={url} />
            <ShareButton
              variant="button"
              url={url}
              title={businessName}
              text={`Confira o cardápio do ${businessName} e peça pelo WhatsApp`}
            />
            {published && (
              <Button
                href={`/r/${slug}`}
                target="_blank"
                rel="noopener"
                variant="secondary"
                size="sm"
                leading={<ExternalLink className="size-4" />}
              >
                Abrir
              </Button>
            )}
          </div>
        </Card>

        <Card padding="md">
          <h2 className="text-subtitle font-bold text-gray-700">QR code</h2>
          <p className="mt-1 text-body2 text-gray-600">Para a mesa, a vitrine e a embalagem.</p>
          <div className="mt-5">{qr}</div>
        </Card>
      </div>
    </div>
  );
}
