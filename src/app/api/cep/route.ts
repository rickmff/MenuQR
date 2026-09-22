import { NextResponse } from 'next/server';
import { onlyPostalDigits } from '@/lib/delivery';
import { askNominatim, UPSTREAM_TIMEOUT_MS, type Place } from '@/server/geocode';
import { clientIp, rateLimit } from '@/server/rate-limit';

/**
 * CEP → ponto no mapa, para o cliente cotar a entrega no checkout.
 *
 * Dois serviços em sequência: o ViaCEP diz que endereço é aquele CEP, e o
 * Nominatim diz onde ele fica. O ViaCEP sozinho não dá coordenada, e o
 * Nominatim sozinho erra CEP brasileiro com frequência — juntos acertam a rua.
 *
 * Diferente de `/api/geocodificar`, esta rota é do cliente final, que não tem
 * conta: o que segura a porta é o limite por IP e o formato do CEP. A rota não
 * conhece restaurante nenhum e não devolve preço — a distância e a taxa são
 * calculadas na página, com o ponto do restaurante que ela já tem.
 */

const VIACEP = 'https://viacep.com.br/ws';

/** Um cliente cota o próprio CEP, confere, talvez corrija. Não é laço. */
const LOOKUPS_PER_WINDOW = 20;
const WINDOW_MS = 10 * 60 * 1000;

/** Sem banco (modo demonstração) sobra este teto na memória da instância. */
const FALLBACK_PER_WINDOW = 120;
let fallback = { count: 0, resetAt: 0 };

/**
 * CEP não muda de lugar: o mesmo endereço volta da memória em vez de gastar
 * duas chamadas externas. O teto existe para a instância não crescer sem fim.
 */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map<string, { place: PostalPlace; expiresAt: number }>();

interface PostalPlace extends Place {
  street: string;
  district: string;
  city: string;
  state: string;
}

interface ViaCepAddress {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | string;
}

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

function allowWithoutDatabase(): boolean {
  const now = Date.now();
  if (now >= fallback.resetAt) fallback = { count: 0, resetAt: now + WINDOW_MS };
  fallback.count += 1;
  return fallback.count <= FALLBACK_PER_WINDOW;
}

function remember(postalCode: string, place: PostalPlace) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(postalCode, { place, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function askViaCep(postalCode: string): Promise<ViaCepAddress | null> {
  const response = await fetch(`${VIACEP}/${postalCode}/json/`, {
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`viacep respondeu ${response.status}`);
  const address = (await response.json()) as ViaCepAddress;
  // CEP inexistente volta 200 com `{ "erro": true }`.
  return address.erro ? null : address;
}

export async function GET(request: Request) {
  const postalCode = onlyPostalDigits(new URL(request.url).searchParams.get('cep') ?? '');
  if (postalCode.length !== 8) return fail(400, 'Digite os 8 números do CEP.');

  const cached = cache.get(postalCode);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.place, { headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const ip = await clientIp();
    const perIp = await rateLimit(`cep-ip:${ip}`, LOOKUPS_PER_WINDOW, WINDOW_MS);
    if (!perIp.allowed) {
      return fail(429, 'Muitas consultas seguidas. Espere um minuto e tente de novo.');
    }
  } catch {
    if (!allowWithoutDatabase()) {
      return fail(429, 'Muitas consultas seguidas. Espere um minuto e tente de novo.');
    }
  }

  let address: ViaCepAddress | null;
  try {
    address = await askViaCep(postalCode);
  } catch (error) {
    console.error('[cep] falha ao consultar o ViaCEP:', error);
    return fail(502, 'Não conseguimos consultar o CEP agora. Tente de novo em instantes.');
  }
  if (!address) return fail(404, 'CEP não encontrado. Confira os números.');

  const street = (address.logradouro ?? '').trim();
  const district = (address.bairro ?? '').trim();
  const city = (address.localidade ?? '').trim();
  const state = (address.uf ?? '').trim();

  let place: Place | null = null;
  try {
    // A rua é o que dá a taxa mais justa. CEP de cidade inteira (os terminados
    // em -000) não tem rua: aí o bairro, e por último a cidade, que já é uma
    // aproximação grosseira — mas ainda melhor que recusar o pedido.
    if (street) place = await askNominatim({ street, city, state, postalcode: postalCode });
    if (!place && district) place = await askNominatim({ q: `${district}, ${city}, ${state}` });
    if (!place && city) place = await askNominatim({ q: `${city}, ${state}` });
  } catch (error) {
    console.error('[cep] falha ao consultar o Nominatim:', error);
    return fail(502, 'O serviço de mapas não respondeu. Tente de novo em instantes.');
  }
  if (!place) return fail(404, 'Não conseguimos localizar este CEP no mapa.');

  const found: PostalPlace = { ...place, street, district, city, state };
  remember(postalCode, found);
  return NextResponse.json(found, { headers: { 'Cache-Control': 'no-store' } });
}
