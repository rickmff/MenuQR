'use client';

import { Sparkles } from 'lucide-react';
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

export function DemoMenuManager() {
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
              <Button
                variant="secondary"
                onClick={() => copySampleMenuInto(business.id)}
                leading={<Sparkles className="size-5" />}
              >
                Carregar exemplo
              </Button>
            )}
            <CustomerViewLink slug={business.slug} published={business.published} />
          </div>
        }
      />

      <MenuEditor businessId={business.id} menu={menu} />
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
          <Button href="/painel/cardapio" className="mt-6" after={<NavIcon />}>
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
  return (
    <PanelPage width="form">
      <PanelHeader title="Assinatura" />
      <Notice tone="info">
        A assinatura só existe na versão com banco de dados. Nesta demonstração o painel e a publicação ficam
        liberados.
      </Notice>
    </PanelPage>
  );
}
