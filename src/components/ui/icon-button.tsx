import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type IconButtonVariant = 'plain' | 'raised' | 'tonal';

interface IconButtonOwnProps {
  /** Vira aria-label: todo botão só de ícone precisa de nome acessível. */
  label: string;
  icon: ReactNode;
  /**
   * plain: barras brancas · raised: círculo branco com sombra, o botão que
   * flutua sobre foto e capa · tonal: fundo cinza.
   */
  variant?: IconButtonVariant;
  /** sm 32 · md 40 · lg 44 (o chrome da loja: voltar, busca, sacola). */
  size?: 'sm' | 'md' | 'lg';
  /** Contador verde no canto (itens na sacola). Zero ou ausente não mostra nada. */
  badge?: number;
  /**
   * Alvo de toque de 44px sem crescer o desenho (o círculo de 32 da loja).
   * Torna o botão `relative`, como o badge: para posicioná-lo com `absolute`,
   * embrulhe-o num elemento posicionado.
   */
  hit?: boolean;
  href?: string;
}

export type IconButtonProps = IconButtonOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof IconButtonOwnProps | 'children'>;

const SIZES: Record<NonNullable<IconButtonOwnProps['size']>, string> = {
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-11',
};

const VARIANTS: Record<IconButtonVariant, string> = {
  plain: 'text-gray-700 hover:bg-gray-50 active:bg-gray-100',
  raised: 'bg-white text-gray-700 shadow-medium active:bg-gray-50',
  tonal: 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300',
};

export function IconButton({
  label,
  icon,
  variant = 'plain',
  size = 'md',
  badge,
  hit = false,
  href,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  const classes = cn(
    'press grid shrink-0 place-items-center rounded-full disabled:cursor-not-allowed disabled:text-gray-400',
    // Só quem tem badge precisa ser âncora; sem isso o consumidor pode posicionar com `absolute`
    // (o "+" do quick-add sobre a foto). Não há tailwind-merge: duas classes de position brigariam.
    (badge !== undefined || hit) && 'relative',
    hit && 'hit-44',
    SIZES[size],
    VARIANTS[variant],
    className,
  );

  const content = (
    <>
      <span aria-hidden="true" className="grid place-items-center">
        {icon}
      </span>
      {badge !== undefined && badge > 0 && (
        // A key refaz a animação a cada mudança de contagem.
        <span
          key={badge}
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] animate-badge-pop place-items-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-white"
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </>
  );

  if (href !== undefined) {
    return (
      <Link href={href} aria-label={label} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button {...rest} type={type} aria-label={label} className={classes}>
      {content}
    </button>
  );
}
