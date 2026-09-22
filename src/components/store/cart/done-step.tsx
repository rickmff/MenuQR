'use client';

import { CircleCheck } from 'lucide-react';
import { useStore } from '@/components/store/store-provider';
import { Button } from '@/components/ui/button';

/** Passo `done`: a conversa abriu no WhatsApp com o pedido escrito. */
export function DoneStep() {
  const { business, lastOrderUrl, closeCart } = useStore();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <span aria-hidden="true" className="grid size-16 place-items-center rounded-full bg-success-bg text-success">
        <CircleCheck className="size-8" />
      </span>
      <h3 className="text-h6 font-bold text-gray-700">Pedido enviado!</h3>
      <p className="max-w-sm text-body2 text-gray-600">
        Abrimos o WhatsApp do {business.name} com o resumo do seu pedido.{' '}
        <strong className="font-semibold text-gray-700">Confirme o envio na conversa</strong> para que a
        cozinha receba.
      </p>
      {lastOrderUrl && (
        <Button variant="secondary" href={lastOrderUrl} target="_blank" rel="noopener noreferrer">
          Abrir o WhatsApp novamente
        </Button>
      )}
      <Button variant="text" onClick={closeCart}>
        Voltar ao cardápio
      </Button>
    </div>
  );
}
