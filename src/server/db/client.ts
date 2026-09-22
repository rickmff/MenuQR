import 'server-only';
import { createClient, type Client } from '@libsql/client';
import { serverEnv } from '../env';

// Guardado com a URL que o criou: em desenvolvimento o Next recarrega o
// `.env.local` sem reiniciar o processo, e um cliente preso à URL antiga
// continuaria escrevendo no arquivo local depois de a variável apontar para o
// Turso (aconteceu: a conta nova "sumiu").
const globalForDb = globalThis as unknown as { __menuqrClient?: { url: string; client: Client } };

/** Plataformas serverless têm disco somente leitura e efêmero. */
function isServerless(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export class DatabaseConfigError extends Error {}

/**
 * A checagem "já existe?" e o INSERT não são atômicos: dois envios simultâneos
 * passam pela checagem e o segundo esbarra no UNIQUE do banco.
 */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && /UNIQUE constraint failed/i.test(error.message);
}

function createDbClient(): Client {
  // O padrão `file:./data/menuqr.db` vem do schema de ambiente.
  const { DATABASE_URL: url, DATABASE_AUTH_TOKEN: authToken } = serverEnv();

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
  const { DATABASE_URL: url } = serverEnv();
  const cached = globalForDb.__menuqrClient;
  if (cached && cached.url === url) return cached.client;
  cached?.client.close();
  const client = createDbClient();
  globalForDb.__menuqrClient = { url, client };
  return client;
}

/** Cliente do banco: mesma API do libSQL, com conexão preguiçosa. */
export const db: Pick<Client, 'execute' | 'batch'> = {
  execute: (...args: Parameters<Client['execute']>) => getClient().execute(...args),
  batch: (...args: Parameters<Client['batch']>) => getClient().batch(...args),
};
