'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { staggered, useRevealVariants, viewportOnce } from './motion';

/** Bloco que aparece uma vez ao entrar no viewport. Filhos com `<RevealItem>` escalonam. */
export function Reveal({ children, className, as = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'ul' }) {
  const Element = motion[as];
  return (
    <Element initial="hidden" whileInView="visible" viewport={viewportOnce} variants={staggered} className={className}>
      {children}
    </Element>
  );
}

export function RevealItem({ children, className, as = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'li' | 'p' | 'h2' }) {
  const Element = motion[as];
  return (
    <Element variants={useRevealVariants()} className={className}>
      {children}
    </Element>
  );
}
