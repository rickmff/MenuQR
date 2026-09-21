'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { BusinessForm } from '@/components/painel/business-form';
import { CategoryManager } from '@/components/painel/category-manager';
import { CopyLink } from '@/components/painel/copy-link';
import { ItemForm } from '@/components/painel/item-form';
import { OnboardingForm } from '@/components/painel/onboarding-form';
import { CustomerViewLink } from '@/components/painel/customer-view-link';
import { PREVIEW_PATH, PreviewFrame } from '@/components/painel/preview-frame';
import { ItemDetail } from '@/components/store/item-detail';
import { PublishToggle } from '@/components/painel/publish-toggle';
import { QrCodeClient } from '@/components/demo/qr-code-client';
import { useShareUrl } from '@/components/store/use-share-url';
import { ShareButton } from '@/components/share-button';
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

  const itemCount = countItems(menu);

  const checklist = [
    { done: Boolean(business.whatsapp), label: 'WhatsApp que recebe os pedidos', href: '/painel/negocio' },
    { done: menu.length > 0, label: 'Pelo menos uma categoria', href: '/painel/cardapio' },
    { done: itemCount > 0, label: 'Pelo menos um item no cardápio', href: '/painel/cardapio' },
    {
      done: Boolean(business.address.street || business.address.city),
      label: 'Endereço do restaurante',
      href: '/painel/negocio',
    },
    {
      done: !business.delivery.enabled || business.delivery.zones.length > 0,
      label: 'Bairros atendidos com taxa e prazo',
      href: '/painel/negocio',
    },
    { done: business.published, label: 'Cardápio publicado', href: null },
  ];
  const pending = checklist.filter((entry) => !entry.done);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h4 font-semibold">Olá, {user.name.split(' ')[0]} 👋</h1>
          <p className="mt-2 text-ink-500">
            {business.name} ·{' '}
            <span className={business.published ? 'text-whatsapp-600' : 'text-ink-700'}>
              {business.published ? 'cardápio publicado' : 'rascunho (ainda não publicado)'}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/painel/previa" className="btn btn-sm btn-outline">
            Ver prévia
          </Link>
          <PublishToggle
            businessId={business.id}
            published={business.published}
            blockedReason={publishBlocker(business, menu)}
          />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="surface p-6 lg:col-span-2">
          <h2 className="font-display text-subtitle font-semibold">Seu cardápio na internet</h2>
          <p className="mt-1 text-body2 text-ink-500">
            Sem banco de dados, o link leva o cardápio dentro dele: abre em qualquer aparelho, para
            qualquer pessoa. Editou o cardápio? Compartilhe o link de novo — o antigo continua
            mostrando a versão anterior.
          </p>

          <p className="mt-4 max-h-24 overflow-y-auto break-all rounded-lg bg-ink-100 px-4 py-3 font-mono text-caption">
            {share.url}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <CopyLink url={share.url} />
            <ShareButton
              variant="button"
              url={share.url}
              title={business.name}
              text={`Confira o cardápio do ${business.name} e peça pelo WhatsApp`}
            />
            {business.published ? (
              <Link href={`/r/${business.slug}`} target="_blank" rel="noopener" className="btn btn-sm btn-outline">
                Abrir cardápio ↗
              </Link>
            ) : (
              <Link href="/painel/previa" className="btn btn-sm btn-outline">
                Ver prévia (ainda não publicado)
              </Link>
            )}
            {menu.length === 0 && (
              <button
                type="button"
                onClick={() => copySampleMenuInto(business.id)}
                className="btn btn-sm btn-primary"
              >
                Carregar cardápio de exemplo
              </button>
            )}
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-ink-200 pt-6 text-body2 sm:grid-cols-4">
            {[
              { label: 'Categorias', value: menu.length },
              { label: 'Itens', value: itemCount },
              { label: 'Bairros', value: business.delivery.zones.length },
              { label: 'Pagamentos', value: business.payments.length },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="text-ink-500">{stat.label}</dt>
                <dd className="mt-1 font-display text-h5 font-semibold">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="surface p-6">
          <h2 className="font-display text-subtitle font-semibold">QR code</h2>
          <p className="mt-1 text-body2 text-ink-500">Leve o cardápio para as mesas e embalagens.</p>
          <div className="mt-6">
            {share.tooBigForQr ? (
              <p className="rounded-lg bg-ink-100 px-4 py-3 text-body2 text-ink-700">
                O cardápio ficou grande demais para um QR code, que guarda no máximo cerca de 2.900
                caracteres. O link continua funcionando normalmente — para voltar a ter QR code é
                preciso encurtar o cardápio ou configurar um banco de dados.
              </p>
            ) : (
              <QrCodeClient url={share.url} published={business.published} />
            )}
          </div>
        </section>
      </div>

      <section className="surface p-6">
        <h2 className="font-display text-subtitle font-semibold">
          {pending.length === 0
            ? 'Tudo pronto 🎉'
            : pending.length === 1
              ? 'Falta 1 passo para caprichar'
              : `Faltam ${pending.length} passos para caprichar`}
        </h2>
        <ul className="mt-4 space-y-2 text-body2">
          {checklist.map((entry) => (
            <li key={entry.label} className="flex items-center gap-3">
              <span aria-hidden="true" className={entry.done ? 'text-whatsapp-600' : 'text-ink-400'}>
                {entry.done ? '✓' : '○'}
              </span>
              <span className={entry.done ? 'text-ink-500 line-through' : ''}>{entry.label}</span>
              {!entry.done &&
                (entry.href ? (
                  <Link href={entry.href} className="ml-auto font-semibold text-flame-600 hover:text-flame-700">
                    Resolver →
                  </Link>
                ) : (
                  <span className="ml-auto text-ink-500">use o botão “Publicar cardápio” acima ↑</span>
                ))}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function DemoBusinessSettings() {
  const { ready, business } = useOwnedBusiness();
  const router = useRouter();

  useEffect(() => {
    if (ready && !business) router.replace('/painel/comecar');
  }, [ready, business, router]);

  if (!business) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-h4 font-semibold">Dados do negócio</h1>
      <p className="mt-2 text-ink-500">
        Tudo o que aparece no cardápio e nas regras do pedido. As alterações valem na hora.
      </p>
      <div className="mt-8">
        <BusinessForm business={business} siteUrl={siteUrl.replace(/^https?:\/\//, '')} />
      </div>
    </div>
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
