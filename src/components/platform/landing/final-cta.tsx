'use client';

import { motion, useMotionTemplate, useMotionValue } from 'motion/react';
import type { MouseEvent } from 'react';
import { Button, type ButtonVariant } from '@/components/ui/button';
import { useMagnetic } from './motion';

/** O brilho tem que contrastar com o próprio botão: claro no vermelho, vermelho no branco. */
const GLOW: Record<'primary' | 'secondary', string> = {
  primary: 'rgb(255 255 255 / 0.28)',
  secondary: 'rgb(11 134 57 / 0.16)',
};

/**
 * O único elemento da página que reage ao cursor à distância: o botão se
 * aproxima dele e um brilho discreto acompanha a posição por dentro. Em
 * `secondary` ele é o botão branco sobre o bloco vermelho do CTA final.
 */
export function MagneticCta({
  href,
  children,
  variant = 'primary',
}: {
  href: string;
  children: string;
  variant?: Extract<ButtonVariant, 'primary' | 'secondary'>;
}) {
  const magnetic = useMagnetic(40);
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const glow = useMotionTemplate`radial-gradient(7rem circle at ${mx}% ${my}%, ${GLOW[variant]}, transparent 70%)`;

  const onMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    magnetic.onMouseMove(event);
    const rect = event.currentTarget.getBoundingClientRect();
    mx.set(((event.clientX - rect.left) / rect.width) * 100);
    my.set(((event.clientY - rect.top) / rect.height) * 100);
  };

  return (
    <motion.div
      style={{ x: magnetic.x, y: magnetic.y }}
      onMouseMove={onMouseMove}
      onMouseLeave={magnetic.onMouseLeave}
      className="group relative inline-flex rounded-full"
    >
      <Button href={href} variant={variant} size="lg" pill className="relative overflow-hidden">
        {/* Só existe sob o cursor: no toque não há hover, e um brilho parado seria enfeite. */}
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-150 ease-standard group-hover:opacity-100"
          style={{ background: glow }}
        />
        <span className="relative">{children}</span>
      </Button>
    </motion.div>
  );
}
