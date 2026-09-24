import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'text' | 'brand' | 'dark' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'cta';

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Troca o conteúdo à esquerda por um spinner e bloqueia o clique. */
  loading?: boolean;
  fullWidth?: boolean;
  /**
   * Cantos pill: site institucional (landing) e as telas do cliente (loja,
   * item, sacola — refactor "de app" de 2026-09-24). No painel o raio é 8px.
   */
  pill?: boolean;
  leading?: ReactNode;
  /** Conteúdo alinhado à direita — o preço em "Adicionar    R$ 29,90". */
  trailing?: ReactNode;
  /**
   * Ícone COLADO ao rótulo, depois dele. É o padrão do site do WhatsApp
   * (D22): lá todo botão leva um ícone à direita — o chevron em "Log In", a
   * seta para baixo em "Download" —, nunca à esquerda.
   *
   * Diferente de `trailing`, que é o preço e vai para a outra ponta do botão:
   * `after` anda junto com o texto e fica centralizado com ele.
   */
  after?: ReactNode;
  /** Com href o botão vira um <Link> com a mesma aparência. */
  href?: string;
  /** O <button> (React 19 passa `ref` como prop). Não vale para o ramo com `href`. */
  ref?: Ref<HTMLButtonElement>;
  target?: string;
  rel?: string;
}

export type ButtonProps = ButtonOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps>;

/**
 * As quatro primeiras variantes são do app (loja, item, sacola, painel).
 *
 * As três últimas existem só para o SITE INSTITUCIONAL (landing, auth) e vieram
 * da revisão de cor de 2026-09-23 — D19: uma dobra tem no máximo um verde
 * cheio. Sem elas o header, o hero, o cartão de preço e o bloco final
 * repetiriam `primary` quatro vezes na mesma tela e nenhum seria o CTA.
 *
 * - `brand` é o verde vivo do WhatsApp com rótulo GRAFITE (8,8:1 — mais legível
 *   que branco sobre `primary`, que dá 4,68:1). É o único botão verde da
 *   landing. Branco sobre `brand` continua proibido: 1,98:1.
 * - `dark` é a mesma ação repetida fora da dobra principal (o botão do header),
 *   em grafite para não disputar com o CTA verde.
 * - `ghost` é o `text` em grafite, para link que não deve puxar cor.
 */
/**
 * `secondary` virou o "Log In" do WhatsApp em 2026-09-23 (D22): branco com
 * **borda grafite**, não verde. Medido no site deles, o botão secundário é
 * `#ffffff` com texto e contorno `#1c1e21` — o verde fica reservado ao botão
 * que é a ação principal. De quebra, a borda passou de 1,47:1 (a verde sobre
 * branco) para 17,46:1, então ela cumpre sozinha o mínimo de 3:1 que a WCAG
 * pede para o limite de um controle.
 *
 * **Os dois botões verdes levam a mesma borda** (decisão do dono, 2026-09-23):
 * o contorno grafite passou a ser o desenho do botão, e não a marca do
 * secundário — com ele em volta do verde, primário e secundário viram o mesmo
 * objeto em duas cores, em vez de dois desenhos diferentes. O estado
 * desabilitado carrega `border` também: sem ela o botão encolheria 2px ao
 * desabilitar.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'border border-gray-900 bg-primary text-white hover:bg-primary-hover active:bg-primary-pressed',
  secondary: 'border border-gray-900 bg-white text-gray-900 hover:bg-gray-100 active:bg-gray-200',
  tertiary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300',
  text: 'text-primary hover:bg-gray-50 active:bg-gray-100',
  brand: 'border border-gray-900 bg-brand text-gray-900 hover:bg-green-300 active:bg-green-500',
  dark: 'bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-700',
  ghost: 'text-gray-900 hover:bg-gray-100 active:bg-gray-200',
};

/**
 * Desativado: estático, sem hover nem press. Vale tanto para `disabled` quanto
 * para `aria-disabled` — o botão que continua focável só para explicar por que
 * não dá para usá-lo (ver `Tooltip`).
 */
const DISABLED: Record<ButtonVariant, string> = {
  primary: 'border border-gray-300 bg-gray-200 text-gray-400',
  secondary: 'border border-gray-300 bg-white text-gray-400',
  tertiary: 'bg-gray-100 text-gray-400',
  text: 'text-gray-400',
  brand: 'border border-gray-300 bg-gray-200 text-gray-400',
  dark: 'bg-gray-200 text-gray-400',
  ghost: 'text-gray-400',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-body2',
  md: 'h-12 px-5 text-body2',
  lg: 'h-14 px-6 text-body1',
  /** CTA das telas do cliente: 48px de altura com rótulo de 16, como nos apps de delivery. */
  cta: 'h-12 px-6 text-body1',
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
    // Na pílula o cinza → verde ao liberar (grupo obrigatório escolhido) também anima na volta.
    disabled && pill && 'transition-colors duration-200 ease-standard',
    pill ? 'rounded-full' : 'rounded-sm',
    fullWidth && 'w-full',
    disabled ? DISABLED[variant] : VARIANTS[variant],
    SIZES[size],
  );
}

/**
 * Botão do iFood: chapado, raio 8, sem sombra nem gradiente. As props descrevem
 * o papel (variant, loading), nunca o estilo — padrão do IFDS.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  pill = false,
  leading,
  trailing,
  after,
  href,
  target,
  rel,
  ref,
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
        {/* `shrink-0`: o rótulo é quem trunca, o ícone nunca encolhe. */}
        {after !== undefined && <span className="inline-flex shrink-0">{after}</span>}
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
      ref={ref}
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
