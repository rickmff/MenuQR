'use client';

import { BadgePercent, Bike, ChevronRight, Clock, Store } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { useScrollRoot } from '@/components/store/scroll-root';
import { StoreStatus } from '@/components/store/store-status';
import { useStore } from '@/components/store/store-provider';
import { IconButton } from '@/components/ui/icon-button';
import { InfoCell } from '@/components/ui/info-cell';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Avatar } from '@/components/ui/avatar';
import { Tag } from '@/components/ui/tag';
import { activeZones, chargesByDistance } from '@/lib/delivery';
import { formatPrice } from '@/lib/format';
import type { Translate } from '@/lib/i18n';
import type { Business, OrderMode } from '@/lib/types';

/**
 * Tempo e taxa de entrega da loja, com os dados que o modelo tem. O "a partir
 * de" vai para a legenda: no valor ele não cabia ao lado do tempo no celular.
 */
function deliveryInfo(business: Business, t: Translate): { eta: string; fee: string; feeLabel: string; free: boolean } {
  if (chargesByDistance(business)) {
    // Por km o número exato depende do CEP: o piso é a taxa base.
    const { baseFee } = business.delivery.distance;
    return baseFee > 0
      ? { eta: '', fee: formatPrice(baseFee), feeLabel: t('deliveryFrom'), free: false }
      : { eta: '', fee: t('free'), feeLabel: t('deliveryFee'), free: true };
  }
  const zones = activeZones(business);
  if (zones.length === 0) return { eta: '', fee: t('toBeAgreed'), feeLabel: t('deliveryFee'), free: false };
  // A zona mais barata dá o "a partir de" e o prazo que aparece primeiro.
  const cheapest = zones.reduce((best, zone) => (zone.fee < best.fee ? zone : best));
  if (cheapest.fee === 0) return { eta: cheapest.eta, fee: t('free'), feeLabel: t('deliveryFee'), free: true };
  return {
    eta: cheapest.eta,
    fee: formatPrice(cheapest.fee),
    feeLabel: zones.length > 1 ? t('deliveryFrom') : t('deliveryFee'),
    free: false,
  };
}

/**
 * O cabeçalho da loja na folha branca, logo abaixo da capa: logo quadrado
 * metade sobre a capa, nome, a linha de status, o chevron do "Sobre a loja",
 * Entrega | Retirada e as duas informações da entrega (tempo e taxa) — a
 * primeira dobra de um app de delivery. A lista começa só depois.
 *
 * No fim, a sentinela: quando ela passa por baixo da barra do topo, a capa
 * saiu da tela e a barra compacta com o nome entra (`compactHeader`) — no
 * mesmo instante em que as abas de categoria grudam.
 */
export function StoreIdentity() {
  const t = useTranslations('store.identity');
  const { business, customer, updateCustomer, openAbout, setCompactHeader, notice } = useStore();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRoot = useScrollRoot();

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    // A barra do topo tem 56px + o notch: medida, porque o rootMargin não aceita env().
    const bar = document.querySelector<HTMLElement>('[data-store-top-bar]');
    const top = bar?.offsetHeight ?? 56;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        // Só conta como "saiu" quando passou POR CIMA (não quando está abaixo da
        // dobra). A régua é o topo da área observada, já descontada a barra: na
        // prévia quem rola é a moldura, que não começa no topo da janela.
        const edge = entry.rootBounds?.top ?? top;
        setCompactHeader(!entry.isIntersecting && entry.boundingClientRect.top < edge + 1);
      },
      { root: scrollRoot?.current ?? null, rootMargin: `-${top}px 0px 0px 0px`, threshold: 0 },
    );
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
      setCompactHeader(false);
    };
  }, [scrollRoot, setCompactHeader]);

  const delivers = business.delivery.enabled;
  const picksUp = business.pickup.enabled;
  const mode: OrderMode = customer.mode;
  const info = deliveryInfo(business, t);
  const freeAbove = delivers && mode === 'delivery' ? business.delivery.freeAbove : 0;
  const pickupAddress = business.address.street;

  const cells =
    mode === 'delivery'
      ? [
          info.eta && { key: 'eta', icon: <Clock />, value: info.eta, label: t('deliveryTime') },
          { key: 'fee', icon: <Bike />, value: info.fee, label: info.feeLabel, positive: info.free },
        ]
      : [
          business.pickup.eta && { key: 'eta', icon: <Clock />, value: business.pickup.eta, label: t('prepTime') },
          pickupAddress && { key: 'where', icon: <Store />, value: pickupAddress, label: t('pickupAt') },
        ];
  const visibleCells = cells.filter(Boolean) as {
    key: string;
    icon: React.ReactNode;
    value: string;
    label: string;
    positive?: boolean;
  }[];

  return (
    <div className="pb-2">
      <div className="flex items-start gap-3">
        <Avatar
          logo={business.logo}
          name={business.name}
          size={64}
          shape="square"
          className="-mt-8 shrink-0 lg:-mt-10"
        />
        <div className="min-w-0 flex-1 pt-2">
          <p className="truncate font-display text-h4 font-bold leading-tight text-gray-900 lg:text-h3">
            {business.name}
          </p>
          <StoreStatus business={business} className="mt-1" />
        </div>
        <IconButton
          label={t('about')}
          icon={<ChevronRight className="size-5" />}
          variant="tonal"
          size="sm"
          hit
          onClick={openAbout}
          className="mt-3 cursor-pointer"
        />
      </div>

      {(delivers || picksUp) && (
        <SegmentedControl<OrderMode>
          label={t('modeLabel')}
          size="lg"
          indicator="sliding"
          value={mode}
          onChange={(next) => updateCustomer({ mode: next })}
          options={[
            { value: 'delivery', label: t('delivery'), disabled: !delivers, hint: delivers ? undefined : t('unavailable') },
            { value: 'pickup', label: t('pickup'), disabled: !picksUp, hint: picksUp ? undefined : t('unavailable') },
          ]}
          className="mx-auto mt-5 w-full max-w-72 lg:mx-0"
        />
      )}

      {visibleCells.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:flex lg:gap-10">
          {visibleCells.map((cell) => (
            <InfoCell
              key={cell.key}
              icon={cell.icon}
              value={cell.value}
              label={cell.label}
              tone={cell.positive ? 'positive' : 'neutral'}
              className={visibleCells.length === 1 ? 'col-span-2' : undefined}
            />
          ))}
        </div>
      )}

      {freeAbove > 0 && (
        <Tag tone="promo" size="md" className="mt-5">
          <BadgePercent aria-hidden="true" className="size-4" />
          {t('freeAbove', { value: formatPrice(freeAbove) })}
        </Tag>
      )}

      {notice && <div className="mt-5">{notice}</div>}

      {/* Marca onde a identidade termina: é o que decide a barra compacta. */}
      <div ref={sentinelRef} data-store-hero-end aria-hidden="true" className="h-px" />
    </div>
  );
}
