'use client';

import { Bike, Check, Store, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { DeliveryRadiusMap } from '@/components/painel/delivery-radius-map';
import { ImageField } from '@/components/painel/image-field';
import { BUSINESS_SECTIONS, type BusinessSection } from '@/components/painel/business-sections';
import { useSetupCollapsed } from '@/components/painel/setup-collapsed';
import { nextPendingSection } from '@/components/painel/setup-steps';
import { useFormAction } from '@/components/use-form-action';
import { AddButton } from '@/components/ui/add-button';
import { Button } from '@/components/ui/button';
import { NavIcon } from '@/components/ui/button-icons';
import { Card } from '@/components/ui/card';
import { PhoneInput } from '@/components/ui/phone-input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/cn';
import { normalizeHexColor } from '@/lib/colors';
import { dayName, WEEKDAYS } from '@/lib/hours';
import { useUiText } from '@/lib/use-ui-text';
import { demoMode } from '@/lib/demo/config';
import { demoUpdateBusinessSectionAction } from '@/lib/demo/actions';
import { updateBusinessSectionAction, type FormState } from '@/server/actions/business';
import { addressPoint, type Coordinates } from '@/lib/delivery-area';
import type { Business, DeliveryPricing } from '@/lib/types';

const initialState: FormState = {};

interface ZoneRow {
  key: string;
  name: string;
  fee: string;
  eta: string;
}

interface DayRow {
  label: string;
  open: string;
  close: string;
  /** Desligado: os campos saem do envio e o servidor grava o dia como fechado. */
  enabled: boolean;
}

/** Faixa de quem liga um dia que nunca teve horário. A mesma do cadastro (`defaultHours`). */
const DEFAULT_RANGE = { open: '18:00', close: '23:00' };

/**
 * Uma aba de "Dados do negócio". Cada aba é um formulário próprio e salva só os
 * campos que mostra — ver `updateBusinessSectionAction`. O componente é um só
 * porque os campos dividem os mesmos auxiliares; quem decide o que aparece é a
 * prop `section`.
 */
export function BusinessForm({
  business,
  section,
  siteUrl,
}: {
  business: Business;
  section: BusinessSection;
  siteUrl: string;
}) {
  const uiText = useUiText();
  const { state, formProps, pending } = useFormAction(
    demoMode ? demoUpdateBusinessSectionAction : updateBusinessSectionAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [deliveryEnabled, setDeliveryEnabled] = useState(business.delivery.enabled);
  const [pickupEnabled, setPickupEnabled] = useState(business.pickup.enabled);
  const [brandColor, setBrandColor] = useState(business.brandColor);
  // Salvar com a logo ou a capa ainda subindo gravaria a imagem antiga sem avisar ninguém.
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const uploading = uploadingLogo || uploadingCover;
  const [pricing, setPricing] = useState<DeliveryPricing>(business.delivery.pricing);
  // O ponto que o mapa tem AGORA: o lojista pode marcar e escolher a cobrança
  // por km na mesma visita, sem salvar no meio.
  const [mapPoint, setMapPoint] = useState<Coordinates | null>(() => addressPoint(business.address));
  /*
   * O endereço é controlado, e não `defaultValue` como os outros campos de
   * texto, porque o mapa da mesma aba procura por ele: "Procurar meu endereço"
   * tem de achar a rua que está digitada na tela, não a que está gravada no
   * banco de uma visita anterior.
   */
  const [address, setAddress] = useState(business.address);
  const setAddressField = (
    field: 'street' | 'district' | 'city' | 'state' | 'postalCode',
    value: string,
  ) => setAddress((current) => ({ ...current, [field]: value }));
  /*
   * Dia fechado é dia sem faixa de horário. O interruptor não apaga o que está
   * digitado: quem fecha a segunda por um tempo volta a abrir com o horário de antes.
   */
  const [days, setDays] = useState<DayRow[]>(() =>
    WEEKDAYS.map((_, day) => {
      const label = dayName(day, uiText);
      const range = business.hours[day]?.[0];
      return { label, open: range?.open ?? '', close: range?.close ?? '', enabled: Boolean(range) };
    }),
  );
  const [zones, setZones] = useState<ZoneRow[]>(
    business.delivery.zones.map((zone) => ({
      key: zone.id,
      name: zone.name,
      fee: String(zone.fee),
      eta: zone.eta,
    })),
  );

  const router = useRouter();
  const [setupCollapsed] = useSetupCollapsed(business.id);
  /*
   * Enquanto falta configurar, salvar leva à próxima aba pendente — o mesmo
   * encadeamento que o checklist da tela de compartilhar propõe. Quem recolheu
   * o checklist não quer ser conduzido: aí salvar é só salvar.
   */
  const nextSection = setupCollapsed ? null : nextPendingSection(business, section);

  const error = (field: string) => state.fieldErrors?.[field];
  const hasFieldErrors = Boolean(state.fieldErrors && Object.keys(state.fieldErrors).length > 0);
  const meta = BUSINESS_SECTIONS[section];

  // Sem isto o lojista salva, o erro aparece fora da tela e nada parece ter acontecido.
  useEffect(() => {
    if (!hasFieldErrors) return;
    formRef.current
      ?.querySelector('[data-field-error]')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [state, hasFieldErrors]);

  /*
   * Depende de `state.success`, que só aparece quando o servidor confirmou a
   * gravação — nunca avança em cima de um erro.
   */
  useEffect(() => {
    if (!state.success || !nextSection) return;
    router.push(BUSINESS_SECTIONS[nextSection].href);
  }, [state.success, nextSection, router]);

  const setDay = (index: number, patch: Partial<DayRow>) =>
    setDays((current) => current.map((day, position) => (position === index ? { ...day, ...patch } : day)));

  /** Ligar um dia sem horário nenhum precisa de alguma faixa para o lojista ajustar. */
  const toggleDay = (index: number, enabled: boolean, day: DayRow) =>
    setDay(index, enabled && !day.open && !day.close ? { enabled, ...DEFAULT_RANGE } : { enabled });

  const addZone = () =>
    setZones((current) => [
      ...current,
      { key: `novo-${current.length}-${Date.now()}`, name: '', fee: '', eta: '' },
    ]);

  const updateZone = (key: string, patch: Partial<ZoneRow>) =>
    setZones((current) => current.map((zone) => (zone.key === key ? { ...zone, ...patch } : zone)));

  const removeZone = (key: string) =>
    setZones((current) => current.filter((zone) => zone.key !== key));

  return (
    <form ref={formRef} {...formProps} className="space-y-6" noValidate>
      <input type="hidden" name="businessId" value={business.id} />
      <input type="hidden" name="section" value={section} />

      <Card padding="md">
        <h2 className="text-subtitle font-bold text-gray-700">{meta.title}</h2>
        <p className="mb-5 mt-1 text-body2 text-gray-600">{meta.description}</p>

        <div className="space-y-4">
          {section === 'identidade' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome do restaurante" htmlFor="name" error={error('name')}>
                  <input
                    id="name"
                    name="name"
                    defaultValue={business.name}
                    placeholder="Ex.: Cantina da Nona"
                    className={cn(inputClass(!!error('name')), 'w-full')}
                  />
                </Field>

                <Field label="Descrição curta" htmlFor="tagline">
                  <input
                    id="tagline"
                    name="tagline"
                    defaultValue={business.tagline}
                    placeholder="Hamburgueria artesanal e petiscos"
                    className={cn(inputClass(false), 'w-full')}
                  />
                </Field>
              </div>

              <Field
                label="Endereço do cardápio"
                htmlFor="slug"
                error={error('slug')}
              >
                <div className="flex h-12 items-center gap-1 rounded-sm border border-gray-300 bg-white px-4 focus-within:border-primary">
                  <span className="shrink-0 text-body2 text-gray-600">{siteUrl}/r/</span>
                  <input
                    id="slug"
                    name="slug"
                    defaultValue={business.slug}
                    placeholder="cantina-da-nona"
                    className="w-full bg-transparent text-body1 text-gray-700 outline-none"
                  />
                </div>
              </Field>

              <Field
                label="Sobre o restaurante"
                htmlFor="description"
                hint="Texto de apresentação e também a descrição usada pelo Google."
              >
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  defaultValue={business.description}
                  placeholder="Massa fresca feita todo dia, receita da nona. Ambiente familiar e entrega no bairro."
                  className={cn(inputClass(false), 'h-auto w-full resize-none py-3')}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <ImageField
                  id="logo"
                  name="logo"
                  label="Logo do restaurante"
                  showLabel
                  businessId={business.id}
                  defaultValue={business.logo}
                  error={error('logo')}
                  kind="logo"
                  onBusyChange={setUploadingLogo}
                />

                <Field
                  label="Cor da marca"
                  htmlFor="brandColor"
                  error={error('brandColor')}                >
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      id="brandColor"
                      name="brandColor"
                      type="color"
                      value={brandColor}
                      onChange={(event) => setBrandColor(event.target.value)}
                      className="h-12 w-16 cursor-pointer rounded-sm border border-gray-300 bg-white p-1"
                    />
                    <span className="font-mono text-body2 text-gray-600">
                      {normalizeHexColor(brandColor)}
                    </span>
                  </div>
                </Field>
              </div>

              <div>
                <ImageField
                  id="cover"
                  name="cover"
                  label="Capa do cardápio"
                  showLabel
                  businessId={business.id}
                  defaultValue={business.cover ?? ''}
                  error={error('cover')}
                  kind="capa"
                  onBusyChange={setUploadingCover}
                />
                <p className="mt-1 text-caption text-gray-600">
                  Aparece no topo do cardápio, atrás da logo. Foto na horizontal fica melhor. Sem capa, o
                  cardápio usa o fundo padrão.
                </p>
              </div>
            </>
          )}

          {section === 'contato' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="WhatsApp que recebe os pedidos"
                htmlFor="whatsapp"
                error={error('whatsapp')}
              >
                <PhoneInput
                  id="whatsapp"
                  name="whatsapp"
                  defaultValue={business.whatsapp}
                  invalid={!!error('whatsapp')}
                />
              </Field>

              <Field label="Instagram" htmlFor="instagram">
                <input
                  id="instagram"
                  name="instagram"
                  defaultValue={business.instagram}
                  placeholder="@seurestaurante"
                  className={cn(inputClass(false), 'w-full')}
                />
              </Field>
            </div>
          )}

          {section === 'horarios' && (
            <>
              <p className="text-body2 text-gray-600">
                Desligue o dia em que o restaurante não abre. Horários que passam da meia-noite são
                aceitos.
              </p>
              <ul className="space-y-2">
                {days.map((day, index) => (
                  <li
                    key={day.label}
                    className="flex flex-wrap items-center gap-3 rounded-sm bg-gray-200 px-4 py-2.5"
                  >
                    <Switch
                      checked={day.enabled}
                      label={`${day.label}: abre neste dia`}
                      onChange={(next) => toggleDay(index, next, day)}
                    />
                    <span
                      className={cn(
                        'w-32 text-body2 font-medium',
                        day.enabled ? 'text-gray-700' : 'text-gray-600',
                      )}
                    >
                      {day.label}
                    </span>
                    {/* Escondido, não desmontado: `disabled` tira os campos do envio (o
                        servidor lê o dia como fechado) e o horário digitado fica guardado
                        para quando o dia voltar a abrir. */}
                    <div className={cn('items-center gap-3', day.enabled ? 'flex' : 'hidden')}>
                      <input
                        type="time"
                        name={`hours-${index}-open`}
                        value={day.open}
                        disabled={!day.enabled}
                        onChange={(event) => setDay(index, { open: event.target.value })}
                        aria-label={`${day.label}: abre às`}
                        className={cn(inputClass(false), 'h-10 w-auto')}
                      />
                      <span className="text-body2 text-gray-600">às</span>
                      <input
                        type="time"
                        name={`hours-${index}-close`}
                        value={day.close}
                        disabled={!day.enabled}
                        onChange={(event) => setDay(index, { close: event.target.value })}
                        aria-label={`${day.label}: fecha às`}
                        className={cn(inputClass(false), 'h-10 w-auto')}
                      />
                    </div>
                    {!day.enabled && <span className="text-body2 text-gray-600">Fechado</span>}
                  </li>
                ))}
              </ul>

              {error('hours') && <FormError>{error('hours')}</FormError>}
            </>
          )}

          {section === 'entrega' && (
            <>
              {/* O endereço abre a aba: dele saem a retirada, o rodapé do
                  cardápio e o ponto que o mapa logo abaixo vai procurar. Fica
                  fora do bloco da entrega de propósito — quem só faz retirada
                  também precisa dizer onde fica. */}
              <fieldset>
                <legend className="text-body2 font-semibold text-gray-700">
                  Endereço do restaurante
                </legend>
                <p className="mt-1 text-caption text-gray-600">
                  Aparece no rodapé do cardápio, na retirada e na busca do Google.
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Field label="Rua e número" htmlFor="street">
                    <input
                      id="street"
                      name="street"
                      value={address.street}
                      onChange={(event) => setAddressField('street', event.target.value)}
                      placeholder="Rua das Flores, 123"
                      className={cn(inputClass(false), 'w-full')}
                    />
                  </Field>
                  <Field label="Bairro" htmlFor="district">
                    <input
                      id="district"
                      name="district"
                      value={address.district}
                      onChange={(event) => setAddressField('district', event.target.value)}
                      placeholder="Vila Mariana"
                      className={cn(inputClass(false), 'w-full')}
                    />
                  </Field>
                  <Field label="Cidade" htmlFor="city">
                    <input
                      id="city"
                      name="city"
                      value={address.city}
                      onChange={(event) => setAddressField('city', event.target.value)}
                      placeholder="São Paulo"
                      className={cn(inputClass(false), 'w-full')}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="UF" htmlFor="state">
                      <input
                        id="state"
                        name="state"
                        maxLength={2}
                        value={address.state}
                        onChange={(event) => setAddressField('state', event.target.value)}
                        placeholder="SP"
                        className={cn(inputClass(false), 'w-full')}
                      />
                    </Field>
                    <Field label="CEP" htmlFor="postalCode">
                      <input
                        id="postalCode"
                        name="postalCode"
                        value={address.postalCode}
                        onChange={(event) => setAddressField('postalCode', event.target.value)}
                        placeholder="00000-000"
                        className={cn(inputClass(false), 'w-full')}
                      />
                    </Field>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-body2 font-semibold text-gray-700">
                  Como o cliente recebe o pedido
                </legend>
                <p className="mt-1 text-caption text-gray-600">
                  Ligue o que o seu restaurante faz: o cliente só vê as opções ligadas aqui.
                </p>
              </fieldset>

              <OrderMode
                name="deliveryEnabled"
                checked={deliveryEnabled}
                onChange={setDeliveryEnabled}
                icon={<Bike aria-hidden="true" className="size-5" />}
                title="Entrega (delivery)"
                description="Você leva o pedido até o cliente. A taxa de entrega entra no total."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Pedido mínimo (R$)" htmlFor="minOrder" hint="0 desativa o mínimo.">
                    <input
                      id="minOrder"
                      name="minOrder"
                      inputMode="decimal"
                      defaultValue={business.delivery.minOrder || ''}
                      placeholder="0,00"
                      className={cn(inputClass(false), 'w-full')}
                    />
                  </Field>
                  <Field label="Frete grátis acima de (R$)" htmlFor="freeAbove" hint="0 desativa o frete grátis.">
                    <input
                      id="freeAbove"
                      name="freeAbove"
                      inputMode="decimal"
                      defaultValue={business.delivery.freeAbove || ''}
                      placeholder="0,00"
                      className={cn(inputClass(false), 'w-full')}
                    />
                  </Field>
                </div>

                <DeliveryRadiusMap
                  address={address}
                  defaultRadiusKm={business.delivery.radiusKm}
                  onPointChange={setMapPoint}
                />

                <fieldset>
                  <legend className="text-body2 font-semibold text-gray-700">Como você cobra a entrega</legend>
                  <p className="mt-1 text-caption text-gray-600">
                    Uma das duas: o cliente escolhe o bairro numa lista, ou informa o CEP e o sistema
                    calcula pela distância.
                  </p>

                  {/* O que a action lê; o controle acima é quem o move. */}
                  <input type="hidden" name="deliveryPricing" value={pricing} />
                  <SegmentedControl
                    label="Como você cobra a entrega"
                    className="mt-3"
                    value={pricing}
                    onChange={setPricing}
                    options={[
                      { value: 'zones', label: 'Por bairro' },
                      { value: 'distance', label: 'Por distância' },
                    ]}
                  />

                  {pricing === 'distance' && !mapPoint && (
                    <p className="mt-3 rounded-sm bg-warning-bg px-4 py-3 text-body2 text-gray-700">
                      Marque o restaurante no mapa acima: sem o ponto não há de onde medir a distância, e
                      a cobrança volta a ser por bairro.
                    </p>
                  )}
                </fieldset>

                <div hidden={pricing !== 'distance'} className="grid gap-4 sm:grid-cols-3">
                  <Field
                    label="Taxa base (R$)"
                    htmlFor="distanceBaseFee"
                    hint="Cobre os primeiros quilômetros."
                  >
                    <input
                      id="distanceBaseFee"
                      name="distanceBaseFee"
                      inputMode="decimal"
                      defaultValue={business.delivery.distance.baseFee || ''}
                      placeholder="5,00"
                      className={cn(inputClass(false), 'w-full')}
                    />
                  </Field>
                  <Field label="A taxa base cobre até (km)" htmlFor="distanceBaseKm">
                    <input
                      id="distanceBaseKm"
                      name="distanceBaseKm"
                      inputMode="decimal"
                      defaultValue={business.delivery.distance.baseKm || ''}
                      placeholder="3"
                      className={cn(inputClass(false), 'w-full')}
                    />
                  </Field>
                  <Field
                    label="Por km adicional (R$)"
                    htmlFor="distancePerKmFee"
                    hint="0 mantém a taxa base em toda a área."
                  >
                    <input
                      id="distancePerKmFee"
                      name="distancePerKmFee"
                      inputMode="decimal"
                      defaultValue={business.delivery.distance.perKmFee || ''}
                      placeholder="1,50"
                      className={cn(inputClass(false), 'w-full')}
                    />
                  </Field>
                  <p className="text-caption text-gray-600 sm:col-span-3">
                    A distância é em linha reta entre o restaurante e o CEP do cliente — sempre menor que
                    o caminho da moto. O raio do mapa é o limite: fora dele, o pedido chega marcado para
                    você combinar a entrega.
                  </p>
                </div>

                {/* Escondido, não desmontado: desligado por engano, os bairros
                    já cadastrados continuariam no formulário para voltar. */}
                <fieldset hidden={pricing !== 'zones'}>
                  <legend className="text-body2 font-semibold text-gray-700">Bairros atendidos</legend>
                  <p className="mt-1 text-caption text-gray-600">
                    O cliente escolhe o bairro ao finalizar e a taxa entra no total.
                  </p>

                  <ul className="mt-3 space-y-2">
                    {zones.map((zone) => (
                      <li key={zone.key} className="flex flex-wrap items-center gap-2 rounded-sm bg-gray-50 p-2">
                        <input
                          name="zone-name"
                          value={zone.name}
                          onChange={(event) => updateZone(zone.key, { name: event.target.value })}
                          placeholder="Bairro"
                          aria-label="Nome do bairro"
                          className={cn(inputClass(false), 'h-10 min-w-40 flex-1')}
                        />
                        <input
                          name="zone-fee"
                          value={zone.fee}
                          onChange={(event) => updateZone(zone.key, { fee: event.target.value })}
                          placeholder="Taxa"
                          inputMode="decimal"
                          aria-label="Taxa de entrega"
                          className={cn(inputClass(false), 'h-10 w-24')}
                        />
                        <input
                          name="zone-eta"
                          value={zone.eta}
                          onChange={(event) => updateZone(zone.key, { eta: event.target.value })}
                          placeholder="30-45 min"
                          aria-label="Prazo de entrega"
                          className={cn(inputClass(false), 'h-10 w-32')}
                        />
                        <button
                          type="button"
                          onClick={() => removeZone(zone.key)}
                          aria-label={`Remover ${zone.name || 'bairro'}`}
                          className="press grid size-10 place-items-center rounded-full text-gray-600 hover:bg-gray-100 hover:text-primary"
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>

                  <AddButton type="button" onClick={addZone} className="mt-3">
                    Adicionar bairro
                  </AddButton>
                </fieldset>
              </OrderMode>

              <OrderMode
                name="pickupEnabled"
                checked={pickupEnabled}
                onChange={setPickupEnabled}
                icon={<Store aria-hidden="true" className="size-5" />}
                title="Retirada no local"
                description="O cliente busca o pedido no balcão, no endereço acima. Sem taxa de entrega."
              >
                <Field
                  label="Tempo de preparo para retirada"
                  htmlFor="pickupEta"
                  hint="O cliente lê como “Fica pronto em 20-30 min”. Deixe em branco se o tempo varia muito."
                >
                  <input
                    id="pickupEta"
                    name="pickupEta"
                    defaultValue={business.pickup.eta}
                    placeholder="20-30 min"
                    className={cn(inputClass(false), 'w-full')}
                  />
                </Field>
              </OrderMode>

              {!deliveryEnabled && !pickupEnabled && (
                <p className="rounded-sm bg-warning-bg px-4 py-3 text-body2 text-gray-700">
                  Ligue a entrega, a retirada ou as duas. Com as duas desligadas o cliente vê o
                  cardápio, mas não tem como concluir o pedido — e esta aba não salva.
                </p>
              )}
              {error('orderModes') && <FormError>{error('orderModes')}</FormError>}
            </>
          )}
        </div>
      </Card>

      {/* O retorno do salvamento mora junto do botão, que é o que está na tela. */}
      {/* Fundo sólido: flutuando sobre o texto, o botão ficava ilegível. */}
      {/* A camada é declarada: `sticky` sozinho não ganha de conteúdo posicionado. */}
      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-3 bg-gray-50 px-1 py-4">
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {hasFieldErrors && <Alert tone="error">Não foi salvo: revise o campo destacado.</Alert>}
        {state.success && !pending && (
          <Alert tone="success">
            <Check aria-hidden="true" className="size-4 shrink-0 text-success" />
            {state.success}
          </Alert>
        )}
        <Button
          type="submit"
          loading={pending}
          disabled={uploading}
          leading={<Check className="size-5" />}
          after={nextSection ? <NavIcon /> : undefined}
        >
          {nextSection ? 'Salvar e continuar' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-body2 font-medium text-gray-700">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-caption text-gray-600">{hint}</p>}
      {error && (
        <p role="alert" data-field-error className="mt-1 text-caption font-medium text-error">
          {error}
        </p>
      )}
    </div>
  );
}

/** Erro de uma regra que não pertence a um campo só (horários, entrega). */
function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" data-field-error className="mt-3 text-body2 font-medium text-error">
      {children}
    </p>
  );
}

function Alert({ tone, children }: { tone: 'error' | 'success'; children: React.ReactNode }) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-center gap-2 rounded-sm px-4 py-3 text-body2 font-medium',
        tone === 'error' ? 'bg-error-bg text-gray-700' : 'bg-white text-gray-700 shadow-low',
      )}
    >
      {children}
    </p>
  );
}

