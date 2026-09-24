import 'server-only';
import { siteUrl } from '@/lib/site';

/**
 * Endereço escrito → ponto no mapa, pelo Nominatim (OpenStreetMap).
 *
 * A busca passa pelo servidor e não pelo navegador por três motivos: o
 * Nominatim exige um `User-Agent` que identifique quem chama (do navegador quem
 * manda o cabeçalho é o navegador), a política de uso pede no máximo uma
 * consulta por segundo, e assim o serviço de mapa não vê o IP de quem procurou.
 *
 * Usado pelo mapa do painel (`/api/geocodificar`) e pela cotação de entrega do
 * cliente (`/api/cep`).
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

/** O serviço é gratuito e compartilhado: não dá para ficar esperando por ele. */
export const UPSTREAM_TIMEOUT_MS = 6000;

export interface Place {
  latitude: number;
  longitude: number;
  label: string;
}

interface NominatimPlace {
  lat?: string;
  lon?: string;
  display_name?: string;
}

/**
 * Uma consulta ao Nominatim. `query` aceita os campos estruturados
 * (`street`, `city`, `state`, `postalcode`) ou `q` com o endereço inteiro.
 * Lança quando o serviço não responde; devolve `null` quando ele responde que
 * não achou.
 */
export async function askNominatim(query: Record<string, string>): Promise<Place | null> {
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
    headers: { 'User-Agent': `MenuOnline (${siteUrl})`, 'Accept-Language': 'pt-BR' },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`nominatim respondeu ${response.status}`);
  const places = (await response.json()) as NominatimPlace[];
  const place = Array.isArray(places) ? places[0] : null;

  const latitude = Number(place?.lat);
  const longitude = Number(place?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude, label: place?.display_name ?? '' };
}
