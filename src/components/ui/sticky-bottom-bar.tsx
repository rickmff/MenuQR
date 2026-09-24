import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const POSITIONS = {
  fixed: 'fixed inset-x-0 bottom-0 z-40',
  sticky: 'sticky bottom-0 z-40',
  static: '',
} as const;

const TONES = {
  /** Barra branca com sombra para cima: a da loja e os rodapés da sacola. */
  white: 'bg-white px-4 pt-3 pb-safe-4 shadow-up',
  /**
   * Sem barra: o CTA flutua sobre um degradê branco e o conteúdo desbota por
   * baixo dele (página do prato). O degradê não recebe toque — só o que está
   * dentro dele.
   */
  gradient:
    'pointer-events-none bg-linear-to-t from-white via-white/95 via-45% to-transparent px-4 pt-12 pb-safe-4',
} as const;

/**
 * Barra de ação colada ao pé da tela. `position` decide quem a segura: a
 * janela (`fixed`), o contêiner rolável (`sticky`, o painel do prato no
 * desktop) ou o fluxo (`static`, o rodapé da Sacola, que já é uma coluna).
 */
export function StickyBottomBar({
  children,
  tone = 'white',
  position = 'fixed',
  className,
  innerClassName,
}: {
  children: ReactNode;
  tone?: keyof typeof TONES;
  position?: keyof typeof POSITIONS;
  className?: string;
  /** Classes do miolo (largura máxima, alinhamento). */
  innerClassName?: string;
}) {
  return (
    <div className={cn(POSITIONS[position], TONES[tone], className)}>
      <div className={cn('mx-auto w-full', tone === 'gradient' && 'pointer-events-auto', innerClassName)}>
        {children}
      </div>
    </div>
  );
}