/**
 * Uma forma de receber o pedido: entrega ou retirada. A caixa de seleção vem
 * com o ícone que o cliente vê no checkout, o título e uma frase do que muda
 * no cardápio ao ligar — é a tela onde o lojista decide se alguém consegue
 * pedir, e decidir errado aqui não aparece em lugar nenhum depois. Ligada, o
 * cartão abre com os campos daquela forma.
 *
 * Os campos ficam escondidos, e não desmontados: campo fora da tela não é
 * enviado, e desligar a entrega por uma noite apagava todos os bairros.
 */
function OrderMode({
  name,
  checked,
  onChange,
  icon,
  title,
  description,
  children,
}: {
  name: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  icon: React.ReactNode;
  title: string;
  /** O que o cliente passa a ver no cardápio com esta forma ligada. */
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-md border bg-white transition-colors duration-150 ease-standard',
        checked ? 'border-primary' : 'border-gray-300',
      )}
    >
      <label className="flex cursor-pointer items-start gap-3 p-4">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
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

/**
 * Receita do campo. A largura NÃO entra aqui: sem tailwind-merge, um `w-full`
 * embutido disputaria com o `w-auto` de quem chama e venceria conforme a ordem
 * do CSS — foi assim que os campos de horário viraram uma coluna.
 */
function inputClass(invalid: boolean): string {
  return cn(
    'h-12 rounded-sm border bg-white px-4 text-body1 text-gray-700 transition-colors duration-150 ease-standard placeholder:text-gray-400 focus:outline-none',
    invalid ? 'border-error' : 'border-gray-300 focus:border-primary',
  );
}
