import { formatDateBR, type BillingAccess } from '@/lib/billing';

/**
 * O que o painel diz sobre a assinatura, calculado no servidor (sem React):
 * a casca mostra como Banner, a tela de conta como linha de apoio.
 */

export interface BillingNotice {
  tone: 'info' | 'warning' | 'error' | 'neutral';
  title: string;
  message: string;
  label: string;
}

export function billingNotice(access: BillingAccess): BillingNotice | null {
  if (access.exempt) return null;
  const paidUntil = access.paidUntil ? formatDateBR(access.paidUntil) : '';
  const graceUntil = access.graceUntil ? formatDateBR(access.graceUntil) : '';

  switch (access.state) {
    case 'past_due':
      return {
        tone: 'warning',
        title: `Sua assinatura venceu em ${paidUntil}`,
        message: `Pague a renovação até ${graceUntil} para o painel e o cardápio continuarem no ar.`,
        label: 'Pagar renovação',
      };
    case 'expired':
      return {
        tone: 'error',
        title: `Painel e cardápio bloqueados: a assinatura venceu em ${paidUntil}`,
        message: 'Pague a renovação para voltar ao ar.',
        label: 'Pagar renovação',
      };
    case 'cancelled':
      return access.allowed
        ? {
            tone: 'neutral',
            title: 'Renovação cancelada',
            message: `Você usa o painel até ${paidUntil}.`,
            label: 'Reativar',
          }
        : {
            tone: 'error',
            title: 'Assinatura encerrada',
            message: 'Assine de novo para voltar a usar o painel.',
            label: 'Assinar',
          };
    case 'pending':
      return {
        tone: 'info',
        title: 'Falta o pagamento para liberar o painel',
        message: 'Pague o Pix da assinatura. Confirmamos em até um minuto.',
        label: 'Pagar agora',
      };
    case 'none':
      return {
        tone: 'info',
        title: 'Assine para liberar o painel',
        message: 'Plano único, pago por Pix uma vez por ano.',
        label: 'Assinar',
      };
    case 'active':
      return access.renewalDue
        ? {
            tone: 'info',
            title: `Sua assinatura renova em ${paidUntil}`,
            message: 'Quando a cobrança da renovação for gerada, o Pix aparece em Assinatura.',
            label: 'Ver assinatura',
          }
        : null;
    default:
      return null;
  }
}

/** Uma linha só, para a tela de conta. */
export function billingStatusLine(access: BillingAccess): string {
  if (access.exempt) return 'Sua conta não precisa de assinatura.';
  const paidUntil = access.paidUntil ? formatDateBR(access.paidUntil) : '';
  switch (access.state) {
    case 'active':
      return `Ativa · renovação em ${paidUntil}.`;
    case 'pending':
      return 'Aguardando o pagamento do Pix.';
    case 'past_due':
      return `Vencida em ${paidUntil} · carência até ${access.graceUntil ? formatDateBR(access.graceUntil) : ''}.`;
    case 'expired':
      return `Vencida em ${paidUntil}. Painel e cardápio bloqueados.`;
    case 'cancelled':
      return access.allowed ? `Renovação cancelada · acesso até ${paidUntil}.` : 'Assinatura encerrada.';
    default:
      return 'Sem assinatura.';
  }
}
