import { Clock, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Banner } from '@/components/ui/banner';
import type { CartReview } from '@/lib/cart-store';
import { formatPrice } from '@/lib/format';

/**
 * Loja fechada, avisado no topo da sacola — e não no último clique, depois de
 * o cliente já ter digitado endereço e telefone. Fechado não impede pedir: o
 * aviso é só para o cliente não esperar a entrega para agora. Não promete
 * agendamento — quem diz quando sai é o restaurante, na conversa.
 */
export function ClosedNotice({ next }: { next: string }) {
  const t = useTranslations('store.notices');
  return (
    <Banner tone="warning" radius="md" icon={<Clock className="size-5" />} title={t('closedTitle')}>
      {t('closedDescription', { next })}
    </Banner>
  );
}

/**
 * O que mudou no cardápio enquanto a sacola esperava. Some quando o cliente
 * dispensa; até lá, ele vê exatamente o que foi corrigido e por quê.
 */
export function ReviewNotice({ review, onDismiss }: { review: CartReview; onDismiss: () => void }) {
  const t = useTranslations('store.notices');
  const b = (chunks: React.ReactNode) => <strong className="font-semibold">{chunks}</strong>;
  return (
    <Banner
      tone="info"
      radius="md"
      role="status"
      icon={<Info className="size-5" />}
      title={t('reviewTitle')}
      onDismiss={onDismiss}
    >
      <ul className="mt-1 space-y-1">
        {review.soldOut.map((name) => (
          <li key={`esgotado-${name}`}>
            {t.rich('soldOut', { name, b })}
          </li>
        ))}
        {review.removed.map((name) => (
          <li key={`removido-${name}`}>
            {t.rich('removed', { name, b })}
          </li>
        ))}
        {review.changed.map((name) => (
          <li key={`opcoes-${name}`}>
            {t.rich('changed', { name, b })}
          </li>
        ))}
        {review.repriced.map((entry) => (
          <li key={`preco-${entry.name}`}>
            {t.rich('repriced', { name: entry.name, from: formatPrice(entry.from), to: formatPrice(entry.to), b })}
          </li>
        ))}
      </ul>
    </Banner>
  );
}
