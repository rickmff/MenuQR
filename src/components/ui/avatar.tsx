import { cn } from '@/lib/cn';

type AvatarSize = 40 | 48 | 56;

const SIZES: Record<AvatarSize, string> = {
  40: 'size-10 text-h6',
  48: 'size-12 text-h5',
  56: 'size-14 text-h4',
};

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
  className,
}: {
  logo?: string;
  name: string;
  size?: AvatarSize;
  className?: string;
}) {
  const value = logo?.trim() ?? '';
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 select-none place-items-center overflow-hidden rounded-full border border-gray-200 bg-gray-100 font-semibold text-gray-700',
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
