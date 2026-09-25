'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Quanto da parte de baixo da tela está ocupado por uma barra de ações grudada
 * (o "Salvar" das abas do negócio, o rodapé do formulário de item) — publicado
 * em `--panel-bottom-inset` no `<html>`.
 *
 * O que flutua no canto de baixo do painel (a pílula do guia, o toast) sobe
 * essa altura e não cobre o botão. Só conta a barra que está de fato encostada
 * no pé da janela: quando o formulário é curto e a barra fica no meio da tela,
 * o valor volta a zero. Sem nenhuma barra registrada, a propriedade sai do
 * `<html>` e quem a usa cai no próprio valor padrão.
 */

const bars = new Set<HTMLElement>();
let frame = 0;

/** Distância que conta como "encostada no pé": a pílula tem 44px e 16px de margem. */
const NEAR_BOTTOM = 72;

function measure() {
  frame = 0;
  const root = document.documentElement;
  const viewport = window.innerHeight;
  let inset = 0;
  for (const bar of bars) {
    const rect = bar.getBoundingClientRect();
    if (rect.height === 0 || rect.top >= viewport) continue;
    if (rect.bottom < viewport - NEAR_BOTTOM) continue;
    inset = Math.max(inset, Math.round(viewport - rect.top));
  }
  if (bars.size === 0) root.style.removeProperty('--panel-bottom-inset');
  else root.style.setProperty('--panel-bottom-inset', `${inset}px`);
}

function schedule() {
  if (frame) return;
  frame = window.requestAnimationFrame(measure);
}

let listening = false;
function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
}

function unlisten() {
  if (!listening || bars.size > 0) return;
  listening = false;
  window.removeEventListener('scroll', schedule);
  window.removeEventListener('resize', schedule);
}

/** Registra a barra grudada no pé da tela enquanto o componente estiver montado. */
export function usePanelBottomBar(ref: RefObject<HTMLElement | null>, active = true) {
  useEffect(() => {
    const bar = ref.current;
    if (!bar || !active) return;
    bars.add(bar);
    listen();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    observer?.observe(bar);
    schedule();
    return () => {
      observer?.disconnect();
      bars.delete(bar);
      unlisten();
      measure();
    };
  }, [ref, active]);
}
