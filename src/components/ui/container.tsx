import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type ContainerSize = 'page' | 'narrow';
type ContainerElement = 'div' | 'section' | 'main' | 'ul' | 'ol' | 'nav';

const SIZES: Record<ContainerSize, string> = {
  page: 'max-w-page',
  narrow: 'max-w-narrow',
};

/**
 * Coluna centralizada da página. O `w-full` não é enfeite: o <body> é flex em
 * coluna, e margem automática desliga o stretch — sem ele o bloco encolheria
 * para o conteúdo e uma lista rolável lá dentro estouraria a tela.
 */
export function Container({
  size = 'page',
  as: Element = 'div',
  className,
  ...rest
}: { size?: ContainerSize; as?: ContainerElement } & HTMLAttributes<HTMLElement>) {
  return <Element {...rest} className={cn('mx-auto w-full px-4 md:px-6 lg:px-8', SIZES[size], className)} />;
}
