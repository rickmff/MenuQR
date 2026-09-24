import { cn } from '@/lib/cn';

type AvatarSize = 40 | 48 | 56 | 64;

const SIZES: Record<AvatarSize, string> = {
  40: 'size-10 text-h6',
  48: 'size-12 text-h5',
  56: 'size-14 text-h4',
  64: 'size-16 text-h3',
};

/** A forma troca raio E borda: sem tailwind-merge, acrescentar em cima brigaria. */
const SHAPES = {
  circle: 'rounded-full border border-gray-200',
  /** Logo da loja no cabeçalho: quadrado de cantos 16 com moldura branca, sobre a capa. */
  square: 'rounded-lg border-[3px] border-white shadow-low',
} as const;

/** Logo (URL), emoji ou iniciais: o que o lojista cadastrou, sempre num círculo. */
export function isImageUrl(value: string): boolean {
  return /^(https?:\/\/|\/)/.test(value);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Avatar da loja no padrão do iFood: círculo com borda fina e fundo cinza.
 * Decorativo — o nome da loja vai sempre em texto ao lado.
 */
export function Avatar({
  logo,
  name,
  size = 48,
  shape = 'circle',
  className,
}: {
  logo?: string;
  name: string;
  size?: AvatarSize;
  shape?: keyof typeof SHAPES;
  className?: string;
}) {
  const value = logo?.trim() ?? '';
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 select-none place-items-center overflow-hidden bg-gray-100 font-semibold text-gray-700',
        SHAPES[shape],
        SIZES[size],
        className,
      )}
    >
      {isImageUrl(value) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="size-full object-cover" />
      ) : value ? (
        <span className="leading-none">{value}</span>
      ) : (
        <span className="text-body2">{initials(name)}</span>
      )}
    </span>
  );
}
