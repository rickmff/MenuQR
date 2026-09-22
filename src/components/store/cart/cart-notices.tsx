import { Clock, Info } from 'lucide-react';
import { Banner } from '@/components/ui/banner';
import type { CartReview } from '@/lib/cart-store';
import { formatPrice } from '@/lib/format';

/**
 * Loja fechada, avisado no topo da sacola — e não no último clique, depois de
 * o cliente já ter digitado endereço e telefone.
 */
export function ClosedNotice({ blocking, next }: { blocking: boolean; next: string }) {
  return (
    <Banner tone={blocking ? 'warning' : 'neutral'} icon={<Clock className="size-5" />} title="Fechado agora">
      {next}.{' '}
      {blocking
        ? 'Você pode montar o pedido, mas só dá para enviar quando abrirmos.'
        : 'Seu pedido vai como agendamento — o restaurante confirma o horário na conversa.'}
    </Banner>
  );
}

/**
 * O que mudou no cardápio enquanto a sacola esperava. Some quando o cliente
 * dispensa; até lá, ele vê exatamente o que foi corrigido e por quê.
 */
export function ReviewNotice({ review, onDismiss }: { review: CartReview; onDismiss: () => void }) {
  return (
    <Banner
      tone="info"
      role="status"
      icon={<Info className="size-5" />}
      title="O cardápio mudou desde a sua última visita"
      onDismiss={onDismiss}
    >
      <ul className="mt-1 space-y-1">
        {review.soldOut.map((name) => (
          <li key={`esgotado-${name}`}>
            <strong className="font-semibold">{name}</strong> esgotou e saiu do seu pedido.
          </li>
        ))}
        {review.removed.map((name) => (
          <li key={`removido-${name}`}>
            <strong className="font-semibold">{name}</strong> não está mais no cardápio e saiu do seu
            pedido.
          </li>
        ))}
        {review.changed.map((name) => (
          <li key={`opcoes-${name}`}>
            As opções de <strong className="font-semibold">{name}</strong> mudaram. Ele saiu do seu
            pedido — adicione de novo para escolher.
          </li>
        ))}
        {review.repriced.map((entry) => (
          <li key={`preco-${entry.name}`}>
            <strong className="font-semibold">{entry.name}</strong> mudou de {formatPrice(entry.from)}{' '}
            para {formatPrice(entry.to)}.
          </li>
        ))}
      </ul>
    </Banner>
  );
}
