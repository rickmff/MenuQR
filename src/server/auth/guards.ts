import 'server-only';
import { redirect } from 'next/navigation';
import { getBusinessByOwner } from '../repositories/businesses';
import { getCurrentUser } from './session';
import type { Business, User } from '@/lib/types';

/** Exige login: quem não estiver autenticado vai para a tela de entrada. */
export async function requireUser(returnTo = '/painel'): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?proximo=${encodeURIComponent(returnTo)}`);
  return user;
}

/** Exige login e negócio cadastrado — usado nas telas internas do painel. */
export async function requireBusiness(returnTo = '/painel'): Promise<{ user: User; business: Business }> {
  const user = await requireUser(returnTo);
  const business = await getBusinessByOwner(user.id);
  if (!business) redirect('/painel/comecar');
  return { user, business };
}

/**
 * Confirma que o negócio pertence a quem está logado. Toda ação de escrita passa
 * por aqui antes de tocar no banco.
 */
export async function assertOwnership(businessId: string): Promise<{ user: User; business: Business }> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Sessão expirada. Entre novamente para continuar.');
  const business = await getBusinessByOwner(user.id);
  if (!business || business.id !== businessId) {
    throw new Error('Você não tem permissão para alterar este negócio.');
  }
  return { user, business };
}
