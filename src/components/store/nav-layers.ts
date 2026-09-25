/**
 * Camadas da loja no histórico do navegador — sem mudar a URL.
 *
 * A Sacola, o Finalizar, o Enviado e a busca não são rotas (D7), mas precisam
 * se comportar como telas de app: o voltar do navegador, o do Android e o
 * gesto do iOS fecham a de cima e voltam um passo, em vez de sair da loja.
 * Cada camada é uma entrada no histórico com `history.state.mq` (ex.:
 * `['cart', 'checkout']`), e o estado da interface é DERIVADO desse array —
 * nunca guardado à parte —, então tela e histórico não se desencontram.
 *
 * Por que `history.state` e não um hash (`#sacola`): no modo demo o fragmento
 * é `#c=<cardápio inteiro>` (share-link.ts); um hash nosso sobrescreveria o
 * pacote e quem copiasse a URL perderia o cardápio.
 *
 * O Next 16 aceita isto: `history.pushState(estado, '')` sem URL recebe as
 * chaves internas dele (`__NA` e a árvore) e não despacha nada no router; no
 * `popstate` o Next restaura a mesma rota sem rolar e PRESERVA o estado
 * customizado (node_modules/next/dist/client/components/app-router.js e
 * segment-cache/navigation.js). Navegar com `Link`/`router.push` cria uma
 * entrada nova, sem `mq` — abrir um prato fecha a sacola sozinho.
 *
 * Cuidado: nunca empurrar uma camada no mesmo tique de um `router.push/replace`
 * — o Next grava a entrada da navegação depois e apaga a nossa. Para abrir a
 * sacola depois de navegar, veja `openCartAfterNav` no StoreProvider.
 */

export type Layer = 'search' | 'cart' | 'checkout' | 'done';

const LAYERS: readonly Layer[] = ['search', 'cart', 'checkout', 'done'];
const EMPTY: readonly Layer[] = Object.freeze([]);

let cached: { key: string; value: readonly Layer[] } = { key: '', value: EMPTY };
const listeners = new Set<() => void>();

/** Chaves nossas no `history.state`: camadas, rolagem do cardápio e origem do prato. */
const OWN_KEYS = ['mq', 'mqScrollY', 'mqFrom'] as const;
let guarded = false;

/**
 * O Next regrava a entrada atual (`replaceState`) em algumas atualizações do
 * router sem preservar o estado customizado — uma retentativa de dados
 * dinâmicos logo depois da hidratação, por exemplo (medido no modo demo em
 * 2026-09-24: recarregar com a sacola aberta a fechava). Quando a regravação
 * é da MESMA entrada (mesma URL), as nossas chaves continuam nela. Navegação
 * para outra URL (`router.replace` do prato para o cardápio) não herda nada.
 *
 * O patch do Next em `history.replaceState` captura a função vigente quando o
 * AppRouter monta; este embrulho entra antes ou depois dele e os dois se
 * encadeiam em qualquer ordem.
 */
function guardOwnKeys(): void {
  if (guarded) return;
  guarded = true;
  const replace = window.history.replaceState;
  window.history.replaceState = function replaceState(data: unknown, unused: string, url?: string | URL | null) {
    const current: unknown = window.history.state;
    if (sameEntry(url) && isRecord(current) && isRecord(data)) {
      let next: Record<string, unknown> = data;
      for (const key of OWN_KEYS) {
        if (!(key in next) && key in current) next = { ...next, [key]: current[key] };
      }
      return replace.call(window.history, next, unused, url);
    }
    return replace.call(window.history, data, unused, url);
  };
}

// Já na avaliação do módulo, e não na primeira assinatura: no modo demo a loja
// monta depois do esqueleto, e a regravação do Next acontece antes disso.
if (typeof window !== 'undefined') guardOwnKeys();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function sameEntry(url: string | URL | null | undefined): boolean {
  if (url === undefined || url === null || url === '') return true;
  try {
    const next = new URL(String(url), window.location.href);
    return next.pathname === window.location.pathname && next.search === window.location.search;
  } catch {
    return false;
  }
}

function isLayer(value: unknown): value is Layer {
  return typeof value === 'string' && (LAYERS as readonly string[]).includes(value);
}

/** As camadas da entrada atual. Referência estável enquanto não mudarem (useSyncExternalStore). */
export function readLayers(): readonly Layer[] {
  const raw: unknown = window.history.state?.mq;
  const layers = Array.isArray(raw) ? raw.filter(isLayer) : [];
  const key = layers.join('|');
  if (key !== cached.key) cached = { key, value: layers.length ? Object.freeze(layers) : EMPTY };
  return cached.value;
}

/** No servidor e na hidratação não há camada: a loja nasce fechada (ISR). */
export function readLayersOnServer(): readonly Layer[] {
  return EMPTY;
}

export function emitLayers(): void {
  for (const listener of [...listeners]) listener();
}

export function subscribeLayers(listener: () => void): () => void {
  guardOwnKeys();
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener('popstate', emitLayers);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('popstate', emitLayers);
  };
}

/** Empurra uma camada. Idempotente: não repete a do topo (efeitos rodam duas vezes no modo estrito). */
export function pushLayer(layer: Layer): void {
  const layers = readLayers();
  if (layers[layers.length - 1] === layer) return;
  // Só `mq`: o patch do Next copia `__NA` e a árvore da entrada atual.
  window.history.pushState({ mq: [...layers, layer] }, '');
  emitLayers();
}

/** Troca a camada do topo sem criar entrada (Finalizar → Enviado). */
export function replaceLayer(layer: Layer): void {
  const layers = readLayers();
  window.history.replaceState({ ...window.history.state, mq: [...layers.slice(0, -1), layer] }, '');
  emitLayers();
}

/** Volta `count` entradas. Quem avisa a interface é o `popstate`. */
export function popLayers(count: number): void {
  if (count > 0) window.history.go(-count);
}

/** Grava chaves próprias na entrada atual, preservando as do Next e as camadas. */
export function patchHistoryState(patch: Record<string, unknown>): void {
  window.history.replaceState({ ...window.history.state, ...patch }, '');
}
