'use client';

import { CircleCheck } from 'lucide-react';
import { useStore } from '@/components/store/store-provider';
import { Button } from '@/components/ui/button';
import { NavIcon } from '@/components/ui/button-icons';
import { WhatsAppGlyph } from '@/components/ui/whatsapp-glyph';

/** Passo `done`: a conversa abriu no WhatsApp com o pedido escrito. */
export function DoneStep() {
  const { business, lastOrderUrl, closeCart } = useStore();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-safe-4 pt-6 text-center">
      <span aria-hidden="true" className="grid size-20 animate-check-pop place-items-center rounded-full bg-primary-tint text-green-700">
        <CircleCheck className="size-10" />
      </span>
      <h3 className="mt-2 font-display text-h5 font-bold text-gray-900">Pedido enviado!</h3>
      <p className="max-w-sm text-body1 text-gray-600">
        Abrimos o WhatsApp do {business.name} com o resumo do seu pedido.{' '}
        <strong className="font-semibold text-gray-900">Confirme o envio na conversa</strong> para que a
        cozinha receba.
      </p>
      <div className="mt-4 flex w-full max-w-sm flex-col gap-3">
        {lastOrderUrl && (
          <Button
            variant="secondary"
            size="cta"
            pill
            fullWidth
            href={lastOrderUrl}
            target="_blank"
            rel="noopener noreferrer"
            after={<WhatsAppGlyph className="size-5" />}
          >
            Abrir o WhatsApp novamente
          </Button>
        )}
        <Button variant="tertiary" size="cta" pill fullWidth after={<NavIcon />} onClick={closeCart} className="cursor-pointer">
          Voltar ao cardápio
        </Button>
      </div>
    </div>
  );
}
