'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { BusinessForm } from '@/components/painel/business-form';
import type { BusinessSection } from '@/components/painel/business-sections';
import { CategoryManager } from '@/components/painel/category-manager';
import { ItemForm } from '@/components/painel/item-form';
import { OnboardingForm } from '@/components/painel/onboarding-form';
import { CustomerViewLink } from '@/components/painel/customer-view-link';
import { PanelHeader, PanelPage } from '@/components/painel/panel-page';
import { PREVIEW_PATH, PreviewFrame } from '@/components/painel/preview-frame';
import { ItemDetail } from '@/components/store/item-detail';
import { SharePanel } from '@/components/painel/share-panel';
import { QrCodeClient } from '@/components/demo/qr-code-client';
import { useShareUrl } from '@/components/store/use-share-url';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StoreMenu } from '@/components/store/store-menu';
import { copySampleMenuInto } from '@/lib/demo/store';
import { businessOfUser, currentUser, menuOfBusiness, useDemoState } from '@/lib/demo/store';
import { countItems, findItemBySlug, publishBlocker, visibleMenu } from '@/lib/menu-utils';
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

  useEffect(() => {
    if (ready && business) router.replace('/painel');
  }, [ready, business, router]);

  if (!ready || !user) return null;

  return (
    <PanelPage width="form">
      <PanelHeader
        title="Vamos cadastrar seu restaurante"
        description="Três informações e seu cardápio já ganha endereço próprio. Você completa os horários, a área de entrega e os pratos no passo seguinte."
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

  // Chamado antes do early return: hooks não podem ficar dentro de condição.
  const share = useShareUrl(business, menu);

  if (!user || !business) return null;

  return (
    <SharePanel
      businessId={business.id}
      businessName={business.name}
      slug={business.slug}
      publicUrl={`${siteUrl}/r/${business.slug}`}
      shareUrl={share.url}
      published={business.published}
      blockedReason={publishBlocker(business, menu)}
      qr={
        share.tooBigForQr ? (
          <p className="rounded-sm bg-gray-50 px-4 py-3 text-body2 text-gray-700">
            O cardápio ficou grande demais para um QR code, que guarda no máximo cerca de 2.900
            caracteres. O link continua funcionando — para voltar a ter QR code é preciso encurtar o
            cardápio ou configurar um banco de dados.
          </p>
        ) : (
          <QrCodeClient url={share.url} />
        )
      }
    />
  );
}

/** Uma aba de "Dados do negócio" no modo demonstração. */
export function DemoBusinessSection({ section }: { section: BusinessSection }) {
  const { ready, business } = useOwnedBusiness();
  const router = useRouter();

  useEffect(() => {
    if (ready && !business) router.replace('/painel/comecar');
  }, [ready, business, router]);

  if (!business) return null;

  return (
    <BusinessForm business={business} section={section} siteUrl={siteUrl.replace(/^https?:\/\//, '')} />
  );
}

export function DemoMenuManager({ saved = false }: { saved?: boolean }) {
  const { ready, business, menu } = useOwnedBusiness();
  const router = useRouter();

  useEffect(() => {
    if (ready && !business) router.replace('/painel/comecar');
  }, [ready, business, router]);

  if (!business) return null;

  return (
    <PanelPage>
      <PanelHeader
        title="Cardápio"
        description={`${menu.length} ${menu.length === 1 ? 'categoria' : 'categorias'} · ${countItems(menu)} ${
          countItems(menu) === 1 ? 'item' : 'itens'
        }`}
        actions={
          <div className="flex flex-wrap gap-2">
            {menu.length === 0 && (
              <Button variant="secondary" onClick={() => copySampleMenuInto(business.id)}>
                Carregar exemplo
              </Button>
            )}
            <CustomerViewLink slug={business.slug} published={business.published} />
          </div>
        }
      />

      {saved && (
        <p
          role="status"
          className="rounded-sm bg-success-bg px-4 py-3 text-body2 font-medium text-gray-700"
        >
          Item salvo.
        </p>
      )}

      <CategoryManager businessId={business.id} menu={menu} />
    </PanelPage>
  );
}

export function DemoItemEditor({ itemId, categoryId }: { itemId?: string; categoryId?: string }) {
  const { ready, business, menu } = useOwnedBusiness();
  const router = useRouter();

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
          <h1 className="text-h5 font-bold text-gray-700">Crie uma categoria primeiro</h1>
          <p className="mt-2 text-body2 text-gray-600">
            Os itens ficam organizados em categorias, como “Hambúrgueres” ou “Bebidas”.
          </p>
          <Button href="/painel/cardapio" className="mt-6">
            Voltar ao cardápio
          </Button>
        </Card>
      </PanelPage>
    );
  }

  return (
    <PanelPage width="form">
      <PanelHeader
        title={item ? 'Editar item' : 'Novo item'}
        description={item ? item.name : 'Preencha os dados do prato.'}
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

export function DemoPreview() {
  const { ready, business, menu } = useOwnedBusiness();
  const router = useRouter();

  useEffect(() => {
    if (ready && !business) router.replace('/painel/comecar');
  }, [ready, business, router]);

  if (!business) return null;

  // Mesma moldura e mesma tela da prévia com banco (PreviewFrame + StoreMenu).
  return (
    <PreviewFrame business={business} menu={menu}>
      <StoreMenu
        business={business}
        categories={visibleMenu(menu)}
        floatingCart={false}
        basePath={PREVIEW_PATH}
      />
    </PreviewFrame>
  );
}

/** Página do prato dentro da prévia — o endereço público dá 404 em rascunho. */
export function DemoPreviewItem({ itemSlug }: { itemSlug: string }) {
  const { ready, business, menu } = useOwnedBusiness();
  const router = useRouter();
  const found = findItemBySlug(menu, itemSlug);

  useEffect(() => {
    if (ready && !business) router.replace('/painel/comecar');
    else if (ready && business && !found) router.replace(PREVIEW_PATH);
  }, [ready, business, found, router]);

  if (!business || !found) return null;

  return (
    <PreviewFrame business={business} menu={menu}>
      <ItemDetail business={business} category={found.category} item={found.item} basePath={PREVIEW_PATH} />
    </PreviewFrame>
  );
}
