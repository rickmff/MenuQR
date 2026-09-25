import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { CopyLink } from '@/components/painel/copy-link';
import { CustomerViewLink } from '@/components/painel/customer-view-link';
import { PanelHeader, PanelPage } from '@/components/painel/panel-page';
import { PublishToggle } from '@/components/painel/publish-toggle';
import { ShareButton } from '@/components/share-button';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { ExternalIcon } from '@/components/ui/button-icons';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/tag';
import { demoMode } from '@/lib/demo/config';

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
  const t = useTranslations('painel.share');
  const url = shareUrl ?? publicUrl;

  return (
    <PanelPage>
      <PanelHeader
        title={t('title')}
        description={
          <>
            {businessName}
            <Tag tone={published ? 'positive' : 'neutral'}>{published ? t('live') : t('draft')}</Tag>
          </>
        }
        actions={
          // Em rascunho, ver o que vai ao ar serve a quem está prestes a publicar
          // (D16); publicado, o "Abrir" do link faz esse papel e este some.
          // Publicar fica à direita, como toda confirmação (D24). Abaixo de `sm`
          // os dois não cabem lado a lado sem cortar o rótulo: viram uma coluna
          // de largura cheia (a grade estica cada filho) com Publicar embaixo,
          // perto do polegar — antes desciam encostados à direita, cada um com
          // a sua largura. O Tooltip do Publicar bloqueado embrulha o botão num
          // `span`, que estica mas não estica o botão: daí o seletor do filho.
          <div className="grid w-full gap-2 max-sm:[&>span>button]:w-full sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
            {!published && <CustomerViewLink slug={slug} published={false} />}
            <PublishToggle
              businessId={businessId}
              businessName={businessName}
              published={published}
              blockedReason={blockedReason}
            />
          </div>
        }
      />

      {/* A Tag diz o estado; a frase, a consequência. Copiar e compartilhar
          continuam valendo (o link vai para a arte da embalagem antes de abrir).
          Tom `info`, o do aviso informativo no painel (a sugestão de horários,
          a cobrança): o `neutral` é `gray-50`, some sobre o papel do painel e
          deixava só o recuo do texto. No demo o link publicado leva o cardápio
          no próprio endereço e continua abrindo em quem já o recebeu; o aviso
          diz isso em vez de prometer que nada abre. */}
      {!published && (
        <Banner tone="info" icon={<Info className="size-5" />}>
          {t(demoMode ? 'draftNoticeDemo' : 'draftNotice')}
        </Banner>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card padding="md">
          <h2 className="text-subtitle font-bold text-gray-700">{t('linkTitle')}</h2>
          <p className="mt-1 text-body2 text-gray-600">{t('linkText')}</p>

          <p className="mt-4 break-all rounded-sm bg-gray-50 px-4 py-3 font-mono text-body2 text-gray-700">
            {url}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <CopyLink url={url} />
            <ShareButton
              variant="button"
              url={url}
              title={businessName}
              text={t('shareText', { name: businessName })}
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
                {t('open')}
              </Button>
            )}
          </div>
        </Card>

        <Card padding="md">
          <h2 className="text-subtitle font-bold text-gray-700">{t('qrTitle')}</h2>
          <p className="mt-1 text-body2 text-gray-600">{t('qrText')}</p>
          <div className="mt-5">{qr}</div>
        </Card>
      </div>
    </PanelPage>
  );
}
