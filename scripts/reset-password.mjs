/**
 * Redefine a senha de um lojista e encerra as sessões abertas dele.
 *
 * A plataforma ainda não envia e-mail, então não existe "esqueci minha senha"
 * na tela de login: quando um lojista perde o acesso, quem opera a plataforma
 * confirma a identidade dele por outro canal e roda este comando.
 *
 * Uso: npm run user:reset-password -- lojista@exemplo.com [nova-senha]
 * Sem a senha, o script sorteia uma. Em produção, aponte DATABASE_URL e
 * DATABASE_AUTH_TOKEN para o banco remoto, como no seed.
 */
import { randomBytes, scryptSync } from 'node:crypto';
import { createClient } from '@libsql/client';

const [emailArg, passwordArg] = process.argv.slice(2);
if (!emailArg) {
  console.error('Uso: npm run user:reset-password -- lojista@exemplo.com [nova-senha]');
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const password = passwordArg ?? randomBytes(9).toString('base64url');
if (password.length < 8) {
  console.error('A senha precisa de pelo menos 8 caracteres.');
  process.exit(1);
}

const url = process.env.DATABASE_URL ?? 'file:./data/menuqr.db';
const authToken = process.env.DATABASE_AUTH_TOKEN;
const db = createClient(authToken ? { url, authToken } : { url });

const found = await db.execute({ sql: 'SELECT id, name FROM users WHERE email = ?', args: [email] });
const user = found.rows[0];
if (!user) {
  console.error(`Nenhuma conta com o e-mail ${email}.`);
  process.exit(1);
}

// Mesmo formato de src/server/auth/password.ts: scrypt$<salt hex>$<hash hex>.
const salt = randomBytes(16);
const hash = `scrypt$${salt.toString('hex')}$${scryptSync(password, salt, 64).toString('hex')}`;

await db.batch(
  [
    { sql: 'UPDATE users SET password_hash = ? WHERE id = ?', args: [hash, user.id] },
    { sql: 'DELETE FROM sessions WHERE user_id = ?', args: [user.id] },
  ],
  'write',
);

console.log(`Senha de ${user.name} <${email}> redefinida; sessões abertas encerradas.`);
console.log(`Nova senha: ${password}`);
