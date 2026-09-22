'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const INTERVAL_MS = 15_000;

/**
 * Enquanto o Pix não cai, a página se recarrega sozinha: o webhook do Asaas
 * grava o pagamento e a próxima renderização já mostra o painel liberado, sem
 * o lojista precisar apertar nada. Relógio só depois de hidratar.
 */
export function PendingPoller() {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => router.refresh(), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [router]);
  return null;
}
