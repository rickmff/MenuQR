import { NextResponse } from 'next/server';
import { demoMode } from '@/lib/demo/config';
import { getCurrentUser } from '@/server/auth/current-user';
import { askNominatim, type Place } from '@/server/geocode';
import { clientIp, rateLimit } from '@/server/rate-limit';

/**
 * Endereço escrito → ponto no mapa, para o mapa da aba Entrega.
 *
 * A consulta ao Nominatim mora em `@/server/geocode`, compartilhada com a
 * cotação de entrega do cliente. Esta rota é só do painel: exige sessão, limita
 * por conta e por IP.
 */

/** Procurar endereço é coisa de quem está cadastrando, não de laço automático. */
const SEARCHES_PER_WINDOW = 30;
const WINDOW_MS = 10 * 60 * 1000;

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

  let place: Place | null = null;
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

  if (!place) {
    return fail(404, 'Não encontramos este endereço. Arraste o pino até o restaurante.');
  }

  return NextResponse.json(place, { headers: { 'Cache-Control': 'no-store' } });
}
