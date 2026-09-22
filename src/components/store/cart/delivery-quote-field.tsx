'use client';

import { useState } from 'react';
import { MapPin, Pencil } from 'lucide-react';
import { useStore } from '@/components/store/store-provider';
import { Button } from '@/components/ui/button';
import { fieldClass } from '@/components/ui/text-field';
import { addressPoint } from '@/lib/delivery-area';
import {
  describeDistancePricing,
  distanceBetween,
  formatDistance,
  isOutOfRange,
  isValidPostalCode,
  maskPostalCode,
  onlyPostalDigits,
} from '@/lib/delivery';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';

interface PostalPlace {
  latitude: number;
  longitude: number;
  street: string;
  district: string;
  city: string;
  state: string;
  error?: string;
}

/** "Rua das Flores, Centro — São Paulo/SP", pulando o que o CEP não trouxe. */
function describePlace(place: PostalPlace): string {
  const line = [place.street, place.district].filter(Boolean).join(', ');
  const town = [place.city, place.state].filter(Boolean).join('/');
  return [line, town].filter(Boolean).join(' — ');
}

export const QUOTE_FIELD_ID = 'cart-postal-code';

/**
 * O CEP que vira taxa de entrega, nas lojas que cobram por distância.
 *
 * Fica onde antes aparecia "a calcular": ali o cliente lia que faltava um
 * número que ele não tinha como dar. O CEP vai ao servidor, volta o ponto, e a
 * conta acontece aqui mesmo — o restaurante está na página, com o ponto que o
 * lojista marcou no mapa.
 */
export function DeliveryQuoteField({
  error,
  explainOutOfRange = true,
}: {
  error?: string;
  /** Desligado onde a própria tela já explica o que acontece fora do raio. */
  explainOutOfRange?: boolean;
}) {
  const { business, customer, updateCustomer } = useStore();
  const [postalCode, setPostalCode] = useState(customer.postalCode);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const quote = customer.quote;
  const origin = addressPoint(business.address);

  const calculate = async () => {
    const digits = onlyPostalDigits(postalCode);
    if (!isValidPostalCode(digits) || !origin) {
      setMessage('Digite os 8 números do CEP.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`/api/cep?cep=${digits}`);
      const place = (await response.json()) as PostalPlace;
      if (!response.ok) {
        setMessage(place.error ?? 'Não conseguimos consultar o CEP agora.');
        return;
      }
      const distanceKm = distanceBetween(origin, place);
      updateCustomer({
        postalCode: digits,
        quote: { postalCode: digits, distanceKm, label: describePlace(place) },
        // A rua vem junto do CEP: quem ainda não digitou ganha o campo pronto,
        // e quem já digitou não vê o que escreveu ser trocado.
        ...(place.street && !customer.street.trim() ? { street: place.street } : {}),
      });
    } catch {
      setMessage('Não conseguimos consultar o CEP agora. Tente de novo em instantes.');
    } finally {
      setLoading(false);
    }
  };

  // Sem ponto no mapa não há de onde medir. Não deveria acontecer (a loja só
  // cobra por km depois de marcar), mas a sacola não pode quebrar por isso.
  if (!origin) return null;

  if (quote) {
    const outOfRange = isOutOfRange(business, quote.distanceKm);
    return (
      <div className="rounded-sm bg-gray-50 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-body2 font-semibold text-gray-700">
              <MapPin aria-hidden="true" className="size-4 shrink-0 text-gray-600" />
              {maskPostalCode(quote.postalCode)}
            </p>
            {quote.label && <p className="mt-0.5 truncate text-caption text-gray-600">{quote.label}</p>}
            <p className="mt-0.5 text-caption text-gray-600">
              {formatDistance(quote.distanceKm)} do restaurante
              {outOfRange ? ' — fora da área de entrega' : ''}
            </p>
          </div>
          <Button
            variant="text"
            size="sm"
            leading={<Pencil aria-hidden="true" className="size-4" />}
            onClick={() => {
              setPostalCode(quote.postalCode);
              setMessage('');
              updateCustomer({ quote: null });
            }}
          >
            Trocar
          </Button>
        </div>

        {outOfRange && explainOutOfRange && (
          <p className="mt-2 text-caption text-gray-600">
            {business.name} responde na conversa se entrega aí e por quanto.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={QUOTE_FIELD_ID} className="mb-1.5 block text-body2 font-medium text-gray-700">
        CEP da entrega
      </label>
      <div className="flex gap-2">
        <input
          id={QUOTE_FIELD_ID}
          name="postalCode"
          inputMode="numeric"
          autoComplete="postal-code"
          enterKeyHint="done"
          value={maskPostalCode(postalCode)}
          onChange={(event) => setPostalCode(onlyPostalDigits(event.target.value))}
          onKeyDown={(event) => {
            // Enter aqui calcula; sem isto ele enviaria o formulário do checkout
            // sem a taxa que o próprio formulário está pedindo.
            if (event.key !== 'Enter') return;
            event.preventDefault();
            void calculate();
          }}
          placeholder="00000-000"
          aria-invalid={error || message ? true : undefined}
          aria-describedby={`${QUOTE_FIELD_ID}-hint`}
          className={cn(fieldClass(Boolean(error || message), 'h-12'), 'min-w-0 flex-1')}
        />
        <Button
          onClick={() => void calculate()}
          loading={loading}
          disabled={!isValidPostalCode(postalCode)}
          className="shrink-0"
        >
          Calcular
        </Button>
      </div>
      <p
        id={`${QUOTE_FIELD_ID}-hint`}
        role={error || message ? 'alert' : undefined}
        className={cn(
          'mt-1 text-caption',
          error || message ? 'font-medium text-error' : 'text-gray-600',
        )}
      >
        {error || message || describeDistancePricing(business, formatPrice)}
      </p>
    </div>
  );
}
