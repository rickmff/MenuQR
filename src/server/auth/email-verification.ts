import 'server-only';
import { absoluteUrl } from '@/lib/site';
import type { User } from '@/lib/types';
import { emailVerificationEmail, sendEmail } from '../email';
import { saveVerificationToken } from '../repositories/email-verifications';
import { createToken } from './tokens';

/**
 * Gera um link novo de confirmação e manda para o e-mail da conta. Nunca lança:
 * a confirmação é um extra, e uma falha aqui não pode custar o cadastro (nem a
 * troca de e-mail) de ninguém.
 *
 * Mora fora de `actions/auth.ts` de propósito: num arquivo 'use server' toda
 * função exportada vira endpoint público, e esta recebe o destinatário por
 * parâmetro — exportada de lá, qualquer um dispararia e-mail para quem quisesse.
 */
export async function sendVerificationEmail(user: Pick<User, 'id' | 'name' | 'email'>): Promise<{ sent: boolean }> {
  try {
    const { token, tokenHash } = createToken();
    await saveVerificationToken(user.id, tokenHash);
    const content = emailVerificationEmail({
      name: user.name,
      url: absoluteUrl(`/confirmar-email/${token}`),
    });
    return await sendEmail({ to: user.email, ...content });
  } catch (error) {
    console.error('[email] Falha ao preparar a confirmação de e-mail:', error);
    return { sent: false };
  }
}
