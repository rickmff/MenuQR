"use client";

import { useEffect, type RefObject } from "react";

/** A largura do degradê da borda (`scroll-fade-x`, no globals.css), em px. */
const FADE = 40;

/**
 * Uma fileira de abas que rola de lado (as abas do painel, as de "Dados do
 * negócio"): no celular ela passa da largura da tela e, com a barra de rolagem
 * escondida, nada dizia que havia mais abas — nem qual estava aberta, quando a
 * ativa era a quarta.
 *
 * Faz duas coisas, as duas direto no DOM (sem estado, sem re-render):
 *
 * - rola a lista até a aba ativa (`aria-current="page"`) a cada troca de tela,
 *   deixando-a inteira fora do degradê;
 * - escreve `data-fade` na lista (`start`, `end` ou `both`) conforme há o que
 *   rolar para cada lado — o utilitário `scroll-fade-x` desenha o degradê.
 *
 * `key` é o que muda quando a aba ativa muda (o `pathname`).
 */
export function useScrollFade(ref: RefObject<HTMLElement | null>, key: string) {
  useEffect(() => {
    const list = ref.current;
    if (!list) return;

    const active = list.querySelector<HTMLElement>('[aria-current="page"]');
    if (active) {
      const listRect = list.getBoundingClientRect();
      const rect = active.getBoundingClientRect();
      // Posição da aba dentro do conteúdo rolável, não na tela.
      const start = rect.left - listRect.left + list.scrollLeft;
      const end = start + rect.width;
      const view = list.clientWidth;
      let left = list.scrollLeft;
      if (end > left + view - FADE) left = end - view + FADE;
      if (start < left + FADE) left = Math.max(0, start - FADE);
      // Direto no `scrollLeft`: `scrollIntoView` rolaria a página também.
      list.scrollLeft = left;
    }

    const update = () => {
      const max = list.scrollWidth - list.clientWidth;
      const before = list.scrollLeft > 1;
      const after = list.scrollLeft < max - 1;
      const fade =
        before && after ? "both" : before ? "start" : after ? "end" : null;
      if (fade) list.dataset.fade = fade;
      else delete list.dataset.fade;
    };

    update();
    list.addEventListener("scroll", update, { passive: true });
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(list);
    return () => {
      list.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, [ref, key]);
}
