'use client';

import { ChevronLeft, Search, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { flushSync } from 'react-dom';
import { useSyncExternalStore } from 'react';
import { ShareButton } from '@/components/share-button';
import { CountBadge } from '@/components/store/count-badge';
import { useStore } from '@/components/store/store-provider';
import { useShareUrl } from '@/components/store/use-share-url';
import { useStoreRoute } from '@/components/store/use-store-route';
import { IconButton } from '@/components/ui/icon-button';
import { SearchBar } from '@/components/ui/search-bar';
import { cn } from '@/lib/cn';

export const SEARCH_INPUT_ID = 'busca-cardapio';

const noopSubscribe = () => () => {};

/**
 * Topo da loja, como nos apps de delivery.
 *
 * Sobre a capa, só botões flutuantes — o "‹" à esquerda e, à direita, uma
 * pílula branca com busca, compartilhar e sacola. Quando a capa sai da tela (a
 * sentinela do `StoreIdentity` passa por baixo), entra uma barra branca com o
 * nome da loja atrás deles, e as abas de categoria grudam logo abaixo dela.
 * Com a busca aberta, a barra inteira vira o campo de busca.
 *
 * `fixed` e da mesma altura nos dois estados: nada acima do conteúdo muda de
 * tamanho ao rolar, então o scroll anchoring do Chrome não tem o que corrigir
 * (o bug que fazia o cabeçalho da landing piscar).
 *
 * `layout="bar"`: a barra compacta, fora de `fixed`, para a vitrine da landing.
 * Na página do prato o topo é do `ItemHero`; aqui fica só a versão do desktop,
 * acima do painel do prato.
 */
export function StoreHeader({
  layout = 'floating',
  forceCompact = false,
}: {
  layout?: 'floating' | 'bar';
  /** Começa (e fica) na barra compacta: vitrine da landing, telas sem capa. */
  forceCompact?: boolean;
}) {
  const {
    business,
    menu,
    embedded,
    itemCount,
    openCart,
    compactHeader,
    searchOpen,
    search,
    setSearch,
    openSearch,
    closeSearch,
  } = useStore();
  const t = useTranslations('store.header');
  const router = useRouter();
  const { view } = useStoreRoute();
  // Sem banco, o link tem de levar o cardápio junto: quem recebeu e repassa
  // manda um link que abre, e não um endereço vazio.
  const share = useShareUrl(business, menu);
  // Há de onde voltar? No HTML servido, não sabemos: o "‹" só aparece depois.
  const canGoBack = useSyncExternalStore(
    noopSubscribe,
    () => window.history.length > 1,
    () => false,
  );

  const onItem = view === 'item';
  const compact = forceCompact || onItem || compactHeader || searchOpen || layout === 'bar';

  const startSearch = () => {
    // No iOS o teclado só abre se o foco acontecer dentro do toque: monta o
    // campo agora (flushSync) e foca em seguida, no mesmo gesto.
    flushSync(() => openSearch());
    const top = document.getElementById(SEARCH_INPUT_ID);
    top?.focus({ preventScroll: true });
  };

  const bagLabel = t('openBag', { count: itemCount });
  const circle = compact ? 'plain' : 'raised';

  const actions = (
    <div
      className={cn(
        'pointer-events-auto flex items-center rounded-full p-0.5 transition-[background-color,box-shadow] duration-150 ease-standard',
        compact ? 'bg-transparent shadow-none' : 'bg-white shadow-medium',
      )}
    >
      <IconButton
        label={t('search')}
        icon={<Search className="size-5" />}
        onClick={startSearch}
        className="cursor-pointer"
      />
      <ShareButton
        closeSide="start"
        url={share.url}
        title={business.name}
        text={t('shareText', { name: business.name })}
      />
      <span className="relative">
        <IconButton
          label={bagLabel}
          icon={<ShoppingBag className="size-5" />}
          onClick={() => openCart('cart')}
          className="cursor-pointer"
        />
        <CountBadge count={itemCount} className="-right-0.5 -top-0.5" />
      </span>
    </div>
  );

  const name = (
    <p
      aria-hidden={!compact}
      className={cn(
        'min-w-0 flex-1 truncate text-center text-body1 font-semibold text-gray-900 transition-[opacity,transform] duration-150 ease-standard',
        compact ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0',
      )}
    >
      {business.name}
    </p>
  );

  if (layout === 'bar') {
    return (
      <header className="border-b border-gray-200 bg-white">
        <div className="flex h-14 items-center gap-2 px-2">
          <span className="size-11 shrink-0" />
          {name}
          {actions}
        </div>
      </header>
    );
  }

  const back = () => {
    if (window.history.length > 1) router.back();
    else router.push('/');
  };

  return (
    <header
      data-store-top-bar
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-50 pt-safe',
        // Na página do prato, no celular, quem ocupa o topo é a foto.
        onItem && 'hidden lg:block',
      )}
    >
      {/* A barra branca é uma camada atrás dos botões: entra com fade e 4px de
          deslize, sem mudar a altura de nada. */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-0 border-b border-gray-200 bg-white transition-[opacity,transform] duration-150 ease-standard',
          compact ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0',
        )}
      />
      <div className="relative mx-auto flex h-14 w-full max-w-page items-center gap-2 px-2 md:px-4 lg:px-6">
        {searchOpen ? (
          <div className="pointer-events-auto flex min-w-0 flex-1 items-center gap-1">
            <IconButton
              label={t('closeSearch')}
              icon={<ChevronLeft className="size-6" />}
              size="lg"
              onClick={closeSearch}
              className="cursor-pointer"
            />
            <SearchBar
              id={SEARCH_INPUT_ID}
              value={search}
              onChange={setSearch}
              onClear={() => {
                setSearch('');
                document.getElementById(SEARCH_INPUT_ID)?.focus();
              }}
              onCancel={closeSearch}
              className="min-w-0 flex-1 pr-1"
            />
          </div>
        ) : (
          <>
            {/* O "‹" da loja sai do site (como um app aberto por link). Na prévia
                o painel já tem o "Voltar ao painel"; na página do prato, o dele. */}
            {!embedded && !onItem ? (
              <IconButton
                label={t('back')}
                icon={<ChevronLeft className="size-6" />}
                variant={circle}
                size="lg"
                onClick={back}
                className={cn(
                  // A lista inteira, e não `transition-opacity`: esta trocaria a
                  // da `press` e o toque e a troca raised → plain ficariam secos.
                  'pointer-events-auto cursor-pointer focus-ring-photo transition-[opacity,transform,background-color,box-shadow] duration-150 ease-standard',
                  canGoBack ? 'opacity-100' : 'pointer-events-none invisible opacity-0',
                )}
              />
            ) : (
              <span className="size-11 shrink-0" />
            )}
            {name}
            {actions}
          </>
        )}
      </div>
    </header>
  );
}
