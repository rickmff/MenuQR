import { NextResponse } from 'next/server';
import { siteUrl } from '@/lib/site';
import { demoMode } from '@/lib/demo/config';
import { getCurrentUser } from '@/server/auth/current-user';
import { clientIp, rateLimit } from '@/server/rate-limit';

/**
 * Endereço escrito → ponto no mapa, pelo Nominatim (OpenStreetMap).
 *
 * A busca passa pelo servidor e não pelo navegador do lojista por três motivos:
 * o Nominatim exige um `User-Agent` que identifique quem chama (do navegador
 * quem manda o cabeçalho é o navegador), a política de uso pede no máximo uma
 * consulta por segundo, e assim o serviço de mapa não vê o IP do lojista.
 *
 * A rota é só do painel: exige sessão, limita por conta e por IP.
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

/** Procurar endereço é coisa de quem está cadastrando, não de laço automático. */
const SEARCHES_PER_WINDOW = 30;
const WINDOW_MS = 10 * 60 * 1000;

/** O serviço é gratuito e compartilhado: não dá para ficar esperando por ele. */
const UPSTREAM_TIMEOUT_MS = 6000;

const MAX_FIELD = 160;

/**
 * No modo demonstração não há banco para guardar o contador — sobra este teto
 * na memória da instância, que vale para todo mundo junto. Folgado para uso de
 * verdade e suficiente para não virar um proxy aberto de geocodificação.
 */
const FALLBACK_PER_WINDOW = 60;
let fallback = { count: 0, resetAt: 0 };

function allowWithoutDatabase(): boolean {
  const now = Date.now();
  if (now >= fallback.resetAt) fallback = { count: 0, resetAt: now + WINDOW_MS };
  fallback.count += 1;
  return fallback.count <= FALLBACK_PER_WINDOW;
}

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

interface NominatimPlace {
  lat?: string;
  lon?: string;
  display_name?: string;
}

/** Só os campos que o Nominatim entende, já cortados no tamanho. */
function fieldsOf(params: URLSearchParams): Record<string, string> {
  const pick = (name: string) => (params.get(name) ?? '').trim().slice(0, MAX_FIELD);
  return {
    street: pick('rua'),
    city: pick('cidade'),
    state: pick('uf'),
    postalcode: pick('cep'),
  };
}

async function askNominatim(query: Record<string, string>): Promise<NominatimPlace | null> {
  const url = new URL(NOMINATIM);
  for (const [key, value] of Object.entries(query)) {
    if (value) url.searchParams.set(key, value);
  }
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'br');
  url.searchParams.set('addressdetails', '0');

  const response = await fetch(url, {
    // Exigido pela política de uso do Nominatim: quem chama tem que se identificar.
    headers: { 'User-Agent': `MenuQR (${siteUrl})`, 'Accept-Language': 'pt-BR' },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`nominatim respondeu ${response.status}`);
  const places = (await response.json()) as NominatimPlace[];
  return Array.isArray(places) ? (places[0] ?? null) : null;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const fields = fieldsOf(params);
  const free = (params.get('endereco') ?? '').trim().slice(0, MAX_FIELD * 2);
  if (!fields.street && !fields.postalcode && free.length < 6) {
    return fail(400, 'Escreva o endereço completo para procurar no mapa.');
  }

  // Com banco, quem procura precisa estar logado. Sem banco (demonstração) não
  // existe sessão de verdade, e o limite na memória é quem segura a rota.
  let owner = 'demo';
  if (!demoMode) {
    const user = await getCurrentUser();
    if (!user) return fail(401, 'Sessão expirada. Entre novamente para continuar.');
    owner = user.id;
  }

  try {
    const ip = await clientIp();
    const perAccount = await rateLimit(`geo-conta:${owner}`, SEARCHES_PER_WINDOW, WINDOW_MS);
    const perIp = await rateLimit(`geo-ip:${ip}`, SEARCHES_PER_WINDOW * 2, WINDOW_MS);
    if (!perAccount.allowed || !perIp.allowed) {
      return fail(429, 'Muitas buscas seguidas. Espere um minuto e tente de novo.');
    }
  } catch {
    if (!allowWithoutDatabase()) {
      return fail(429, 'Muitas buscas seguidas. Espere um minuto e tente de novo.');
    }
  }

  let place: NominatimPlace | null = null;
  try {
    // A busca por campos separados respeita a cidade; a de texto livre
    // costuma trocá-la por outra onde o nome da rua também existe. Por isso a
    // estruturada vem primeiro, e a livre só entra quando ela não acha nada.
    if (fields.street || fields.postalcode) place = await askNominatim(fields);
    if (!place && free) place = await askNominatim({ q: free });
  } catch (error) {
    console.error('[geocodificar] falha ao consultar o Nominatim:', error);
    return fail(502, 'O serviço de mapas não respondeu. Marque o ponto arrastando o pino.');
  }

  const latitude = Number(place?.lat);
  const longitude = Number(place?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return fail(404, 'Não encontramos este endereço. Arraste o pino até o restaurante.');
  }

  return NextResponse.json(
    { latitude, longitude, label: place?.display_name ?? '' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
