import "server-only";
import { z } from "zod";

/**
 * Variável opcional que pode chegar vazia: o `.env.example` deixa `CHAVE=` para
 * o lojista preencher, e a Vercel manda '' quando o campo existe sem valor.
 * Vazio vira "não configurada", em vez de falhar no `startsWith`.
 */
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    schema.optional(),
  );

const schema = z.object({
  DATABASE_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).default("file:./data/menuqr.db"),
  ),
  DATABASE_AUTH_TOKEN: optional(z.string().min(1)),

  // As chaves do Clerk são lidas pelo próprio SDK; aqui só conferimos o formato
  // quando existem. A obrigatoriedade no modo real é decidida no build, em
  // next.config.ts, onde dá para abortar antes de subir uma versão quebrada.
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: optional(
    z.string().startsWith("pk_", "começa com pk_"),
  ),
  CLERK_SECRET_KEY: optional(z.string().startsWith("sk_", "começa com sk_")),
  CLERK_WEBHOOK_SIGNING_SECRET: optional(
    z.string().startsWith("whsec_", "começa com whsec_"),
  ),

  // A Vercel manda este valor no header dos crons; sem ele a rota de limpeza
  // recusa qualquer chamada.
  CRON_SECRET: optional(z.string().min(16, "pelo menos 16 caracteres")),

  // Cobrança da assinatura (Asaas). O padrão é cobrar: desligar tem de ser um
  // ato explícito, para configuração esquecida nunca liberar o painel de graça.
  BILLING_MODE: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.enum(["asaas", "off"]).default("asaas"),
  ),
  ASAAS_ENV: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.enum(["sandbox", "production"]).default("sandbox"),
  ),
  ASAAS_API_KEY: optional(z.string().min(1)),
  ASAAS_WEBHOOK_TOKEN: optional(z.string().min(16, "pelo menos 16 caracteres")),

  // Quem abre o /admin: e-mails separados por vírgula. Sem a variável, ninguém
  // abre — o padrão é fechado, como o da cobrança.
  SUPER_ADMIN_EMAILS: optional(z.string().min(1)),
});

export type ServerEnv = z.infer<typeof schema>;

let parsed: ServerEnv | null = null;

/**
 * Variáveis de ambiente do servidor, validadas uma vez por processo.
 *
 * A leitura é preguiçosa de propósito: ninguém chama isto no build, então
 * `next build` continua funcionando sem os segredos (a Vercel monta previews
 * assim), e um valor errado só derruba a parte da aplicação que o usa — com
 * uma mensagem que diz qual variável é, em vez de um erro genérico lá na
 * frente.
 */
export function serverEnv(): ServerEnv {
  if (parsed) return parsed;
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const problems = result.error.issues.map(
      (issue) => `${issue.path.join(".") || "?"}: ${issue.message}`,
    );
    throw new Error(
      `Variáveis de ambiente inválidas — ${problems.join("; ")}. Confira o .env.example.`,
    );
  }
  parsed = result.data;
  return parsed;
}
