import 'server-only';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { localeFromRequest } from '@/i18n/locale';
import { assertSubscription, requireSubscription } from '../billing/access';
import { getBusinessByOwner } from '../repositories/businesses';
import { getCurrentUser } from './current-user';
import type { Business, User } from '@/lib/types';

/** Exige login: quem não estiver autenticado vai para a tela de entrada. */
export async function requireUser(returnTo = '/painel'): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?proximo=${encodeURIComponent(returnTo)}`);
  return user;
}

/**
 * Exige login, assinatura e negócio cadastrado — usado nas telas internas do
 * painel. A assinatura vem antes do negócio: sem ela, o lojista vai pagar,
 * não cadastrar.
 */
export async function requireBusiness(returnTo = '/painel'): Promise<{ user: User; business: Business }> {
  const user = await requireUser(returnTo);
  await requireSubscription(user);
  const business = await getBusinessByOwner(user.id);
  if (!business) redirect('/painel/comecar');
  return { user, business };
}

/**
 * Confirma que o negócio pertence a quem está logado e que a assinatura está
 * em dia. Toda ação de escrita passa por aqui antes de tocar no banco.
 */
export async function assertOwnership(businessId: string): Promise<{ user: User; business: Business }> {
  const user = await getCurrentUser();
  // A mensagem chega ao lojista pelo `error` das server actions. O idioma vem
  // do pedido (cookie ou navegador): serve à server action e à rota de fotos.
  const t = async () => getTranslations({ locale: await localeFromRequest(), namespace: 'api' });
  if (!user) throw new Error((await t())('auth.sessionExpired'));
  await assertSubscription(user);
  const business = await getBusinessByOwner(user.id);
  if (!business || business.id !== businessId) {
    throw new Error((await t())('auth.notOwner'));
  }
  return { user, business };
}
