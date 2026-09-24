'use client';

import { useEffect, useState } from 'react';
import { getOpeningStatus, timeZoneForState, type OpeningStatus } from '@/lib/hours';
import type { Business } from '@/lib/types';

/**
 * Aberto/fechado depende da hora em que a página é vista, então o cálculo
 * acontece depois da hidratação — a página em cache (ISR) nunca mostra o status
 * errado — e é refeito a cada minuto. A hora é a do fuso do restaurante
 * (`timeZoneForState`), não a do aparelho: quem está em outro fuso vê o mesmo
 * status que a cozinha. `null` até o primeiro cálculo.
 */
export function useOpeningStatus(business: Pick<Business, 'hours' | 'address'>): OpeningStatus | null {
  const [status, setStatus] = useState<OpeningStatus | null>(null);
  const { hours } = business;
  const timeZone = timeZoneForState(business.address.state);

  useEffect(() => {
    const update = () => setStatus(getOpeningStatus(hours, timeZone));
    const first = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 60_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [hours, timeZone]);

  return status;
}
