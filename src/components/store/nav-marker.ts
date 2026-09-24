import { patchHistoryState } from '@/components/store/nav-layers';

/**
 * De onde a pessoa abriu um prato — o cardápio ou uma linha da Sacola.
 *
 * Gravado no clique (ainda na entrada do cardápio) e adotado pela entrada do
 * prato quando ela monta (`adoptNavMarker`, que o copia para
 * `history.state.mqFrom`). Com isso o "voltar" do prato sabe se pode fazer
 * `router.back()` (a loja está logo atrás, na mesma posição) ou se a pessoa
 * chegou direto pelo QR/link e o certo é substituir a entrada pelo cardápio.
 * Guardar na própria entrada faz a informação sobreviver a recarregar e a ir
 * e voltar pelo histórico.
 */
export type NavOrigin = 'menu' | 'cart';

const KEY = 'menuqr.nav';

interface NavMarker {
  slug: string;
  from: NavOrigin;
  /** Caminho + query do prato aberto: um marcador de outro clique não vale. */
  to: string;
}

/**
 * Chamar no `onClick` do link que abre o prato. Também guarda, na entrada do
 * cardápio, a rolagem atual — é ela que o cardápio restaura quando a pessoa
 * volta (ver `MenuBrowser`).
 */
export function rememberMenuPosition(slug: string, href: string, from: NavOrigin, scrollY: number): void {
  try {
    const url = new URL(href, window.location.origin);
    const marker: NavMarker = { slug, from, to: url.pathname + url.search };
    window.sessionStorage.setItem(KEY, JSON.stringify(marker));
  } catch {
    /* sessionStorage indisponível: o voltar cai no replace, que também funciona */
  }
  patchHistoryState({ mqScrollY: Math.round(scrollY) });
}

/**
 * Na montagem da página do prato: se o marcador é deste clique, copia a origem
 * para a entrada atual e o descarta. Marcador de outro clique é descartado.
 */
export function adoptNavMarker(slug: string): void {
  let marker: NavMarker | null = null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw) {
      window.sessionStorage.removeItem(KEY);
      marker = JSON.parse(raw) as NavMarker;
    }
  } catch {
    return;
  }
  if (!marker || marker.slug !== slug) return;
  if (marker.to !== window.location.pathname + window.location.search) return;
  patchHistoryState({ mqFrom: marker.from });
}

/** A origem registrada na entrada atual, se houver. */
export function currentNavOrigin(): NavOrigin | null {
  const from: unknown = window.history.state?.mqFrom;
  return from === 'menu' || from === 'cart' ? from : null;
}

/** A rolagem do cardápio guardada nesta entrada, se houver. */
export function savedMenuScroll(): number | null {
  const value: unknown = window.history.state?.mqScrollY;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
