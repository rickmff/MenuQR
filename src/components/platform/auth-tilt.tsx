'use client';

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import type { MouseEvent, ReactNode } from 'react';

/** Inclinação máxima. Acima disso o papel vira brinquedo e cansa. */
const MAX_DEGREES = 4;

/**
 * A etiqueta acompanha o cursor com uma inclinação mínima — o suficiente para
 * parecer um objeto sobre a mesa, não um retângulo colado na tela. Desligada
 * com movimento reduzido, e o repouso já é levemente torto de propósito.
 */
export function AuthTilt({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const spring = { stiffness: 220, damping: 22 } as const;
  const px = useSpring(useMotionValue(0), spring);
  const py = useSpring(useMotionValue(0), spring);
  const rotateX = useTransform(py, [-0.5, 0.5], [MAX_DEGREES, -MAX_DEGREES]);
  const rotateY = useTransform(px, [-0.5, 0.5], [-MAX_DEGREES, MAX_DEGREES]);

  const onMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (reduced) return;
    const rect = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - rect.left) / rect.width - 0.5);
    py.set((event.clientY - rect.top) / rect.height - 0.5);
  };

  const rest = () => {
    px.set(0);
    py.set(0);
  };

  if (reduced) return <div className="-rotate-1">{children}</div>;

  return (
    <div onMouseMove={onMouseMove} onMouseLeave={rest} className="[perspective:1200px]">
      <motion.div style={{ rotateX, rotateY }} className="-rotate-1 will-change-transform">
        {children}
      </motion.div>
    </div>
  );
}
