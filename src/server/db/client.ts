import 'server-only';
import { createClient, type Client } from '@libsql/client';

const globalForDb = globalThis as unknown as { __menuqrClient?: Client };

const DEFAULT_FILE_URL = 'file:./data/menuqr.db';

/** Plataformas serverless têm disco somente leitura e efêmero. */
function isServerless(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export class DatabaseConfigError extends Error {}

function createDbClient(): Client {
  const url = process.env.DATABASE_URL ?? DEFAULT_FILE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  // Mensagem clara em vez de um erro genérico: no serverless o arquivo SQLite
  // some a cada execução e o disco é somente leitura.
  if (url.startsWith('file:') && isServerless()) {
    throw new DatabaseConfigError(
      'DATABASE_URL não configurada para este ambiente. Em hospedagem serverless ' +
        '(Vercel, Lambda) o SQLite em arquivo não funciona: crie um banco libSQL/Turso e defina ' +
        'DATABASE_URL=libsql://... e DATABASE_AUTH_TOKEN nas variáveis de ambiente do projeto.',
    );
  }

  return createClient(authToken ? { url, authToken } : { url });
}

/**
 * A conexão é criada na primeira consulta (e não na importação do módulo):
 * assim uma configuração errada de banco não derruba páginas que nem usam o
 * banco, e quem trata o erro consegue capturá-lo.
 */
function getClient(): Client {
  if (!globalForDb.__menuqrClient) {
    globalForDb.__menuqrClient = createDbClient();
  }
  return globalForDb.__menuqrClient;
}

/** Cliente do banco: mesma API do libSQL, com conexão preguiçosa. */
export const db: Pick<Client, 'execute' | 'batch'> = {
  execute: (...args: Parameters<Client['execute']>) => getClient().execute(...args),
  batch: (...args: Parameters<Client['batch']>) => getClient().batch(...args),
};
