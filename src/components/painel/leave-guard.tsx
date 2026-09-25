"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useSyncExternalStore } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Pergunta antes de jogar fora o que o lojista mudou e não salvou.
 *
 * Quatro saídas perdiam trabalho em silêncio: abrir outra linha do cardápio com
 * um item em edição, tocar numa aba ou no guia com a foto "enviada, salve para
 * aplicar", o Voltar/Avançar do navegador (e o gesto de voltar do celular), e
 * fechar ou recarregar a página. Um formulário registra aqui se tem alteração
 * pendente (`useLeaveGuard(dirty)`); o `LeaveGuardHost`, montado uma vez na
 * casca do painel, segura os links internos, o histórico e a saída da página
 * enquanto houver alguma, e mostra a mesma pergunta para todos.
 *
 * Cancelar explícito continua descartando sem perguntar (D24): quem aperta
 * "Cancelar" já disse o que quer. A pergunta é para as saídas acidentais.
 */

type Proceed = () => void;
type Router = ReturnType<typeof useRouter>;

const dirtySources = new Map<string, boolean>();
/** A saída à espera da resposta, e de quem ela é (`null`: a página inteira sai). */
let pending: { proceed: Proceed; source: string | null } | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function anyDirty(): boolean {
  for (const dirty of dirtySources.values()) if (dirty) return true;
  return false;
}

function ask(proceed: Proceed, source: string | null) {
  pending = { proceed, source };
  emit();
}

/**
 * Registra o formulário que chama. `confirmLeave(seguir)` roda `seguir` na hora
 * quando não há nada pendente neste formulário; havendo, pergunta antes — é o
 * caminho para as saídas que não são links (trocar de linha, Esc, duplicar).
 */
export function useLeaveGuard(dirty: boolean): {
  confirmLeave: (proceed: Proceed) => void;
} {
  const id = useId();

  useEffect(() => {
    dirtySources.set(id, dirty);
    // O host arma e desarma a sentinela do histórico por aqui.
    emit();
    return () => {
      dirtySources.delete(id);
      emit();
    };
  }, [id, dirty]);

  const confirmLeave = useCallback(
    (proceed: Proceed) => {
      if (dirty) ask(proceed, id);
      else proceed();
    },
    [dirty, id],
  );

  return { confirmLeave };
}

/**
 * Para as saídas da página que não são links nem histórico — o "Sair" do modo
 * demonstração: pergunta se QUALQUER formulário tiver alteração pendente, e
 * segue direto quando não há nada. Sem isto o "Sair" do demo apagava a sessão
 * antes do `beforeunload` perguntar, e "Ficar" voltava para uma tela de login.
 */
export function confirmLeaveAll(proceed: Proceed): void {
  if (anyDirty()) ask(proceed, null);
  else proceed();
}

/* ----------------------------------------------------------------- histórico */

/*
 * O Voltar/Avançar do navegador no App Router é uma navegação do cliente por
 * `popstate`: não passa por clique nem por `beforeunload`. Não há como cancelar
 * um `popstate` — quando ele chega, o navegador já trocou de entrada. Então,
 * enquanto houver alteração pendente, a tela ganha UMA entrada a mais no
 * histórico, igual à atual (a "sentinela"): o Voltar cai na entrada de baixo,
 * que é a mesma tela, e aqui a sentinela volta para o topo e a pergunta abre.
 * Confirmando, `history.go(-2)` faz o Voltar que o lojista pediu.
 *
 * Como o Next 16 lida com isso (node_modules/next/dist/client/components/app-router.js):
 * - Ele embrulha `history.pushState`/`replaceState`. Estado com `__NA` passa
 *   direto; sem `__NA`, ele copia `__NA` e a árvore (`__PRIVATE_NEXTJS_INTERNALS_TREE`)
 *   e, com URL, despacha um ACTION_RESTORE no router. A sentinela vai com uma
 *   CÓPIA do `history.state` atual (tem `__NA` e a árvore) e sem URL: o router
 *   não fica sabendo de nada.
 * - O `onPopState` dele recarrega a página inteira quando a entrada não tem
 *   `__NA`, e com `__NA` despacha a travessia até a árvore da entrada. Por isso
 *   a sentinela precisa das chaves dele, e por isso o nosso `popstate` é
 *   registrado na CAPTURA do `window`: no alvo, os ouvintes de captura rodam
 *   antes dos outros, e `stopImmediatePropagation` impede a travessia do Next
 *   quando a tela não deve mudar (a pergunta, o consumo da sentinela).
 * - O `HistoryUpdater` dele (`useInsertionEffect`, antes dos nossos efeitos)
 *   regrava a entrada atual com `replaceState` a cada atualização do router —
 *   o `router.refresh` que a revalidação de um salvar provoca inclusive — sem o
 *   estado customizado (`preserveCustomHistoryState: false`). O embrulho de
 *   `keepMarks` devolve as nossas marcas quando a regravação é da MESMA entrada,
 *   como o `nav-layers.ts` da loja faz com as chaves dele.
 *
 * Quando não há mais nada pendente e a entrada atual ainda é a sentinela, ela é
 * consumida com `history.back()` para não deixar um "voltar morto" (um Voltar
 * que não muda nada na tela). Se a página já navegou (a entrada atual é outra),
 * não se mexe. Saídas confirmadas por aqui (link, `leaveTo`) trocam a
 * sentinela pela tela seguinte com `router.replace` em vez de empilhar.
 *
 * Tudo isso só existe no painel: o host mora na casca dele, e a loja não
 * tem formulário que registre alteração.
 */

