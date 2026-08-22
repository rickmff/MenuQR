'use client';

import { useEffect, useMemo, useState } from 'react';
import { demoMode } from '@/lib/demo/config';
import { SAMPLE_BUSINESS_ID } from '@/lib/demo/sample-data';
import { QR_CAPACITY, buildShareUrl } from '@/lib/share-link';
import { siteUrl } from '@/lib/site';
import type { Business, MenuCategory } from '@/lib/types';

export interface ShareUrl {
  /** Endereço para copiar, compartilhar e virar QR code. */
  url: string;
  /** true quando o cardápio ficou grande demais para caber num QR code. */
  tooBigForQr: boolean;
}

/**
 * Endereço público do cardápio, pronto para copiar, compartilhar ou virar QR.
 *
 * Com banco de dados é o endereço curto de sempre. Sem banco (modo
 * demonstração) o link precisa carregar o cardápio inteiro, senão só abre no
 * aparelho onde foi criado. Compactar é assíncrono: até ficar pronto devolvemos
 * o endereço curto, que já serve para quem está no próprio aparelho.
 */
export function useShareUrl(business: Business | null, menu: MenuCategory[]): ShareUrl {
  const shortUrl = business ? `${siteUrl}/r/${business.slug}` : siteUrl;
  const [url, setUrl] = useState<string | null>(null);

  // O cardápio chega como um array novo a cada render; a assinatura estabiliza
  // a dependência e evita recompactar sem que nada tenha mudado.
  const snapshot = useMemo(() => JSON.stringify({ business, menu }), [business, menu]);

  useEffect(() => {
    if (!demoMode) return;

    let active = true;
    const { business: current, menu: currentMenu } = JSON.parse(snapshot) as {
      business: Business | null;
      menu: MenuCategory[];
    };
    // O restaurante de exemplo o servidor conhece de cor: link curto basta.
    if (!current || current.id === SAMPLE_BUSINESS_ID) return;
    // A origem real vale mais que a configurada: prévias e aparelhos na mesma
    // rede precisam de um link que abra onde a pessoa está.
    buildShareUrl(window.location.origin, current, currentMenu)
      .then((next) => {
        if (active) setUrl(next);
      })
      .catch(() => {
        if (active) setUrl(null);
      });
    return () => {
      active = false;
    };
  }, [snapshot]);

  return {
    url: url ?? shortUrl,
    tooBigForQr: url !== null && url.length > QR_CAPACITY,
  };
}
