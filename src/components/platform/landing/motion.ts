'use client';

import { useMotionValue, useReducedMotion, useSpring, type Variants } from 'motion/react';
import { useEffect, useState, useSyncExternalStore, type MouseEvent } from 'react';

const noop = () => () => {};

/** `false` no HTML do servidor e no render de hidratação; `true` daí em diante. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

/** Curva de entrada de tudo que aparece na landing. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Mola das interações (magnetismo, notificação que desliza). */
export const SPRING = { type: 'spring', stiffness: 350, damping: 30 } as const;

/** Reveal padrão: sobe 12px e aparece. Uma vez só, ao entrar no viewport. */
export const reveal: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
};

const revealReduced: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

/** Pai que escalona os filhos em 60ms. Nunca mais que ~6 irmãos. */
export const staggered: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

export const viewportOnce = { once: true, amount: 0.3 } as const;

/**
 * Com movimento reduzido, só a opacidade — mas a partir da hidratação: o HTML
 * do servidor sempre sai com a variante cheia, e trocar antes disso deixaria
 * atributo do servidor diferente do cliente (ver `useHydrated`).
 */
export function useRevealVariants(): Variants {
  const reduced = useReducedMotion();
  const hydrated = useHydrated();
  return reduced && hydrated ? revealReduced : reveal;
}

/**
 * Botão magnético: dentro de `radius` px do centro ele acompanha o cursor com
 * uma mola e volta ao soltar. Desligado com movimento reduzido — e no toque,
 * porque não há hover.
 */
export function useMagnetic(radius = 40) {
  const reduced = useReducedMotion();
  const x = useSpring(useMotionValue(0), SPRING);
  const y = useSpring(useMotionValue(0), SPRING);

  const onMouseMove = (event: MouseEvent<HTMLElement>) => {
    if (reduced) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const clamp = (value: number) => Math.max(-radius, Math.min(radius, value * 0.35));
    x.set(clamp(dx));
    y.set(clamp(dy));
  };

  const onMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return { x, y, onMouseMove, onMouseLeave };
}

/**
 * Texto digitado a ~40ms por caractere, com o caret por conta de quem renderiza.
 * Reinicia quando `text` muda ou `active` volta a ser verdadeiro.
 */
export function useTyped(text: string, active: boolean, speed = 40): { value: string; done: boolean } {
  const reduced = useReducedMotion();
  // O servidor não sabe do `prefers-reduced-motion`: se o texto já saísse
  // inteiro no primeiro render do navegador, o HTML não bateria e a React
  // acusaria erro de hidratação. O atalho só vale depois de hidratar — e isso
  // se pergunta com `useSyncExternalStore`, não com `setState` em efeito, que o
  // lint do React Compiler proíbe.
  const hydrated = useHydrated();
  const [count, setCount] = useState(0);
  const [previous, setPrevious] = useState({ text, active });
  if (previous.text !== text || previous.active !== active) {
    setPrevious({ text, active });
    setCount(0);
  }

  useEffect(() => {
    if (!active || reduced) return;
    const timer = window.setInterval(() => {
      setCount((current) => {
        if (current >= text.length) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, speed);
    return () => window.clearInterval(timer);
  }, [active, reduced, speed, text]);

  const instant = reduced && hydrated;
  const shown = instant || !active ? (active ? text : '') : text.slice(0, count);
  return { value: shown, done: shown.length === text.length && text.length > 0 };
}
