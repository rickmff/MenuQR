'use client';

import { useMountAnimation } from '@/components/store/store-provider';
import { cn } from '@/lib/cn';

/**
 * Contador verde no canto de um botão (sacola, "+" do cardápio). A `key` com o
 * número remonta o selo a cada mudança, e só então ele dá o "pop" — nunca na
 * carga da página (ver `useMountAnimation`).
 */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return <Pop key={count} count={count} className={className} />;
}

function Pop({ count, className }: { count: number; className?: string }) {
  const animate = useMountAnimation();
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-white',
        animate && 'animate-badge-pop',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
