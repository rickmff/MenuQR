'use client';

import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { BusinessForm } from '@/components/painel/business-form';
import type { BusinessSection } from '@/components/painel/business-sections';
import { MenuEditor } from '@/components/painel/menu-editor';
import { ItemForm } from '@/components/painel/item-form';
import { OnboardingForm } from '@/components/painel/onboarding-form';
import { CustomerViewLink } from '@/components/painel/customer-view-link';
import { Notice } from '@/components/painel/account-parts';
import { PanelHeader, PanelPage } from '@/components/painel/panel-page';
import { PREVIEW_PATH, PreviewFrame } from '@/components/painel/preview-frame';
import { ItemDetail } from '@/components/store/item-detail';
import { ItemMissing } from '@/components/store/item-missing';
import { SharePanel } from '@/components/painel/share-panel';
import { QrCodeClient } from '@/components/demo/qr-code-client';
import { useShareUrl } from '@/components/store/use-share-url';
import { Button } from '@/components/ui/button';
import { NavIcon } from '@/components/ui/button-icons';
import { Card } from '@/components/ui/card';
import { StoreMenu } from '@/components/store/store-menu';
import { copySampleMenuInto } from '@/lib/demo/store';
import { businessOfUser, currentUser, menuOfBusiness, useDemoState } from '@/lib/demo/store';
import { countItems, describePublishBlocker, findItemBySlug, publishBlocker, visibleMenu } from '@/lib/menu-utils';
import { useUiText } from '@/lib/use-ui-text';
import { siteUrl } from '@/lib/site';

/** Enquanto o negócio não existe, o lugar é o cadastro. */
function useOwnedBusiness() {
  const state = useDemoState();
  const user = currentUser(state);
  const business = businessOfUser(state, user?.id ?? null);
  const menu = business ? menuOfBusiness(state, business.id) : [];
  return { state, ready: state.ready, user, business, menu };
}

