/** Apaga no Clerk todos os usuários de teste (e-mail começando com e2e-). */
import { deleteClerkUser, listClerkTestUsers } from './lib/session.mjs';
const users = await listClerkTestUsers();
for (const user of users) { await deleteClerkUser(user.id); process.stdout.write(`apagado: ${user.email}\n`); }
process.stdout.write(`${users.length} usuário(s) de teste apagado(s) no Clerk\n`);
