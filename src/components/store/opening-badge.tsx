'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { describeNextOpening, getOpeningStatus } from '@/lib/hours';
import type { WeeklyHours } from '@/lib/types';

/**
 * Aberto/fechado depende da hora em que a página é vista, então o cálculo
 * acontece depois da hidratação — assim a página em cache nunca mostra o status
 * errado. A hora é lida no fuso do restaurante (`timeZoneForState`), não no do
 * aparelho: quem está em outro fuso vê o mesmo status que a cozinha.
 */
export function OpeningBadge({
  hours,
  timeZone,
  className,
}: {
  hours: WeeklyHours;
  timeZone: string;
  className?: string;
}) {
  const [status, setStatus] = useState<{ open: boolean; label: string } | null>(null);

  useEffect(() => {
    const update = () => {
      const current = getOpeningStatus(hours, timeZone);
      setStatus({ open: current.open, label: describeNextOpening(current) });
    };
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, [hours, timeZone]);

  if (!status) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-caption font-semibold text-gray-600',
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
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-caption font-semibold',
        status.open ? 'bg-success-bg text-success' : 'bg-gray-100 text-gray-700',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-2 rounded-full', status.open ? 'bg-positive' : 'bg-gray-400')}
      />
      {status.label}
    </span>
  );
}
