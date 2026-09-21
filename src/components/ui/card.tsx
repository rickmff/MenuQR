import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';
type CardElement = 'div' | 'section' | 'li' | 'article';

const PADDING: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-4 lg:p-6',
  lg: 'p-6 lg:p-8',
};

/**
 * Card do iFood: branco, borda fina, raio 12 e nenhuma sombra em repouso — a
 * hierarquia vem da borda, não da elevação. `highlight` troca a borda cinza por
 * 2px de vermelho (o plano em destaque), e `interactive` é para card clicável.
 */
export function Card({
  padding = 'md',
  interactive = false,
  highlight = false,
  as: Element = 'div',
  className,
  ...rest
}: {
  padding?: CardPadding;
  interactive?: boolean;
  highlight?: boolean;
  as?: CardElement;
} & HTMLAttributes<HTMLElement>) {
  return (
    <Element
      {...rest}
      className={cn(
        'rounded-md bg-white',
        highlight ? 'border-2 border-primary' : 'border border-gray-200',
        interactive && 'press shadow-low hover:shadow-medium',
        PADDING[padding],
        className,
      )}
    />
  );
}
