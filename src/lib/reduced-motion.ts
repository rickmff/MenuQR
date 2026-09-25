/**
 * Preferência do sistema por menos movimento. O CSS já zera animações e
 * transições pela regra global do globals.css; esta função é para o que o CSS
 * não alcança — `scrollIntoView({ behavior: 'smooth' })`, esperas pelo fim de
 * uma saída animada e vibração.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** `smooth`, ou `auto` para quem pediu menos movimento. */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}
