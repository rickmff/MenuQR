'use client';

import { Check, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ImageField } from '@/components/painel/image-field';
import { BUSINESS_SECTIONS, ONBOARDING_ORDER } from '@/components/painel/business-sections';
import { useOnboarding } from '@/components/painel/onboarding';
import { useFormAction } from '@/components/use-form-action';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { normalizeHexColor } from '@/lib/colors';
import { DAY_NAMES } from '@/lib/hours';
import { demoMode } from '@/lib/demo/config';
import { demoUpdateBusinessSectionAction } from '@/lib/demo/actions';
import { updateBusinessSectionAction, type BusinessSection, type FormState } from '@/server/actions/business';
import type { Business } from '@/lib/types';

const initialState: FormState = {};

const PAYMENT_OPTIONS = [
  'Pix',
  'Dinheiro',
  'Cartão de crédito',
  'Cartão de débito',
  'Vale-refeição',
  'Vale-alimentação',
];

interface ZoneRow {
  key: string;
  name: string;
  fee: string;
  eta: string;
}

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
  const { state, formProps, pending } = useFormAction(
    demoMode ? demoUpdateBusinessSectionAction : updateBusinessSectionAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [deliveryEnabled, setDeliveryEnabled] = useState(business.delivery.enabled);
  const [pickupEnabled, setPickupEnabled] = useState(business.pickup.enabled);
  const [brandColor, setBrandColor] = useState(business.brandColor);
  // Salvar com a logo ainda subindo gravaria a imagem antiga sem avisar ninguém.
  const [uploading, setUploading] = useState(false);
  const [zones, setZones] = useState<ZoneRow[]>(
    business.delivery.zones.map((zone) => ({
      key: zone.id,
      name: zone.name,
      fee: String(zone.fee),
      eta: zone.eta,
    })),
  );

  const onboarding = useOnboarding(business.id);
  const router = useRouter();
  // O guia só interfere enquanto está ativo: fora dele, salvar é só salvar.
  const guiding = onboarding.active;

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
   * No guia de primeira visita, salvar marca a aba como conferida e leva à
   * próxima. Depende de `state.success`, que só aparece quando o servidor
   * confirmou a gravação — nunca avança em cima de um erro.
   */
  useEffect(() => {
    if (!guiding || !state.success) return;
    onboarding.complete(section);
    const next = ONBOARDING_ORDER.find(
      (entry) => entry !== section && !onboarding.done.includes(entry),
    );
    if (next) router.push(BUSINESS_SECTIONS[next].href);
  }, [guiding, state.success, section, onboarding, router]);

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
                    className={cn(inputClass(!!error('name')), 'w-full')}
                  />
                </Field>

                <Field label="Descrição curta" htmlFor="tagline" hint="Aparece embaixo do nome.">
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
                hint="Mudar o endereço quebra links já divulgados."
              >
                <div className="flex h-12 items-center gap-1 rounded-sm border border-gray-300 bg-white px-4 focus-within:border-primary">
                  <span className="shrink-0 text-body2 text-gray-600">{siteUrl}/r/</span>
                  <input
                    id="slug"
                    name="slug"
                    defaultValue={business.slug}
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
                  className={cn(inputClass(false), 'h-auto w-full resize-none py-3')}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <ImageField
                  id="logo"
                  name="logo"
                  label="Logo"
                  businessId={business.id}
                  defaultValue={business.logo}
                  error={error('logo')}
                  onBusyChange={setUploading}
                />

                <Field
                  label="Cor da marca"
                  htmlFor="brandColor"
                  error={error('brandColor')}
                  hint="Usada no ícone do aplicativo instalado e na imagem que aparece ao compartilhar o link. O cardápio em si segue o visual padrão."
                >
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
            </>
          )}

          {section === 'contato' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="WhatsApp que recebe os pedidos"
                htmlFor="whatsapp"
                error={error('whatsapp')}
                hint="DDD + número. O 55 do Brasil entra sozinho."
              >
                <input
                  id="whatsapp"
                  name="whatsapp"
                  type="tel"
                  inputMode="tel"
                  defaultValue={business.whatsapp}
                  className={cn(inputClass(!!error('whatsapp')), 'w-full')}
                />
              </Field>

              <Field label="E-mail" htmlFor="email" error={error('email')}>
                <input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={business.email}
                  className={cn(inputClass(!!error('email')), 'w-full')}
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

              <Field label="Chave Pix" htmlFor="pixKey" hint="Enviada ao cliente quando ele escolhe Pix.">
                <input id="pixKey" name="pixKey" defaultValue={business.pixKey} className={cn(inputClass(false), 'w-full')} />
              </Field>
            </div>
          )}

          {section === 'endereco' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Rua e número" htmlFor="street">
                <input id="street" name="street" defaultValue={business.address.street} className={cn(inputClass(false), 'w-full')} />
              </Field>
              <Field label="Bairro" htmlFor="district">
                <input id="district" name="district" defaultValue={business.address.district} className={cn(inputClass(false), 'w-full')} />
              </Field>
              <Field label="Cidade" htmlFor="city">
                <input id="city" name="city" defaultValue={business.address.city} className={cn(inputClass(false), 'w-full')} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="UF" htmlFor="state">
                  <input id="state" name="state" maxLength={2} defaultValue={business.address.state} className={cn(inputClass(false), 'w-full')} />
                </Field>
                <Field label="CEP" htmlFor="postalCode">
                  <input id="postalCode" name="postalCode" defaultValue={business.address.postalCode} className={cn(inputClass(false), 'w-full')} />
                </Field>
              </div>
            </div>
          )}

          {section === 'horarios' && (
            <>
              <p className="text-body2 text-gray-600">
                Deixe em branco para marcar o dia como fechado. Horários que passam da meia-noite são
                aceitos.
              </p>
              <ul className="space-y-2">
                {DAY_NAMES.map((label, day) => {
                  const range = business.hours[day]?.[0];
                  return (
                    <li key={label} className="flex flex-wrap items-center gap-3 rounded-sm bg-gray-50 px-4 py-2.5">
                      <span className="w-32 text-body2 font-medium text-gray-700">{label}</span>
                      <input
                        type="time"
                        name={`hours-${day}-open`}
                        defaultValue={range?.open ?? ''}
                        aria-label={`${label}: abre às`}
                        className={cn(inputClass(false), 'h-10 w-auto')}
                      />
                      <span className="text-body2 text-gray-600">às</span>
                      <input
                        type="time"
                        name={`hours-${day}-close`}
                        defaultValue={range?.close ?? ''}
                        aria-label={`${label}: fecha às`}
                        className={cn(inputClass(false), 'h-10 w-auto')}
                      />
                    </li>
                  );
                })}
              </ul>

              {error('hours') && <FormError>{error('hours')}</FormError>}

              <Checkbox
                name="acceptOrdersWhenClosed"
                defaultChecked={business.acceptOrdersWhenClosed}
                label="Aceitar pedidos com a loja fechada (agendados)"
              />
            </>
          )}

          {section === 'entrega' && (
            <>
              <Checkbox
                name="deliveryEnabled"
                checked={deliveryEnabled}
                onChange={setDeliveryEnabled}
                label="Fazemos entrega (delivery)"
              />

              {/* Escondido, não desmontado: campo fora da tela não é enviado, e
                  desligar a entrega por uma noite apagava todos os bairros. */}
              <div hidden={!deliveryEnabled} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Pedido mínimo (R$)" htmlFor="minOrder" hint="0 desativa o mínimo.">
                    <input
                      id="minOrder"
                      name="minOrder"
                      inputMode="decimal"
                      defaultValue={business.delivery.minOrder || ''}
                      className={cn(inputClass(false), 'w-full')}
                    />
                  </Field>
                  <Field label="Frete grátis acima de (R$)" htmlFor="freeAbove" hint="0 desativa o frete grátis.">
                    <input
                      id="freeAbove"
                      name="freeAbove"
                      inputMode="decimal"
                      defaultValue={business.delivery.freeAbove || ''}
                      className={cn(inputClass(false), 'w-full')}
                    />
                  </Field>
                </div>

                <fieldset>
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

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addZone}
                    leading={<Plus className="size-4" />}
                    className="mt-3"
                  >
                    Adicionar bairro
                  </Button>
                </fieldset>
              </div>

              <Checkbox
                name="pickupEnabled"
                checked={pickupEnabled}
                onChange={setPickupEnabled}
                label="Aceitamos retirada no local"
              />

              <div hidden={!pickupEnabled}>
                <Field label="Tempo de preparo para retirada" htmlFor="pickupEta">
                  <input
                    id="pickupEta"
                    name="pickupEta"
                    defaultValue={business.pickup.eta}
                    placeholder="20-30 min"
                    className={cn(inputClass(false), 'w-full')}
                  />
                </Field>
              </div>

              {!deliveryEnabled && !pickupEnabled && (
                <p className="rounded-sm bg-warning-bg px-4 py-3 text-body2 text-gray-700">
                  Com entrega e retirada desligadas, o cliente não tem como fazer o pedido.
                </p>
              )}
              {error('orderModes') && <FormError>{error('orderModes')}</FormError>}
            </>
          )}

          {section === 'pagamentos' && (
            <>
              <ul className="grid gap-2 sm:grid-cols-2">
                {PAYMENT_OPTIONS.map((payment) => (
                  <li key={payment}>
                    <Checkbox
                      name="payments"
                      value={payment}
                      defaultChecked={business.payments.includes(payment)}
                      label={payment}
                      boxed
                    />
                  </li>
                ))}
              </ul>
              {error('payments') && <FormError>{error('payments')}</FormError>}
            </>
          )}
        </div>
      </Card>

      {/* O retorno do salvamento mora junto do botão, que é o que está na tela. */}
      {/* Fundo sólido: flutuando sobre o texto, o botão ficava ilegível. */}
      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-end gap-3 bg-gray-50 px-1 py-4">
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {hasFieldErrors && <Alert tone="error">Não foi salvo: revise o campo destacado.</Alert>}
        {state.success && !pending && (
          <Alert tone="success">
            <Check aria-hidden="true" className="size-4 shrink-0 text-success" />
            {state.success}
          </Alert>
        )}
        <Button type="submit" loading={pending} disabled={uploading}>
          {guiding ? 'Salvar e continuar' : 'Salvar alterações'}
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

/** Erro de uma regra que não pertence a um campo só (horários, pagamentos). */
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

/** Caixa de seleção no padrão do sistema: o input nativo continua por baixo. */
function Checkbox({
  name,
  value,
  label,
  checked,
  defaultChecked,
  onChange,
  boxed = false,
}: {
  name: string;
  value?: string;
  label: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (next: boolean) => void;
  /** Com fundo, para as listas de opções. */
  boxed?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-2.5 text-body2 text-gray-700',
        boxed && 'rounded-sm bg-gray-50 px-4 py-3',
      )}
    >
      <input
        type="checkbox"
        name={name}
        value={value}
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange ? (event) => onChange(event.target.checked) : undefined}
        className="size-5 accent-primary"
      />
      {label}
    </label>
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
