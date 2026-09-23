import type { ReactNode } from 'react';
import { CopyLink } from '@/components/painel/copy-link';
import { PanelHeader, PanelPage } from '@/components/painel/panel-page';
import { PublishToggle } from '@/components/painel/publish-toggle';
import { ShareButton } from '@/components/share-button';
import { Button } from '@/components/ui/button';
import { ExternalIcon } from '@/components/ui/button-icons';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/tag';

/**
 * A tela de compartilhar tem um objetivo só: levar o cardápio até o cliente.
 * Por isso ela carrega o link, o QR e — porque nenhum dos dois funciona antes
 * de publicar — o estado de publicação. Números, pendências e configuração
 * moram nas outras abas; o que ainda falta configurar é assunto do guia que
 * flutua sobre o painel inteiro (`SetupWidget`).
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
    <PanelPage>
      <PanelHeader
        title="Compartilhar cardápio"
        description={
          <>
            {businessName}
            <Tag tone={published ? 'positive' : 'neutral'}>{published ? 'No ar' : 'Rascunho'}</Tag>
          </>
        }
        actions={
          <PublishToggle businessId={businessId} published={published} blockedReason={blockedReason} />
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
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
                after={<ExternalIcon />}
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
    </PanelPage>
  );
}
