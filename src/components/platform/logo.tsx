import { cn } from '@/lib/cn';
import { platform } from '@/lib/platform';

/**
 * Marca do MenuQR: três "olhos" de QR code e o ponto de leitura, em branco sobre
 * o verde vivo do WhatsApp (`brand`). SVG inline para herdar os tokens de cor e não pedir
 * mais um arquivo à rede.
 */
export function Logo({
  size = 'md',
  withName = true,
  className,
}: {
  size?: 'sm' | 'md';
  withName?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        className={cn('shrink-0', size === 'md' ? 'size-8' : 'size-7')}
      >
        <rect width="32" height="32" rx="8" className="fill-brand" />
        <g className="fill-white">
          <rect x="7" y="7" width="8" height="8" rx="2" />
          <rect x="17" y="7" width="8" height="8" rx="2" />
          <rect x="7" y="17" width="8" height="8" rx="2" />
          <rect x="17" y="17" width="3.5" height="3.5" rx="1" />
          <rect x="21.5" y="21.5" width="3.5" height="3.5" rx="1" />
        </g>
        <g className="fill-brand">
          <rect x="9.5" y="9.5" width="3" height="3" rx="0.75" />
          <rect x="19.5" y="9.5" width="3" height="3" rx="0.75" />
          <rect x="9.5" y="19.5" width="3" height="3" rx="0.75" />
        </g>
      </svg>
      {withName && (
        <span
          className={cn(
            'font-bold tracking-tight text-gray-700',
            size === 'md' ? 'text-subtitle' : 'text-body1',
          )}
        >
          {platform.name}
        </span>
      )}
    </span>
  );
}