/** A sentinela: a entrada extra, igual à tela, empilhada enquanto há alteração. */
const SENTINEL_KEY = "mqLeaveGuard";
/** A entrada logo abaixo dela — é para ela que o Voltar leva. */
const BASE_KEY = "mqLeaveBase";

type HistoryRecord = Record<string, unknown>;

/**
 * A sentinela armada agora. `token` distingue esta das de armações antigas —
 * inclusive das que ficaram no histórico antes de um recarregar, por isso ele
 * leva o `timeOrigin` do documento: um contador que recomeça do zero a cada
 * carga faria a sentinela velha passar pela nova. `depth` é o
 * `history.length` logo depois de empilhá-la, que é a posição dela + 1
 * (empilhar corta as entradas da frente).
 */
let sentinel: {
  token: string;
  url: string;
  state: HistoryRecord;
  depth: number;
} | null = null;
let armings = 0;
/** Uma saída confirmada está em curso: a sentinela sai com ela, não com `back()`. */
let leaving = false;
/** O `back()` que consome a sentinela ainda não chegou. */
let consuming = false;
let marksKept = false;

function isRecord(value: unknown): value is HistoryRecord {
  return typeof value === "object" && value !== null;
}

function currentState(): HistoryRecord {
  const state: unknown = window.history.state;
  return isRecord(state) ? state : {};
}

function atSentinel(): boolean {
  return sentinel !== null && currentState()[SENTINEL_KEY] === sentinel.token;
}

function samePage(url: string | URL | null | undefined): boolean {
  if (url === undefined || url === null || url === "") return true;
  try {
    const next = new URL(String(url), window.location.href);
    return (
      next.pathname === window.location.pathname &&
      next.search === window.location.search
    );
  } catch {
    return false;
  }
}

/**
 * Regravação da mesma entrada (o `router.refresh` depois de salvar) mantém as
 * nossas marcas, e a sentinela guarda o estado novo — com a árvore atualizada
 * — para repô-la ou devolvê-lo à entrada de baixo. Navegação para outra URL não
 * herda nada. O embrulho do Next captura a função vigente quando o AppRouter
 * monta, e os dois se encadeiam em qualquer ordem.
 */
function keepMarks(): void {
  if (marksKept) return;
  marksKept = true;
  const replace = window.history.replaceState;
  window.history.replaceState = function replaceState(
    data: unknown,
    unused: string,
    url?: string | URL | null,
  ) {
    const current: unknown = window.history.state;
    if (isRecord(current) && isRecord(data) && samePage(url)) {
      let next = data;
      for (const key of [SENTINEL_KEY, BASE_KEY]) {
        if (!(key in next) && current[key] !== undefined)
          next = { ...next, [key]: current[key] };
      }
      if (sentinel && next[SENTINEL_KEY] === sentinel.token)
        sentinel.state = next;
      return replace.call(window.history, next, unused, url);
    }
    return replace.call(window.history, data, unused, url);
  };
}

/** Empilha a sentinela, se a entrada atual ainda não é ela. */
function arm(): void {
  leaving = false;
  if (consuming || atSentinel()) return;
  // A única entrada da aba (aberta direto, num favorito): não há para onde
  // voltar, e a sentinela só acenderia um Voltar que não leva a lugar nenhum.
  if (window.history.length <= 1) return;
  armings += 1;
  const token = `${performance.timeOrigin}:${armings}`;
  // Sem as marcas de uma armação antiga (a entrada que sobrou de um recarregar).
  const base = unmarked(currentState());
  window.history.replaceState({ ...base, [BASE_KEY]: token }, "");
  const state = { ...base, [SENTINEL_KEY]: token };
  window.history.pushState(state, "");
  sentinel = { token, url: window.location.href, state, depth: window.history.length };
}

/** Tira a sentinela do topo sem mudar a tela (o `popstate` do `back()` não chega ao Next). */
function disarm(): void {
  if (leaving || consuming || !atSentinel()) return;
  consuming = true;
  window.history.back();
}

/** Estado sem as nossas marcas (`null` explícito: o embrulho não as repõe). */
function unmarked(state: HistoryRecord): HistoryRecord {
  return { ...state, [SENTINEL_KEY]: null, [BASE_KEY]: null };
}

/**
 * Sai da tela para `href` depois de uma alteração descartada ou salva. Na
 * sentinela, a tela seguinte TOMA o lugar dela (`router.replace`): empilhar
 * deixaria no histórico duas entradas da mesma tela, e o Voltar pareceria não
 * funcionar. Quem navega depois de salvar ou de uma pergunta usa isto, e não
 * `router.push` — o `back()` que consome a sentinela não pode cruzar com uma
 * navegação em curso.
 */
