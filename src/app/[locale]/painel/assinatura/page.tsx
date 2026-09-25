import { DemoSubscription } from '@/components/demo/demo-pages';
import { SubscriptionPanel } from '@/components/painel/subscription-panel';
import { demoMode } from '@/lib/demo/config';
import { asaasConfigured } from '@/server/asaas/config';
import { requireUser } from '@/server/auth/guards';
import { getBillingAccess, loadBillingAccess, SUBSCRIPTION_PATH } from '@/server/billing/access';
import { billingMode } from '@/server/billing/config';
import { ensurePixQr, openPayment, syncFromAsaas } from '@/server/billing/lifecycle';
import { listPaymentsBySubscription } from '@/server/repositories/subscriptions';
import { getBusinessByOwner } from '@/server/repositories/businesses';
import { getBillingIdentity } from '@/server/repositories/users';
import type { BillingAccess, BillingPayment } from '@/lib/billing';

export const metadata = { title: 'Assinatura', robots: { index: false } };

/** Sincronização com o Asaas durante o render só quando não há cobrança em aberto e faz tempo. */
const SYNC_COOLDOWN_MS = 60_000;

/**
 * As cobranças da assinatura em aberto e a que está para pagar, com o QR
 * garantido. Em carência ou vencida sem cobrança à vista, puxa do Asaas (o
 * webhook pode ter se perdido) — sem revalidar cache, porque estamos no
 * meio de um render.
 */
async function loadCharges(access: BillingAccess, user: Parameters<typeof loadBillingAccess>[0]) {
  let current = access.current;
  if (!current) return { access, payments: [] as BillingPayment[], open: null as BillingPayment | null };

  let open = await openPayment(current);
  const stale = !current.syncedAt || Date.now() - new Date(`${current.syncedAt}Z`).getTime() > SYNC_COOLDOWN_MS;
  if (!open && stale && current.asaasSubscriptionId) {
    try {
      await syncFromAsaas(current, false);
      access = await loadBillingAccess(user);
      current = access.current ?? current;
      open = await openPayment(current);
    } catch (error) {
      console.error('[assinatura] sincronização com o Asaas falhou:', error);
    }
  }

  if (open) {
    try {
      open = await ensurePixQr(open);
    } catch (error) {
      // A tela mostra o link da cobrança no Asaas como saída.
      console.error('[assinatura] QR da cobrança falhou:', error);
    }
  }

  return { access, payments: await listPaymentsBySubscription(current.id), open };
}

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ novo?: string | string[] }>;
}) {
  if (demoMode) return <DemoSubscription />;

  const user = await requireUser(SUBSCRIPTION_PATH);
  const initial = await getBillingAccess(user);
  const [business, identity, charges, params] = await Promise.all([
    getBusinessByOwner(user.id),
    getBillingIdentity(user.id),
    loadCharges(initial, user),
    searchParams,
  ]);

  return (
    <SubscriptionPanel
      access={charges.access}
      hasBusiness={Boolean(business)}
      userName={user.name}
      cpfCnpj={identity.cpfCnpj}
      payments={charges.payments}
      openPayment={charges.open}
      configured={billingMode() === 'asaas' && asaasConfigured()}
      showForm={params.novo === '1'}
    />
  );
}
