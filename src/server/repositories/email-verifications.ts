import 'server-only';
import { db } from '../db/client';
import { ensureSchema } from '../db/migrate';

/** Validade do link de confirmação, contada a partir do envio (`sent_at`). */
const LINK_DAYS = 7;

/* Datas em ISO 8601 (UTC), comparadas com o "agora" do JavaScript no mesmo formato. */

export async function isEmailVerified(userId: string): Promise<boolean> {
  await ensureSchema();
  const result = await db.execute({
    sql: 'SELECT 1 FROM email_verifications WHERE user_id = ? AND verified_at IS NOT NULL LIMIT 1',
    args: [userId],
  });
  return result.rows.length > 0;
}

/**
 * Guarda o token do link mais recente. Uma linha por usuário: reenviar troca o
 * token e o link anterior para de funcionar. `verified_at` fica como está.
 */
export async function saveVerificationToken(userId: string, tokenHash: string): Promise<void> {
  await ensureSchema();
  await db.execute({
    sql: `INSERT INTO email_verifications (user_id, token_hash, sent_at) VALUES (?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET token_hash = excluded.token_hash, sent_at = excluded.sent_at`,
    args: [userId, tokenHash, new Date().toISOString()],
  });
}

/**
 * Confirma o e-mail de quem abriu o link e devolve o id do usuário. O token é
 * apagado na mesma instrução, então o link vale uma vez só.
 */
export async function verifyEmailByToken(tokenHash: string): Promise<string | null> {
  await ensureSchema();
  const now = new Date();
  const oldestValid = new Date(now.getTime() - LINK_DAYS * 24 * 60 * 60 * 1000);
  const result = await db.execute({
    sql: `UPDATE email_verifications
          SET verified_at = COALESCE(verified_at, ?), token_hash = NULL
          WHERE token_hash = ? AND sent_at > ?
          RETURNING user_id`,
    args: [now.toISOString(), tokenHash, oldestValid.toISOString()],
  });
  const row = result.rows[0];
  return row ? String(row.user_id) : null;
}

/**
 * Confirmação por outro caminho: quem redefiniu a senha pelo link do e-mail já
 * provou que a caixa de entrada é dele. Cria a linha se o usuário é anterior à
 * confirmação de e-mail e nunca teve uma.
 */
export async function markEmailVerified(userId: string): Promise<void> {
  await ensureSchema();
  await db.execute({
    sql: `INSERT INTO email_verifications (user_id, verified_at) VALUES (?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            verified_at = COALESCE(email_verifications.verified_at, excluded.verified_at),
            token_hash  = NULL`,
    args: [userId, new Date().toISOString()],
  });
}

/**
 * O e-mail da conta mudou: a confirmação valia para o endereço antigo, e o link
 * pendente também. Volta ao estado de "ainda não confirmado".
 */
export async function resetEmailVerification(userId: string): Promise<void> {
  await ensureSchema();
  await db.execute({ sql: 'DELETE FROM email_verifications WHERE user_id = ?', args: [userId] });
}
