import 'server-only';
import { db } from '../db/client';
import { ensureSchema } from '../db/migrate';

/*
 * As datas desta tabela são ISO 8601 em UTC, e o "agora" das comparações vem do
 * JavaScript no mesmo formato. Misturar com datetime('now') do SQLite (que usa
 * espaço no lugar do "T") faria a comparação de texto errar no próprio dia.
 */

/**
 * Registra um pedido de redefinição e descarta os anteriores do mesmo usuário:
 * só o link mais recente funciona, então um e-mail antigo esquecido na caixa de
 * entrada não vira porta de entrada. De carona, varre os vencidos de todo mundo.
 */
export async function createPasswordReset(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
  await ensureSchema();
  await db.batch(
    [
      {
        sql: 'DELETE FROM password_resets WHERE user_id = ? OR expires_at <= ?',
        args: [userId, new Date().toISOString()],
      },
      {
        sql: 'INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
        args: [tokenHash, userId, expiresAt.toISOString()],
      },
    ],
    'write',
  );
}

/** O link ainda vale? Existe, não foi usado e não venceu. Não altera nada. */
export async function getValidPasswordReset(tokenHash: string): Promise<{ userId: string } | null> {
  await ensureSchema();
  const result = await db.execute({
    sql: `SELECT user_id FROM password_resets
          WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?
          LIMIT 1`,
    args: [tokenHash, new Date().toISOString()],
  });
  const row = result.rows[0];
  return row ? { userId: String(row.user_id) } : null;
}

/**
 * Marca o link como usado e devolve o dono. A validação e a marcação são um
 * UPDATE só: dois envios simultâneos do mesmo link não passam os dois.
 */
export async function consumePasswordReset(tokenHash: string): Promise<string | null> {
  await ensureSchema();
  const now = new Date().toISOString();
  const result = await db.execute({
    sql: `UPDATE password_resets SET used_at = ?
          WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?
          RETURNING user_id`,
    args: [now, tokenHash, now],
  });
  const row = result.rows[0];
  return row ? String(row.user_id) : null;
}

/**
 * Derruba os links pendentes de um usuário. Para quando a senha ou o e-mail
 * mudam por outro caminho (tela de conta): um link pedido antes disso não pode
 * continuar valendo por mais uma hora.
 */
export async function deletePasswordResets(userId: string): Promise<void> {
  await ensureSchema();
  await db.execute({ sql: 'DELETE FROM password_resets WHERE user_id = ?', args: [userId] });
}
