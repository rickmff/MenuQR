'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { describeNextOpening, getOpeningStatus } from '@/lib/hours';
import { restaurant } from '@/lib/restaurant';

/**
 * Aberto/fechado depende do horário de quem acessa, então o cálculo acontece
 * depois da hidratação — assim o HTML estático não é servido com informação
 * errada em cache.
 */
export function OpeningBadge({ className }: { className?: string }) {
  const [status, setStatus] = useState<{ open: boolean; label: string } | null>(null);

  useEffect(() => {
    const update = () => {
      const current = getOpeningStatus(restaurant);
      setStatus({ open: current.open, label: describeNextOpening(current) });
    };
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!status) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-2 rounded-full bg-cream-100 px-3 py-1.5 text-xs font-semibold text-charcoal-500',
          className,
        )}
      >
        Consultando horário…
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold',
        status.open ? 'bg-whatsapp-500/12 text-whatsapp-600' : 'bg-ember-50 text-ember-700',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-2 rounded-full', status.open ? 'bg-whatsapp-500' : 'bg-ember-500')}
      />
      {status.label}
    </span>
  );
}
