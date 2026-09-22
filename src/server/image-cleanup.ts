import 'server-only';
import { after } from 'next/server';
import { deleteOrphanImages } from './repositories/images';

/**
 * Agenda a limpeza de fotos órfãs do negócio para depois da resposta.
 *
 * É chamado quando algo deixa de apontar para uma foto (item apagado, foto
 * trocada, logo trocada). Roda fora do caminho da resposta para não segurar o
 * lojista, e uma falha aqui não pode virar erro numa ação que já deu certo.
 * Quem nunca mais mexe no cardápio é coberto pela limpeza diária
 * (`/api/cron/limpeza`).
 */
export function cleanupOrphanImagesLater(businessId: string): void {
  after(() =>
    deleteOrphanImages(businessId).catch((error) => {
      console.error('[imagens] limpeza de órfãs falhou:', error);
    }),
  );
}