export function DemoOnboarding() {
  const { ready, user, business } = useOwnedBusiness();
  const router = useRouter();
  // O mesmo texto do cadastro com banco: a linha de apoio diz o que vem
  // depois, na ordem do guia, e não pode divergir entre os dois modos.
  const t = useTranslations('painel.onboarding');

  useEffect(() => {
    if (ready && business) router.replace('/painel');
  }, [ready, business, router]);

  if (!ready || !user) return null;

  return (
    <PanelPage width="form">
      <PanelHeader
        title={t('title')}
        description={t('description')}
      />

      <Card>
        <OnboardingForm siteUrl={siteUrl.replace(/^https?:\/\//, '')} />
      </Card>
    </PanelPage>
  );
}

export function DemoDashboard() {
  const { ready, user, business, menu } = useOwnedBusiness();
  const router = useRouter();

  useEffect(() => {
    if (ready && user && !business) router.replace('/painel/comecar');
  }, [ready, user, business, router]);

  /*
   * Sem banco, o link que leva o cardápio dentro (#c=…) abre em qualquer
   * navegador — e a tela promete que, em rascunho, link e QR só abrem depois
   * de publicar. Então o cardápio só entra no link publicado; em rascunho vão
   * o endereço curto e o QR dele, que até publicar mostram "fora do ar" neste
   * navegador e "não encontrado" nos outros. Chamado antes do early return:
   * hooks não podem ficar dentro de condição.
   */
  const published = Boolean(business?.published);
  const share = useShareUrl(published ? business : null, menu);
  const uiText = useUiText();
  const t = useTranslations('demo.pages');

  if (!user || !business) return null;

  const publicUrl = `${siteUrl}/r/${business.slug}`;
  const url = published ? share.url : publicUrl;

  return (
    <SharePanel
      businessId={business.id}
      businessName={business.name}
      slug={business.slug}
      publicUrl={publicUrl}
      shareUrl={url}
      published={published}
      blockedReason={describePublishBlocker(publishBlocker(business, menu), uiText)}
      qr={
        published && share.tooBigForQr ? (
          <p className="rounded-sm bg-gray-50 px-4 py-3 text-body2 text-gray-700">
            {t('qrTooBig')}
          </p>
        ) : (
          <QrCodeClient url={url} />
        )
      }
    />
  );
}

/** Uma aba de "Dados do negócio" no modo demonstração. */
export function DemoBusinessSection({ section }: { section: BusinessSection }) {
  const { ready, business, menu } = useOwnedBusiness();
  const router = useRouter();

  useEffect(() => {
    if (ready && !business) router.replace('/painel/comecar');
  }, [ready, business, router]);

  if (!business) return null;

  return (
    <BusinessForm
      business={business}
      menu={menu}
      section={section}
      siteUrl={siteUrl.replace(/^https?:\/\//, '')}
    />
  );
}

export function DemoMenuManager() {
  const { ready, business, menu } = useOwnedBusiness();
  const router = useRouter();
  const t = useTranslations('demo.pages');
  // O mesmo resumo do painel com banco (`painel.menuPage.summary`): o plural
  // próprio da demonstração dizia "0 categoria · 0 item".
  const tPainel = useTranslations('painel');

  useEffect(() => {
    if (ready && !business) router.replace('/painel/comecar');
  }, [ready, business, router]);

  if (!business) return null;

  return (
    <PanelPage>
      <PanelHeader
        title={t('menuTitle')}
        description={tPainel('menuPage.summary', { categories: menu.length, items: countItems(menu) })}
        actions={
          <div className="flex flex-wrap gap-2">
            {menu.length === 0 && (
              <Button
                variant="secondary"
                onClick={() => copySampleMenuInto(business.id)}
                leading={<Sparkles className="size-5" />}
              >
                {t('loadSample')}
              </Button>
            )}
            <CustomerViewLink slug={business.slug} published={business.published} />
          </div>
        }
      />

      <MenuEditor business={business} menu={menu} />
    </PanelPage>
  );
}

export function DemoItemEditor({ itemId, categoryId }: { itemId?: string; categoryId?: string }) {
  const { ready, business, menu } = useOwnedBusiness();
  const router = useRouter();
  const t = useTranslations('demo.pages');

  useEffect(() => {
    if (ready && !business) router.replace('/painel/comecar');
  }, [ready, business, router]);

  if (!business) return null;

  const item = itemId
    ? menu.flatMap((category) => category.items).find((entry) => entry.id === itemId)
    : undefined;

  if (menu.length === 0) {
    return (
      <PanelPage width="form">
        <Card padding="lg" className="text-center">
          <h1 className="text-h5 font-bold text-gray-700">{t('needCategoryTitle')}</h1>
          <p className="mt-2 text-body2 text-gray-600">
            {t('needCategoryText')}
          </p>
          <Button href="/painel/cardapio" className="mt-6" after={<NavIcon />}>
            {t('backToMenu')}
          </Button>
        </Card>
      </PanelPage>
    );
  }

  return (
    <PanelPage width="form">
      <PanelHeader
        title={item ? t('editItem') : t('newItem')}
        description={item ? item.name : t('newItemDescription')}
      />

      <ItemForm
        businessId={business.id}
        categories={menu}
        item={item}
        defaultCategoryId={categoryId}
      />
    </PanelPage>
  );
}

/**
 * Moldura da prévia no modo demonstração, montada pelo LAYOUT de
 * `/painel/previa` (como a com banco): sobrevive à troca entre o cardápio e o
 * prato. Sem negócio cadastrado, o lugar é o cadastro.
 */
export function DemoPreviewLayout({ children }: { children: React.ReactNode }) {
  const { ready, business, menu } = useOwnedBusiness();
  const router = useRouter();

  useEffect(() => {
    if (ready && !business) router.replace('/painel/comecar');
  }, [ready, business, router]);

  if (!business) return null;

  return (
    <PanelPage>
      <PreviewFrame business={business} menu={menu}>
        {children}
      </PreviewFrame>
    </PanelPage>
  );
}

/** Mesma tela da prévia com banco (StoreMenu); a moldura vem do layout. */
export function DemoPreview() {
  const { business, menu } = useOwnedBusiness();
  if (!business) return null;
  return <StoreMenu business={business} categories={visibleMenu(menu)} basePath={PREVIEW_PATH} />;
}

/** Página do prato dentro da prévia — o endereço público dá 404 em rascunho. */
export function DemoPreviewItem({ itemSlug }: { itemSlug: string }) {
  const { business, menu } = useOwnedBusiness();
  if (!business) return null;

  const found = findItemBySlug(menu, itemSlug);
  // A mesma tela do cardápio público, dentro da moldura e com o "‹".
  if (!found) return <ItemMissing />;

  return <ItemDetail business={business} category={found.category} item={found.item} basePath={PREVIEW_PATH} />;
}

/** A assinatura só existe com banco; na demonstração o painel fica liberado. */
export function DemoSubscription() {
  const t = useTranslations('demo.pages');
  return (
    <PanelPage width="form">
      <PanelHeader title={t('subscriptionTitle')} />
      <Notice tone="info">
        {t('subscriptionNotice')}
      </Notice>
    </PanelPage>
  );
}