export function leaveTo(router: Router, href: string): void {
  if (atSentinel()) {
    leaving = true;
    router.replace(href);
  } else {
    router.push(href);
  }
}

/** O link leva para outra tela deste site, no mesmo quadro, com clique simples? */
function internalHref(event: MouseEvent): string | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return null;
  const anchor = (event.target as Element | null)?.closest?.("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  // Âncora na mesma página não sai de lugar nenhum.
  if (
    url.pathname === window.location.pathname &&
    url.search === window.location.search
  )
    return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Montado uma vez, na casca do painel (`PanelShell`). Segura os cliques em
 * links internos, o Voltar/Avançar e o fechar/recarregar enquanto algum
 * formulário tiver alteração pendente, e mostra a pergunta.
 */
export function LeaveGuardHost() {
  const t = useTranslations("painel.leaveGuard");
  const router = useRouter();
  const open = useSyncExternalStore(
    subscribe,
    () => pending !== null,
    () => false,
  );
  const dirty = useSyncExternalStore(subscribe, anyDirty, () => false);

  // A sentinela acompanha o "há alteração pendente".
  useEffect(() => {
    keepMarks();
    if (dirty) arm();
    else disarm();
  }, [dirty]);

  useEffect(() => {
    // Captura no `document`: roda antes do `onClick` do <Link>, que o React
    // escuta na raiz — parar aqui impede a navegação do Next.
    const onClick = (event: MouseEvent) => {
      if (!anyDirty()) return;
      const href = internalHref(event);
      if (!href) return;
      event.preventDefault();
      event.stopPropagation();
      ask(() => leaveTo(router, href), null);
    };
    const onPopState = (event: PopStateEvent) => {
      if (consuming) {
        // O `back()` de `disarm`: a tela é a mesma, o Next não precisa andar.
        // A entrada de baixo recebe o estado mais novo da sentinela (a árvore
        // de depois do salvar) e perde a marca.
        // Só quando caiu mesmo na entrada de baixo: se uma navegação entrou no
        // meio do `back()`, a entrada é outra, e o Next assenta nela.
        consuming = false;
        const landed: unknown = event.state;
        if (sentinel && isRecord(landed) && landed[BASE_KEY] === sentinel.token) {
          event.stopImmediatePropagation();
          window.history.replaceState(unmarked(sentinel.state), "");
        }
        sentinel = null;
        // Voltou a mexer enquanto o `back()` andava: arma de novo.
        if (anyDirty()) arm();
        return;
      }
      if (leaving || !sentinel || !anyDirty()) return;
      const state: unknown = event.state;
      // Âncora na mesma página ("Pular para o conteúdo") cria entrada sem
      // estado, e voltar dela cai na própria sentinela: nenhum dos dois sai
      // da tela.
      if (!isRecord(state) || state[SENTINEL_KEY] === sentinel.token) return;
      // Voltar (ou um salto pelo menu do histórico) com alteração pendente: a
      // tela não muda, a sentinela volta ao topo e a pergunta abre. Caiu na
      // entrada logo abaixo da sentinela: o destino pedido é a de baixo dela
      // (-2). Caiu em outra (o Chrome pula entradas criadas sem gesto, ou o
      // lojista saltou várias): o destino é essa, logo abaixo da nova
      // sentinela (-1).
      const fromBase = state[BASE_KEY] === sentinel.token;
      event.stopImmediatePropagation();
      // A entrada de baixo é a primeira da aba: o Voltar não tinha para onde
      // levar — sem a sentinela ele estaria apagado —, e confirmar seria um
      // `go(-2)` para fora do histórico, que não faz nada. A tela fica, sem
      // pergunta, e a sentinela sai como no consumo: a entrada de baixo recebe
      // o estado dela e o Next não anda.
      if (fromBase && sentinel.depth <= 2) {
        window.history.replaceState(unmarked(sentinel.state), "");
        sentinel = null;
        return;
      }
      window.history.pushState(sentinel.state, "", sentinel.url);
      ask(() => window.history.go(fromBase ? -2 : -1), null);
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!anyDirty()) return;
      event.preventDefault();
      // Navegadores antigos só perguntam com um valor de retorno.
      event.returnValue = "";
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [router]);

  const close = () => {
    pending = null;
    emit();
  };

  return (
    <ConfirmDialog
      open={open}
      onClose={close}
      title={t("title")}
      description={t("description")}
      cancelLabel={t("cancel")}
      confirmLabel={t("confirm")}
      onConfirm={() => {
        const current = pending;
        if (!current) return;
        pending = null;
        if (current.source === null) {
          // A página inteira sai (link, Voltar, "Sair" do demo): tudo o que
          // estava pendente foi descartado, e a sentinela sai com a navegação —
          // consumi-la com `back()` agora cruzaria com ela.
          leaving = true;
          dirtySources.clear();
        }
        // Saída de um formulário só (trocar de linha, Esc, duplicar): ele
        // continua registrado até desmontar. Se ficar na tela — a cópia que
        // falhou ao duplicar —, a alteração dele continua protegida.
        emit();
        current.proceed();
      }}
    />
  );
}
