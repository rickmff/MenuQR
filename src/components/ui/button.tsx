import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'text';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Troca o conteúdo à esquerda por um spinner e bloqueia o clique. */
  loading?: boolean;
  fullWidth?: boolean;
  /** Cantos pill: só no site institucional (landing). No app o raio é 8px. */
  pill?: boolean;
  leading?: ReactNode;
  /** Conteúdo alinhado à direita — o preço em "Adicionar    R$ 29,90". */
  trailing?: ReactNode;
  /** Com href o botão vira um <Link> com a mesma aparência. */
  href?: string;
  target?: string;
  rel?: string;
}

export type ButtonProps = ButtonOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps>;

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-pressed',
  secondary: 'border border-primary bg-white text-primary hover:bg-gray-50 active:bg-primary-tint',
  tertiary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300',
  text: 'text-primary hover:bg-gray-50 active:bg-gray-100',
};

/**
 * Desativado: estático, sem hover nem press. Vale tanto para `disabled` quanto
 * para `aria-disabled` — o botão que continua focável só para explicar por que
 * não dá para usá-lo (ver `Tooltip`).
 */
const DISABLED: Record<ButtonVariant, string> = {
  primary: 'bg-gray-200 text-gray-400',
  secondary: 'border border-gray-300 bg-white text-gray-400',
  tertiary: 'bg-gray-100 text-gray-400',
  text: 'text-gray-400',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-body2',
  md: 'h-12 px-5 text-body2',
  lg: 'h-14 px-6 text-body1',
};

/** Mesma aparência para quem não pode ser <button> (um <summary>, um <a> externo). */
export function buttonClass({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  pill = false,
  disabled = false,
}: Pick<ButtonOwnProps, 'variant' | 'size' | 'fullWidth' | 'pill'> & {
  disabled?: boolean;
} = {}): string {
  return cn(
    'inline-flex shrink-0 items-center gap-2 font-semibold',
    disabled ? 'cursor-not-allowed' : 'press',
    pill ? 'rounded-full' : 'rounded-sm',
    fullWidth && 'w-full',
    disabled ? DISABLED[variant] : VARIANTS[variant],
    SIZES[size],
  );
}

/**
 * Botão do iFood: vermelho chapado, raio 8, sem sombra nem gradiente. As props
 * descrevem o papel (variant, loading), nunca o estilo — padrão do IFDS.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  pill = false,
  leading,
  trailing,
  href,
  target,
  rel,
  className,
  children,
  disabled,
  onClick,
  type = 'button',
  ...rest
}: ButtonProps) {
  /** Bloqueado mas focável: o clique não vale, mas hover e foco continuam
   *  existindo para o motivo aparecer. */
  const blocked = rest['aria-disabled'] === true || rest['aria-disabled'] === 'true';
  const classes = cn(
    buttonClass({ variant, size, fullWidth, pill, disabled: disabled || loading || blocked }),
    trailing !== undefined ? 'justify-between' : 'justify-center',
    className,
  );

  const content = (
    <>
      <span className="inline-flex min-w-0 items-center gap-2">
        {loading ? <Loader2 aria-hidden="true" className="size-5 animate-spin" /> : leading}
        <span className="truncate">{children}</span>
      </span>
      {trailing !== undefined && <span className="shrink-0 tabular-nums">{trailing}</span>}
    </>
  );

  if (href !== undefined) {
    return (
      <Link href={href} target={target} rel={rel} aria-label={rest['aria-label']} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button
      {...rest}
      type={type}
      onClick={blocked ? (event) => event.preventDefault() : onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
    >
      {content}
    </button>
  );
}
