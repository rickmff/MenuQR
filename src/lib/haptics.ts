import { prefersReducedMotion } from '@/lib/reduced-motion';

/**
 * Toque curto ao pôr algo na sacola — a única vibração do app. O iOS ignora
 * `navigator.vibrate`; o Chrome Android exige ativação do usuário, o que já é
 * verdade dentro de um clique. Quem pediu menos movimento não recebe.
 */
export function tapHaptic(): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  if (prefersReducedMotion()) return;
  navigator.vibrate(10);
}
