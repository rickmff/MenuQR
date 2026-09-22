'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { BusinessForm } from '@/components/painel/business-form';
import type { BusinessSection } from '@/server/actions/business';
import { CategoryManager } from '@/components/painel/category-manager';
import { ItemForm } from '@/components/painel/item-form';
import { OnboardingForm } from '@/components/painel/onboarding-form';
import { CustomerViewLink } from '@/components/painel/customer-view-link';
import { PREVIEW_PATH, PreviewFrame } from '@/components/painel/preview-frame';
import { ItemDetail } from '@/components/store/item-detail';
import { SharePanel } from '@/components/painel/share-panel';
import { QrCodeClient } from '@/components/demo/qr-code-client';
import { useShareUrl } from '@/components/store/use-share-url';
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
    <div className="mx-auto max-w-xl">
      <h1 className="text-h4 font-semibold">Vamos cadastrar seu restaurante</h1>
      <p className="mt-3 text-ink-500">
        Três informações e seu cardápio já ganha endereço próprio. Você completa os horários, a área de
        entrega e os pratos no passo seguinte.
      </p>

      <div className="surface mt-8 p-6">
        <OnboardingForm siteUrl={siteUrl.replace(/^https?:\/\//, '')} />
      </div>
    </div>
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
          <QrCodeClient url={share.url} published={business.published} />
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
    <div className="mx-auto max-w-4xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h4 font-semibold">Cardápio</h1>
          <p className="mt-2 text-ink-500">
            {menu.length} {menu.length === 1 ? 'categoria' : 'categorias'} · {countItems(menu)}{' '}
            {countItems(menu) === 1 ? 'item' : 'itens'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {menu.length === 0 && (
            <button
              type="button"
              onClick={() => copySampleMenuInto(business.id)}
              className="btn btn-sm btn-outline"
            >
              Carregar exemplo
            </button>
          )}
          <CustomerViewLink slug={business.slug} published={business.published} />
        </div>
      </header>

      {saved && (
        <p role="status" className="mt-6 rounded-lg bg-whatsapp-500/12 px-4 py-3 text-body2 font-medium text-whatsapp-600">
          Item salvo.
        </p>
      )}

      <div className="mt-8">
        <CategoryManager businessId={business.id} menu={menu} />
      </div>
    </div>
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
      <div className="surface mx-auto max-w-2xl p-8 text-center">
        <h1 className="text-h5 font-semibold">Crie uma categoria primeiro</h1>
        <p className="mt-2 text-ink-500">
          Os itens ficam organizados em categorias, como “Hambúrgueres” ou “Bebidas”.
        </p>
        <Link href="/painel/cardapio" className="btn btn-primary mt-6">
          Voltar ao cardápio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-h4 font-semibold">{item ? 'Editar item' : 'Novo item'}</h1>
      <p className="mt-2 text-ink-500">{item ? item.name : 'Preencha os dados do prato.'}</p>
      <div className="mt-8">
        <ItemForm
          businessId={business.id}
          categories={menu}
          item={item}
          defaultCategoryId={categoryId}
        />
      </div>
    </div>
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
