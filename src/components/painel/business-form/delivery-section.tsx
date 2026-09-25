'use client';

import { Bike, ChevronDown, Store, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { DeliveryRadiusMap } from '@/components/painel/delivery-radius-map';
import { AddButton } from '@/components/ui/add-button';
import { Banner } from '@/components/ui/banner';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { fieldClass, TextField } from '@/components/ui/text-field';
import { cn } from '@/lib/cn';
import { addressPoint, type Coordinates } from '@/lib/delivery-area';
import { formatDecimalInput } from '@/lib/format';
import type { Business, BusinessAddress, DeliveryPricing } from '@/lib/types';

interface ZoneRow {
  key: string;
  name: string;
  fee: string;
  eta: string;
}

/** Os limites do servidor (`business.ts`), para o campo não deixar passar. */
const ZONE_NAME_MAX = 60;
const ZONE_ETA_MAX = 40;

/** O campo do prazo já mostra "min": o que foi gravado como "30-45 min" volta como "30-45". */
function etaForField(eta: string): string {
  return eta.replace(/\s*min\.?\s*$/i, '');
}

/** Km como o lojista digita: "1,5", e "3" sem casas. Zero volta vazio, como o dinheiro. */
function kmForField(km: number): string {
  return km ? String(km).replace('.', ',') : '';
}

function samePoint(a: Coordinates | null, b: Coordinates | null): boolean {
  if (!a || !b) return a === b;
  return a.latitude === b.latitude && a.longitude === b.longitude;
}

/**
 * A aba "Endereço e entrega": o endereço, as formas de receber o pedido e,
 * dentro da entrega, como ela é cobrada.
 *
 * A ordem dentro da entrega segue a decisão principal: primeiro como a entrega
 * é cobrada (e os campos daquela forma), depois mínimo e entrega grátis, e por
 * último o mapa — aberto e obrigatório cobrando por distância, recolhido e
 * opcional cobrando por bairro, onde ele só vira uma referência no "Sobre a
 * loja".
 *
 * `error` já esconde o erro de um campo que o lojista mexeu depois da resposta;
 * as regras que não moram num campo (formas de receber, cobrança sem ponto,
 * taxa de um bairro) avisam a mudança por `markEdited`.
 */
export function DeliverySection({
  business,
  error,
  isEdited,
  markEdited,
}: {
  business: Business;
  error: (field: string) => string | undefined;
  isEdited: (field: string) => boolean;
  markEdited: (field?: string) => void;
}) {
  const t = useTranslations('painel.businessForm');
  const [deliveryEnabled, setDeliveryEnabled] = useState(business.delivery.enabled);
  const [pickupEnabled, setPickupEnabled] = useState(business.pickup.enabled);
  const [pricing, setPricing] = useState<DeliveryPricing>(business.delivery.pricing);
  // O mapa recolhido que o lojista abriu continua aberto se ele trocar de ideia na cobrança.
  const [mapOpen, setMapOpen] = useState(false);
  // O ponto que o mapa tem AGORA: o lojista pode marcar e escolher a cobrança
  // por km na mesma visita, sem salvar no meio.
  const [mapPoint, setMapPoint] = useState<Coordinates | null>(() => addressPoint(business.address));
  /*
   * O endereço é controlado, e não `defaultValue` como os outros campos de
   * texto, porque o mapa da mesma aba procura por ele: "Procurar meu endereço"
   * tem de achar a rua que está digitada na tela, não a que está gravada no
   * banco de uma visita anterior.
   */
  const [address, setAddress] = useState<BusinessAddress>(business.address);
  const setAddressField = (field: 'street' | 'district' | 'city' | 'state' | 'postalCode', value: string) =>
    setAddress((current) => ({ ...current, [field]: value }));
  // Os valores voltam como o lojista escreve: "9,50", não "9.5".
  const [zones, setZones] = useState<ZoneRow[]>(() =>
    business.delivery.zones.map((zone) => ({
      key: zone.id,
      name: zone.name,
      fee: formatDecimalInput(zone.fee),
      eta: etaForField(zone.eta),
    })),
  );

  // O mapa não passa por um campo visível: o ponto novo avisa que há o que salvar.
  const onPointChange = useCallback(
    (next: Coordinates | null) => {
      if (samePoint(mapPoint, next)) return;
      setMapPoint(next);
      markEdited('latitude');
    },
    [mapPoint, markEdited],
  );

  const setMode = (mode: 'delivery' | 'pickup', next: boolean) => {
    if (mode === 'delivery') setDeliveryEnabled(next);
    else setPickupEnabled(next);
    markEdited('orderModes');
  };

  // Tocar na opção que já está marcada não muda nada: não conta como alteração.
  const choosePricing = (next: DeliveryPricing) => {
    if (next === pricing) return;
    setPricing(next);
    markEdited('deliveryPricing');
  };

  const addZone = () => {
    setZones((current) => [...current, { key: `novo-${current.length}-${Date.now()}`, name: '', fee: '', eta: '' }]);
    markEdited('zones');
  };

  const updateZone = (key: string, patch: Partial<ZoneRow>) => {
    setZones((current) => current.map((zone) => (zone.key === key ? { ...zone, ...patch } : zone)));
    markEdited(`zone-${key}`);
  };

  const removeZone = (key: string) => {
    setZones((current) => current.filter((zone) => zone.key !== key));
    markEdited('zones');
  };

  /*
   * O erro da taxa vem pela posição da linha no envio (`zone-fee-2`). Mexer
   * naquela linha apaga o erro dela; acrescentar ou tirar uma linha muda as
   * posições, e aí nenhum erro antigo aponta mais para a linha certa.
   */
  const zoneFeeError = (index: number, key: string) =>
    isEdited('zones') || isEdited(`zone-${key}`) ? undefined : error(`zone-fee-${index}`);

  const modesError = error('orderModes');
  const noMode = !deliveryEnabled && !pickupEnabled;
  const byDistance = pricing === 'distance';
  const missingPoint = byDistance && !mapPoint;
  const pricingError = missingPoint ? error('deliveryPricing') : undefined;
  /*
   * Os avisos das regras que não moram num campo descrevem os controles que
   * as resolvem: quem chega pelo teclado na caixa "Entrega" ou no seletor de
   * cobrança ouve o motivo, não só "inválido".
   */
  const modesNoticeId = 'orderModes-notice';
  const pricingNoticeId = 'deliveryPricing-notice';

  return (
    <>
      {/* O endereço abre a aba: dele saem a retirada, o rodapé do cardápio e o
          ponto que o mapa vai procurar. Fica fora do bloco da entrega de
          propósito — quem só faz retirada também precisa dizer onde fica. */}
      <fieldset>
        <legend className="text-body2 font-semibold text-gray-700">{t('address.legend')}</legend>
        <p className="mt-1 text-caption text-gray-600">{t('address.hint')}</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <TextField
            id="street"
            name="street"
            label={t('address.street')}
            value={address.street}
            onChange={(event) => setAddressField('street', event.target.value)}
            placeholder={t('address.streetPlaceholder')}
            maxLength={160}
            error={error('street')}
          />
          <TextField
            id="district"
            name="district"
            label={t('address.district')}
            value={address.district}
            onChange={(event) => setAddressField('district', event.target.value)}
            placeholder={t('address.districtPlaceholder')}
            maxLength={80}
            error={error('district')}
          />
          <TextField
            id="city"
            name="city"
            label={t('address.city')}
            value={address.city}
            onChange={(event) => setAddressField('city', event.target.value)}
            placeholder={t('address.cityPlaceholder')}
            maxLength={80}
            error={error('city')}
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              id="state"
              name="state"
              label={t('address.state')}
              value={address.state}
              onChange={(event) => setAddressField('state', event.target.value)}
              placeholder="SP"
              maxLength={2}
              error={error('state')}
            />
            <TextField
              id="postalCode"
              name="postalCode"
              label={t('address.postalCode')}
              value={address.postalCode}
              onChange={(event) => setAddressField('postalCode', event.target.value)}
              placeholder="00000-000"
              inputMode="numeric"
              maxLength={12}
              error={error('postalCode')}
            />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-body2 font-semibold text-gray-700">{t('modes.legend')}</legend>
        <p className="mt-1 text-caption text-gray-600">{t('modes.hint')}</p>

        <div className="mt-3 space-y-4">
          {/* Um aviso só para a regra: amarelo enquanto é conselho, vermelho
              depois que a aba foi recusada por ela. Some ao ligar uma forma. */}
          {noMode && (
            <RuleNotice id={modesNoticeId} refused={Boolean(modesError)}>
              {modesError ?? t('modes.noneWarning')}
            </RuleNotice>
          )}

          <OrderMode
            name="deliveryEnabled"
            checked={deliveryEnabled}
            onChange={(next) => setMode('delivery', next)}
            invalid={Boolean(modesError) && noMode}
            describedBy={noMode ? modesNoticeId : undefined}
            icon={<Bike aria-hidden="true" className="size-5" />}
            title={t('delivery.title')}
            description={t('delivery.description')}
          >
            {/* 1. Como cobra — a decisão que define o resto do bloco. */}
            <fieldset>
              <legend className="text-body2 font-semibold text-gray-700">{t('delivery.pricingLegend')}</legend>
              <p className="mt-1 text-caption text-gray-600">{t('delivery.pricingHint')}</p>

              {/* O que a action lê; o controle abaixo é quem o move. */}
              <input type="hidden" name="deliveryPricing" value={pricing} />
              <SegmentedControl
                label={t('delivery.pricingLegend')}
                className={cn('mt-3', pricingError && 'ring-2 ring-error')}
                invalid={Boolean(pricingError)}
                describedBy={missingPoint ? pricingNoticeId : undefined}
                value={pricing}
                onChange={choosePricing}
                options={[
                  { value: 'zones', label: t('delivery.byZone') },
                  { value: 'distance', label: t('delivery.byDistance') },
                ]}
              />

              {missingPoint && (
                <RuleNotice id={pricingNoticeId} refused={Boolean(pricingError)} className="mt-3">
                  {pricingError ?? t('delivery.noPointWarning')}
                </RuleNotice>
              )}
            </fieldset>

            <div hidden={!byDistance} className="grid gap-4 sm:grid-cols-3">
              <TextField
                id="distanceBaseFee"
                name="distanceBaseFee"
                label={t('delivery.baseFee')}
                hint={t('delivery.baseFeeHint')}
                inputMode="decimal"
                defaultValue={formatDecimalInput(business.delivery.distance.baseFee)}
                placeholder="5,00"
                error={error('distanceBaseFee')}
              />
              <TextField
                id="distanceBaseKm"
                name="distanceBaseKm"
                label={t('delivery.baseKm')}
                inputMode="decimal"
                defaultValue={kmForField(business.delivery.distance.baseKm)}
                placeholder="3"
                error={error('distanceBaseKm')}
              />
              <TextField
                id="distancePerKmFee"
                name="distancePerKmFee"
                label={t('delivery.perKmFee')}
                hint={t('delivery.perKmFeeHint')}
                inputMode="decimal"
                defaultValue={formatDecimalInput(business.delivery.distance.perKmFee)}
                placeholder="1,50"
                error={error('distancePerKmFee')}
              />
              <p className="text-caption text-gray-600 sm:col-span-3">{t('delivery.distanceNote')}</p>
            </div>

            {/* Escondido, não desmontado: quem troca para "por distância" e
                volta encontra os bairros como estavam. */}
            <fieldset hidden={byDistance}>
              <legend className="text-body2 font-semibold text-gray-700">{t('delivery.zonesLegend')}</legend>
              <p className="mt-1 text-caption text-gray-600">{t('delivery.zonesHint')}</p>

              {zones.length === 0 ? (
                <p className="mt-3 rounded-sm bg-gray-50 px-4 py-3 text-body2 text-gray-700">
                  {t('delivery.zonesEmpty')}
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {zones.map((zone, index) => (
                    <ZoneLine
                      key={zone.key}
                      zone={zone}
                      feeError={zoneFeeError(index, zone.key)}
                      onChange={(patch) => updateZone(zone.key, patch)}
                      onRemove={() => removeZone(zone.key)}
                    />
                  ))}
                </ul>
              )}

              <AddButton type="button" onClick={addZone} className="mt-3">
                {t('delivery.addZone')}
              </AddButton>
            </fieldset>

            {/* 2. Mínimo e entrega grátis valem para as duas formas de cobrar. */}
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id="minOrder"
                name="minOrder"
                label={t('delivery.minOrder')}
                hint={t('delivery.minOrderHint')}
                inputMode="decimal"
                defaultValue={formatDecimalInput(business.delivery.minOrder)}
                placeholder="0,00"
                error={error('minOrder')}
              />
              <TextField
                id="freeAbove"
                name="freeAbove"
                label={t('delivery.freeAbove')}
                hint={t('delivery.freeAboveHint')}
                inputMode="decimal"
                defaultValue={formatDecimalInput(business.delivery.freeAbove)}
                placeholder="0,00"
                error={error('freeAbove')}
              />
            </div>

            {/*
             * 3. A área no mapa. Um <details> só, nas duas formas de cobrar,
             * para o mapa não ser desmontado ao trocar (o ponto marcado mora
             * nele): por distância ele fica aberto e sem o título de abrir;
             * por bairro, recolhido. Fechado, os campos escondidos do ponto
             * continuam no envio. Ao abrir, o mapa se reenquadra sozinho — ele
             * observa o próprio tamanho. O navegador dispara `toggle` também
             * quando o <details> nasce aberto (por distância); esse toggle não
             * é o lojista abrindo o mapa, e contá-lo deixaria o mapa aberto ao
             * trocar para "Por bairro". Só conta o toggle feito por bairro.
             */}
            <details
              open={byDistance || mapOpen}
              onToggle={(event) => {
                if (!byDistance) setMapOpen(event.currentTarget.open);
              }}
              className={cn('group', !byDistance && 'rounded-sm border border-gray-200')}
            >
              <summary
                hidden={byDistance}
                className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-body2 font-semibold text-gray-700 [&::-webkit-details-marker]:hidden"
              >
                <ChevronDown
                  aria-hidden="true"
                  className="size-[18px] shrink-0 text-gray-600 transition-transform duration-150 ease-standard group-open:rotate-180"
                />
                {t('delivery.mapOptional')}
              </summary>
              <div className={cn(!byDistance && 'border-t border-gray-200 p-4')}>
                <DeliveryRadiusMap
                  address={address}
                  defaultRadiusKm={business.delivery.radiusKm}
                  onPointChange={onPointChange}
                  required={byDistance}
                  legendHidden={!byDistance}
                />
              </div>
            </details>
          </OrderMode>

          <OrderMode
            name="pickupEnabled"
            checked={pickupEnabled}
            onChange={(next) => setMode('pickup', next)}
            invalid={Boolean(modesError) && noMode}
            describedBy={noMode ? modesNoticeId : undefined}
            icon={<Store aria-hidden="true" className="size-5" />}
            title={t('pickup.title')}
            description={t('pickup.description')}
          >
            <TextField
              id="pickupEta"
              name="pickupEta"
              label={t('pickup.eta')}
              hint={t('pickup.etaHint')}
              defaultValue={business.pickup.eta}
              placeholder="20-30 min"
              maxLength={40}
              error={error('pickupEta')}
            />
          </OrderMode>
        </div>
      </fieldset>
    </>
  );
}

/**
 * Um bairro atendido. No computador é uma linha (nome, taxa, prazo, lixeira);
 * no celular vira um cartão pequeno — o nome em cima com a lixeira no canto, a
 * taxa e o prazo lado a lado embaixo —, em vez de três campos soltos em duas
 * fileiras. A unidade fica dentro do campo ("R$" antes da taxa, "min" depois
 * do prazo): sem ela, "6" e "30-40" não diziam o que eram, e quem digitava
 * "R$ 6,00" para garantir perdia a taxa.
 */
function ZoneLine({
  zone,
  feeError,
  onChange,
  onRemove,
}: {
  zone: ZoneRow;
  feeError?: string;
  onChange: (patch: Partial<ZoneRow>) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('painel.businessForm.delivery');
  const id = `zone-${zone.key}`;
  const labelClass = 'mb-1 block text-caption text-gray-600 sm:sr-only';

  return (
    <li className="grid grid-cols-[1fr_1fr_auto] items-end gap-x-3 gap-y-2 rounded-md border border-gray-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_auto] sm:gap-2 sm:rounded-sm sm:border-0 sm:bg-gray-50 sm:p-2">
      <div className="col-span-2 min-w-0 sm:col-span-1">
        <label htmlFor={`${id}-name`} className={labelClass}>
          {t('zoneNameLabel')}
        </label>
        <input
          id={`${id}-name`}
          name="zone-name"
          value={zone.name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder={t('zoneName')}
          maxLength={ZONE_NAME_MAX}
          className={fieldClass(false, 'h-12 sm:h-10')}
        />
      </div>

      <div className="col-start-1 row-start-2 min-w-0 sm:col-start-2 sm:row-start-1">
        <label htmlFor={`${id}-fee`} className={labelClass}>
          {t('zoneFeeLabel')}
          <span className="sr-only"> (R$)</span>
        </label>
        <AdornedInput
          id={`${id}-fee`}
          name="zone-fee"
          prefix="R$"
          value={zone.fee}
          onChange={(event) => onChange({ fee: event.target.value })}
          placeholder="0,00"
          inputMode="decimal"
          invalid={Boolean(feeError)}
          describedBy={feeError ? `${id}-fee-error` : undefined}
        />
      </div>

      <div className="col-span-2 col-start-2 row-start-2 min-w-0 sm:col-span-1 sm:col-start-3 sm:row-start-1">
        <label htmlFor={`${id}-eta`} className={labelClass}>
          {t('zoneEtaLabel')}
          <span className="sr-only"> ({t('zoneEtaUnit')})</span>
        </label>
        <AdornedInput
          id={`${id}-eta`}
          name="zone-eta"
          suffix={t('zoneEtaUnit')}
          value={zone.eta}
          onChange={(event) => onChange({ eta: event.target.value })}
          placeholder="30-45"
          maxLength={ZONE_ETA_MAX}
        />
      </div>

      <button
        type="button"
        onClick={onRemove}
        aria-label={t('removeZone', { name: zone.name || t('zoneFallback') })}
        className="press col-start-3 row-start-1 grid size-12 place-items-center rounded-full text-gray-600 hover:bg-gray-100 hover:text-primary sm:col-start-4 sm:size-10"
      >
        <Trash2 aria-hidden="true" className="size-4" />
      </button>

      {feeError && (
        <p id={`${id}-fee-error`} role="alert" className="col-span-full text-caption font-medium text-error">
          {feeError}
        </p>
      )}
    </li>
  );
}

/**
 * Campo com a unidade do lado de dentro ("R$ 6,00", "30-45 min"). A moldura
 * é a do `TextField` — borda que engrossa no foco, vermelha no erro — posta no
 * contêiner, porque é ele que tem a borda.
 */
function AdornedInput({
  prefix,
  suffix,
  invalid = false,
  describedBy,
  ...input
}: {
  prefix?: string;
  suffix?: string;
  invalid?: boolean;
  describedBy?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'prefix'>) {
  return (
    <div
      className={cn(
        'flex h-12 items-center gap-1.5 rounded-sm border bg-white px-3 transition-[border-color,box-shadow] duration-150 ease-standard sm:h-10',
        invalid
          ? 'border-error focus-within:shadow-[inset_0_0_0_1px_var(--color-error)]'
          : 'border-gray-300 focus-within:border-primary focus-within:shadow-[inset_0_0_0_1px_var(--color-primary)]',
      )}
    >
      {prefix && (
        <span aria-hidden="true" className="shrink-0 text-body2 text-gray-600">
          {prefix}
        </span>
      )}
      <input
        {...input}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="h-full min-w-0 flex-1 bg-transparent text-body1 text-gray-700 outline-none placeholder:text-gray-400"
      />
      {suffix && (
        <span aria-hidden="true" className="shrink-0 text-body2 text-gray-600">
          {suffix}
        </span>
      )}
    </div>
  );
}

/**
 * O aviso de uma regra da aba que não pertence a um campo só. Antes de salvar
 * é conselho (amarelo); depois que a aba foi recusada por ela, é o erro
 * (vermelho, `role="alert"`, e é para ele que a tela rola).
 */
function RuleNotice({
  id,
  refused,
  className,
  children,
}: {
  /** Para o `aria-describedby` dos controles que a regra envolve. */
  id: string;
  refused: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div id={id} data-field-error={refused ? '' : undefined} className={className}>
      <Banner tone={refused ? 'error' : 'warning'} role={refused ? 'alert' : undefined}>
        <span className={cn(refused && 'font-medium')}>{children}</span>
      </Banner>
    </div>
  );
}

/**
 * Uma forma de receber o pedido: entrega ou retirada. A caixa de seleção vem
 * com o ícone que o cliente vê no checkout, o título e uma frase do que muda
 * no cardápio ao ligar — é a tela onde o lojista decide se alguém consegue
 * pedir, e decidir errado aqui não aparece em lugar nenhum depois. Ligada, o
 * cartão abre com os campos daquela forma. Recusada a aba por não ter nenhuma
 * forma ligada, os dois cartões ganham a borda de erro.
 *
 * Os campos ficam escondidos, e não desmontados: campo fora da tela não é
 * enviado, e desligar a entrega por uma noite apagava todos os bairros.
 */
function OrderMode({
  name,
  checked,
  onChange,
  invalid,
  describedBy,
  icon,
  title,
  description,
  children,
}: {
  name: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  invalid: boolean;
  /** O aviso de "nenhuma forma de receber", enquanto ele está na tela. */
  describedBy?: string;
  icon: ReactNode;
  title: string;
  /** O que o cliente passa a ver no cardápio com esta forma ligada. */
  description: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-md border bg-white transition-colors duration-150 ease-standard',
        invalid ? 'border-error' : checked ? 'border-primary' : 'border-gray-300',
      )}
    >
      <label className="flex cursor-pointer items-start gap-3 p-4">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="mt-0.5 size-5 shrink-0 accent-primary"
        />
        <span className="min-w-0">
          <span className="flex items-center gap-2 text-body1 font-medium text-gray-700">
            <span className="text-primary">{icon}</span>
            {title}
          </span>
          <span className="mt-1 block text-body2 text-gray-600">{description}</span>
        </span>
      </label>

      <div hidden={!checked} className="space-y-4 border-t border-gray-200 p-4">
        {children}
      </div>
    </div>
  );
}
