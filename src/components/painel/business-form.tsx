'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormAction } from '@/components/use-form-action';
import { normalizeHexColor, readableOnLight, readableTextColor } from '@/lib/colors';
import { DAY_NAMES } from '@/lib/hours';
import { demoMode } from '@/lib/demo/config';
import { demoUpdateBusinessAction } from '@/lib/demo/actions';
import { updateBusinessAction, type FormState } from '@/server/actions/business';
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

export function BusinessForm({ business, siteUrl }: { business: Business; siteUrl: string }) {
  const { state, formProps, pending } = useFormAction(
    demoMode ? demoUpdateBusinessAction : updateBusinessAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [deliveryEnabled, setDeliveryEnabled] = useState(business.delivery.enabled);
  const [pickupEnabled, setPickupEnabled] = useState(business.pickup.enabled);
  const [brandColor, setBrandColor] = useState(business.brandColor);
  const [zones, setZones] = useState<ZoneRow[]>(
    business.delivery.zones.map((zone) => ({
      key: zone.id,
      name: zone.name,
      fee: String(zone.fee),
      eta: zone.eta,
    })),
  );

  const error = (field: string) => state.fieldErrors?.[field];
  const hasFieldErrors = Boolean(state.fieldErrors && Object.keys(state.fieldErrors).length > 0);

  // O formulário é longo e o botão fica fixo no rodapé: sem isto o lojista
  // clica em salvar, o erro aparece lá em cima e nada parece ter acontecido.
  useEffect(() => {
    if (!hasFieldErrors) return;
    formRef.current
      ?.querySelector('[data-field-error]')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [state, hasFieldErrors]);

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
    <form ref={formRef} {...formProps} className="space-y-8" noValidate>
      <input type="hidden" name="businessId" value={business.id} />

      {/* ------------------------------------------------------- identidade */}
      <Card title="Identidade" description="Como o restaurante aparece no topo do cardápio.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome do restaurante" htmlFor="name" error={error('name')}>
            <input id="name" name="name" defaultValue={business.name} className={inputClass(!!error('name'))} />
          </Field>

          <Field label="Descrição curta" htmlFor="tagline" hint="Aparece embaixo do nome.">
            <input
              id="tagline"
              name="tagline"
              defaultValue={business.tagline}
              placeholder="Hamburgueria artesanal e petiscos"
              className={inputClass(false)}
            />
          </Field>
        </div>

        <Field
          label="Endereço do cardápio"
          htmlFor="slug"
          error={error('slug')}
          hint="Mudar o endereço quebra links já divulgados."
        >
          <div className="flex items-center gap-1 rounded-md border border-ink-200 bg-white px-4 py-3 focus-within:border-flame-500">
            <span className="shrink-0 text-body2 text-ink-500">{siteUrl}/r/</span>
            <input
              id="slug"
              name="slug"
              defaultValue={business.slug}
              className="w-full bg-transparent text-body1 outline-none"
            />
          </div>
        </Field>

        <Field label="Sobre o restaurante" htmlFor="description" hint="Texto de apresentação e também a descrição usada pelo Google.">
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={business.description}
            className={inputClass(false)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Logo (emoji ou URL de imagem)" htmlFor="logo" error={error('logo')}>
            <input id="logo" name="logo" defaultValue={business.logo} className={inputClass(!!error('logo'))} />
          </Field>

          <Field
            label="Cor da marca"
            htmlFor="brandColor"
            error={error('brandColor')}
            hint="Em textos usamos um tom mais escuro da sua cor, para o cliente conseguir ler."
          >
            <div className="flex flex-wrap items-center gap-3">
              <input
                id="brandColor"
                name="brandColor"
                type="color"
                value={brandColor}
                onChange={(event) => setBrandColor(event.target.value)}
                className="h-12 w-16 cursor-pointer rounded-md border border-ink-200 bg-white p-1"
              />
              <span className="font-mono text-body2 text-ink-500">{brandColor}</span>

              {/* Prévia de como a cor aparece no cardápio. */}
              <span
                className="rounded-md px-3 py-2 text-body2 font-semibold"
                style={{
                  backgroundColor: normalizeHexColor(brandColor),
                  color: readableTextColor(normalizeHexColor(brandColor)),
                }}
              >
                Ver sacola
              </span>
              <span
                className="text-body2 font-semibold"
                style={{ color: readableOnLight(normalizeHexColor(brandColor)) }}
              >
                Texto e destaques
              </span>
            </div>
          </Field>
        </div>
      </Card>

      {/* ---------------------------------------------------------- contato */}
      <Card title="Contato" description="O WhatsApp é para onde os pedidos são enviados.">
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
              className={inputClass(!!error('whatsapp'))}
            />
          </Field>

          <Field label="E-mail" htmlFor="email" error={error('email')}>
            <input id="email" name="email" type="email" defaultValue={business.email} className={inputClass(!!error('email'))} />
          </Field>

          <Field label="Instagram" htmlFor="instagram">
            <input id="instagram" name="instagram" defaultValue={business.instagram} placeholder="@seurestaurante" className={inputClass(false)} />
          </Field>

          <Field label="Chave Pix" htmlFor="pixKey" hint="Enviada ao cliente quando ele escolhe Pix.">
            <input id="pixKey" name="pixKey" defaultValue={business.pixKey} className={inputClass(false)} />
          </Field>
        </div>
      </Card>

      {/* --------------------------------------------------------- endereço */}
      <Card title="Endereço" description="Usado na retirada, no rodapé do cardápio e no SEO local.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rua e número" htmlFor="street">
            <input id="street" name="street" defaultValue={business.address.street} className={inputClass(false)} />
          </Field>
          <Field label="Bairro" htmlFor="district">
            <input id="district" name="district" defaultValue={business.address.district} className={inputClass(false)} />
          </Field>
          <Field label="Cidade" htmlFor="city">
            <input id="city" name="city" defaultValue={business.address.city} className={inputClass(false)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="UF" htmlFor="state">
              <input id="state" name="state" maxLength={2} defaultValue={business.address.state} className={inputClass(false)} />
            </Field>
            <Field label="CEP" htmlFor="postalCode">
              <input id="postalCode" name="postalCode" defaultValue={business.address.postalCode} className={inputClass(false)} />
            </Field>
          </div>
        </div>
      </Card>

      {/* --------------------------------------------------------- horários */}
      <Card
        title="Horário de funcionamento"
        description="Deixe em branco para marcar o dia como fechado. Horários que passam da meia-noite são aceitos."
      >
        <ul className="space-y-2">
          {DAY_NAMES.map((label, day) => {
            const range = business.hours[day]?.[0];
            return (
              <li key={label} className="flex flex-wrap items-center gap-3 rounded-md bg-ink-100 px-4 py-2.5">
                <span className="w-32 text-body2 font-medium">{label}</span>
                <input
                  type="time"
                  name={`hours-${day}-open`}
                  defaultValue={range?.open ?? ''}
                  aria-label={`${label}: abre às`}
                  className="field-input w-auto py-2 text-body2"
                />
                <span className="text-body2 text-ink-500">às</span>
                <input
                  type="time"
                  name={`hours-${day}-close`}
                  defaultValue={range?.close ?? ''}
                  aria-label={`${label}: fecha às`}
                  className="field-input w-auto py-2 text-body2"
                />
              </li>
            );
          })}
        </ul>

        {error('hours') && <FormError>{error('hours')}</FormError>}

        <label className="mt-4 flex items-center gap-2.5 text-body2">
          <input
            type="checkbox"
            name="acceptOrdersWhenClosed"
            defaultChecked={business.acceptOrdersWhenClosed}
            className="size-5 accent-flame-500"
          />
          Aceitar pedidos com a loja fechada (agendados)
        </label>
      </Card>

      {/* ---------------------------------------------------------- entrega */}
      <Card title="Entrega e retirada" description="Taxas, prazos e regras que aparecem no carrinho.">
        <div className="space-y-4">
          <label className="flex items-center gap-2.5 text-body2 font-medium">
            <input
              type="checkbox"
              name="deliveryEnabled"
              checked={deliveryEnabled}
              onChange={(event) => setDeliveryEnabled(event.target.checked)}
              className="size-5 accent-flame-500"
            />
            Fazemos entrega (delivery)
          </label>

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
                  className={inputClass(false)}
                />
              </Field>
              <Field label="Frete grátis acima de (R$)" htmlFor="freeAbove" hint="0 desativa o frete grátis.">
                <input
                  id="freeAbove"
                  name="freeAbove"
                  inputMode="decimal"
                  defaultValue={business.delivery.freeAbove || ''}
                  className={inputClass(false)}
                />
              </Field>
            </div>

            <fieldset>
              <legend className="text-body2 font-semibold">Bairros atendidos</legend>
              <p className="mt-1 text-caption text-ink-500">
                O cliente escolhe o bairro no carrinho e a taxa entra no total.
              </p>

              <ul className="mt-3 space-y-2">
                {zones.map((zone) => (
                  <li key={zone.key} className="flex flex-wrap items-center gap-2 rounded-md bg-ink-100 p-2">
                    <input
                      name="zone-name"
                      value={zone.name}
                      onChange={(event) => updateZone(zone.key, { name: event.target.value })}
                      placeholder="Bairro"
                      aria-label="Nome do bairro"
                      className="field-input min-w-40 flex-1 py-2 text-body2"
                    />
                    <input
                      name="zone-fee"
                      value={zone.fee}
                      onChange={(event) => updateZone(zone.key, { fee: event.target.value })}
                      placeholder="Taxa"
                      inputMode="decimal"
                      aria-label="Taxa de entrega"
                      className="field-input w-24 py-2 text-body2"
                    />
                    <input
                      name="zone-eta"
                      value={zone.eta}
                      onChange={(event) => updateZone(zone.key, { eta: event.target.value })}
                      placeholder="30-45 min"
                      aria-label="Prazo de entrega"
                      className="field-input w-32 py-2 text-body2"
                    />
                    <button
                      type="button"
                      onClick={() => removeZone(zone.key)}
                      className="rounded-sm px-3 py-2 text-body2 text-ink-500 hover:text-flame-600"
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={addZone}
                className="mt-3 rounded-md border border-ink-200 bg-white px-4 py-2 text-body2 font-semibold hover:border-flame-400"
              >
                + Adicionar bairro
              </button>
            </fieldset>
          </div>

          <label className="flex items-center gap-2.5 text-body2 font-medium">
            <input
              type="checkbox"
              name="pickupEnabled"
              checked={pickupEnabled}
              onChange={(event) => setPickupEnabled(event.target.checked)}
              className="size-5 accent-flame-500"
            />
            Aceitamos retirada no local
          </label>

          <div hidden={!pickupEnabled}>
            <Field label="Tempo de preparo para retirada" htmlFor="pickupEta">
              <input
                id="pickupEta"
                name="pickupEta"
                defaultValue={business.pickup.eta}
                placeholder="20-30 min"
                className={inputClass(false)}
              />
            </Field>
          </div>

          {!deliveryEnabled && !pickupEnabled && (
            <p className="rounded-md bg-flame-50 px-4 py-3 text-body2 text-flame-700">
              Com entrega e retirada desligadas, o cliente não tem como fazer o pedido.
            </p>
          )}
          {error('orderModes') && <FormError>{error('orderModes')}</FormError>}
        </div>
      </Card>

      {/* -------------------------------------------------------- pagamento */}
      <Card title="Formas de pagamento" description="Aparecem para o cliente escolher no carrinho.">
        <ul className="grid gap-2 sm:grid-cols-2">
          {PAYMENT_OPTIONS.map((payment) => (
            <li key={payment}>
              <label className="flex items-center gap-2.5 rounded-md bg-ink-100 px-4 py-3 text-body2">
                <input
                  type="checkbox"
                  name="payments"
                  value={payment}
                  defaultChecked={business.payments.includes(payment)}
                  className="size-5 accent-flame-500"
                />
                {payment}
              </label>
            </li>
          ))}
        </ul>
        {error('payments') && <FormError>{error('payments')}</FormError>}
      </Card>

      {/* O retorno do salvamento mora junto do botão, que é o que está na tela. */}
      <div className="sticky bottom-4 flex flex-wrap items-center justify-end gap-3">
        {state.error && (
          <p role="alert" className="rounded-md bg-flame-50 px-4 py-3 text-body2 font-medium text-flame-700 shadow-soft">
            {state.error}
          </p>
        )}
        {hasFieldErrors && (
          <p role="alert" className="rounded-md bg-flame-50 px-4 py-3 text-body2 font-medium text-flame-700 shadow-soft">
            Não foi salvo: revise o campo destacado.
          </p>
        )}
        {state.success && !pending && (
          <p role="status" className="rounded-md bg-white px-4 py-3 text-body2 font-medium text-whatsapp-600 shadow-soft">
            ✓ {state.success}
          </p>
        )}
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface p-6">
      <h2 className="font-display text-subtitle font-semibold">{title}</h2>
      <p className="mb-5 mt-1 text-body2 text-ink-500">{description}</p>
      <div className="space-y-4">{children}</div>
    </section>
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
      <label htmlFor={htmlFor} className="mb-1.5 block text-body2 font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-caption text-ink-500">{hint}</p>}
      {error && (
        <p role="alert" data-field-error className="mt-1 text-caption font-medium text-flame-600">
          {error}
        </p>
      )}
    </div>
  );
}

/** Erro de uma regra que não pertence a um campo só (horários, pagamentos). */
function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" data-field-error className="mt-3 text-body2 font-medium text-flame-600">
      {children}
    </p>
  );
}

function inputClass(invalid: boolean): string {
  return `field-input ${invalid ? 'field-input-invalid' : ''}`;
}
