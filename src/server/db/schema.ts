import 'server-only';

/**
 * Versão do esquema, gravada na tabela `schema_version` depois de cada
 * migração. Quando a versão gravada é esta, `ensureSchema()` não roda nada —
 * uma ida ao banco em vez de uma por comando a cada instância nova. (Seria o
 * `PRAGMA user_version`, mas o Turso lê e não deixa gravar nele.)
 *
 * SUBA ESTE NÚMERO sempre que mudar `SCHEMA_SQL` ou qualquer `align…Table()`
 * em migrate.ts; senão a mudança nunca chega a um banco que já existe.
 *
 * Histórico: 1 = tabela `webhook_events`; 2 = assinatura (colunas de cobrança
 * em `users`, tabelas `subscriptions` e `billing_payments`).
 */
export const SCHEMA_VERSION = 2;

/**
 * Esquema do banco. Mantido como módulo (e não arquivo .sql lido em runtime)
 * para funcionar em qualquer alvo de deploy, inclusive serverless.
 *
 * Regras para editar: só CREATE/DROP/ALTER/PRAGMA; nenhum `;` dentro de texto
 * entre aspas nem de comentário que precise sobreviver; sem triggers. O
 * divisor no fim do arquivo confere isso ao carregar o módulo.
 */
export const SCHEMA_SQL = `-- Esquema do MenuQR. Executado automaticamente na primeira consulta.
-- O PRAGMA vale só para a conexão que o executa. No Turso cada consulta pode
-- vir por uma conexão diferente, então o ON DELETE CASCADE das tabelas abaixo
-- é documentação da intenção, não garantia: quem apaga faz os DELETEs
-- explícitos (src/server/repositories/cascade.ts).
PRAGMA foreign_keys = ON;

-- Uma linha só: a versão do schema aplicada (veja SCHEMA_VERSION). O CHECK
-- impede uma segunda linha por engano.
CREATE TABLE IF NOT EXISTS schema_version (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  version    INTEGER NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Quem entra é autenticado pelo Clerk; esta linha é o dono a que o negócio se
-- prende. Nome e e-mail são cópia do que está no Clerk, para o painel não
-- precisar ir até lá a cada página. A coluna clerk_user_id aceita NULL por
-- causa das contas criadas antes do Clerk: elas ficam órfãs até o lojista
-- entrar com o mesmo e-mail, e aí a linha é adotada (veja linkClerkUser).
CREATE TABLE IF NOT EXISTS users (
  id                TEXT PRIMARY KEY,
  clerk_user_id     TEXT,
  name              TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,
  -- Cobrança: o documento que foi ao Asaas e o cliente criado lá (cus_…),
  -- reaproveitado em toda assinatura da conta. billing_exempt = 1 nunca cobra
  -- (conta de demonstração, cortesia).
  cpf_cnpj          TEXT,
  asaas_customer_id TEXT,
  billing_exempt    INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Índice e não UNIQUE na coluna: em banco antigo a coluna chega por ALTER
-- TABLE, que no SQLite não sabe acrescentar uma restrição. Índice único ele
-- cria depois sem problema, e vários NULL continuam valendo.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk ON users(clerk_user_id);

CREATE TABLE IF NOT EXISTS businesses (
  id                        TEXT PRIMARY KEY,
  owner_id                  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug                      TEXT NOT NULL UNIQUE,
  name                      TEXT NOT NULL,
  tagline                   TEXT NOT NULL DEFAULT '',
  description               TEXT NOT NULL DEFAULT '',
  logo                      TEXT NOT NULL DEFAULT '🍽️',
  brand_color               TEXT NOT NULL DEFAULT '#c2410c',
  whatsapp                  TEXT NOT NULL DEFAULT '',
  email                     TEXT NOT NULL DEFAULT '',
  instagram                 TEXT NOT NULL DEFAULT '',
  street                    TEXT NOT NULL DEFAULT '',
  district                  TEXT NOT NULL DEFAULT '',
  city                      TEXT NOT NULL DEFAULT '',
  state                     TEXT NOT NULL DEFAULT '',
  postal_code               TEXT NOT NULL DEFAULT '',
  latitude                  REAL,
  longitude                 REAL,
  hours                     TEXT NOT NULL DEFAULT '{}',   -- JSON: { "0": [{open,close}], … }
  accept_orders_when_closed INTEGER NOT NULL DEFAULT 0,
  delivery_enabled          INTEGER NOT NULL DEFAULT 1,
  min_order                 REAL NOT NULL DEFAULT 0,
  free_above                REAL NOT NULL DEFAULT 0,
  delivery_radius_km        REAL NOT NULL DEFAULT 0,
  -- 'zones' (taxa por bairro) ou 'distance' (taxa calculada pelo CEP do cliente).
  delivery_pricing          TEXT NOT NULL DEFAULT 'zones',
  delivery_base_fee         REAL NOT NULL DEFAULT 0,   -- cobre os primeiros km
  delivery_base_km          REAL NOT NULL DEFAULT 0,
  delivery_per_km_fee       REAL NOT NULL DEFAULT 0,   -- por km depois da base
  pickup_enabled            INTEGER NOT NULL DEFAULT 1,
  pickup_eta                TEXT NOT NULL DEFAULT '20-30 min',
  published                 INTEGER NOT NULL DEFAULT 0,
  created_at                TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_businesses_owner ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_published ON businesses(published);

CREATE TABLE IF NOT EXISTS delivery_zones (
  id          TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  fee         REAL NOT NULL DEFAULT 0,
  eta         TEXT NOT NULL DEFAULT '',
  position    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_zones_business ON delivery_zones(business_id);

CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  position    INTEGER NOT NULL DEFAULT 0,
  UNIQUE (business_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_categories_business ON categories(business_id);

CREATE TABLE IF NOT EXISTS items (
  id          TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price       REAL NOT NULL DEFAULT 0,
  image       TEXT NOT NULL DEFAULT '🍽️',
  image_alt   TEXT NOT NULL DEFAULT '',
  tags        TEXT NOT NULL DEFAULT '[]',   -- JSON
  allergens   TEXT NOT NULL DEFAULT '[]',   -- JSON
  serves      TEXT NOT NULL DEFAULT '',
  calories    INTEGER,
  available   INTEGER NOT NULL DEFAULT 1,
  position    INTEGER NOT NULL DEFAULT 0,
  UNIQUE (business_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_business ON items(business_id);

CREATE TABLE IF NOT EXISTS option_groups (
  id       TEXT PRIMARY KEY,
  item_id  TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  name     TEXT NOT NULL,
  type     TEXT NOT NULL DEFAULT 'single',  -- 'single' | 'multi'
  required INTEGER NOT NULL DEFAULT 0,
  max_choices INTEGER,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_groups_item ON option_groups(item_id);

CREATE TABLE IF NOT EXISTS option_choices (
  id       TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
  name     TEXT NOT NULL,
  price    REAL NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_choices_group ON option_choices(group_id);

-- Sessão, recuperação de senha e confirmação de e-mail agora são do Clerk.
-- Em banco criado antes disso as tabelas ainda existem, guardando token de
-- sessão e de redefinição que não valem mais nada: saem daqui.
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS email_verifications;

CREATE TABLE IF NOT EXISTS rate_limits (
  -- Contador compartilhado entre instâncias (em serverless a memória não serve).
  key      TEXT PRIMARY KEY,
  count    INTEGER NOT NULL,
  reset_at INTEGER NOT NULL   -- epoch em milissegundos
);

CREATE TABLE IF NOT EXISTS images (
  -- Fotos enviadas pelo lojista, já reduzidas no navegador. Servidas em /img/<id>.
  id           TEXT PRIMARY KEY,
  business_id  TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  bytes        BLOB NOT NULL,
  size         INTEGER NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_images_business ON images(business_id);

-- Todo evento que um webhook entregou, pelo id que o remetente deu a ele.
-- Clerk (Svix) e Asaas entregam "pelo menos uma vez": guardar o id é o que
-- transforma isso em "processa uma vez". O payload guarda só ids, para
-- depurar, nunca dado pessoal.
CREATE TABLE IF NOT EXISTS webhook_events (
  id           TEXT PRIMARY KEY,               -- '<provedor>:<id do evento>'
  provider     TEXT NOT NULL,                  -- 'clerk' | 'asaas'
  type         TEXT NOT NULL,                  -- 'user.deleted', 'PAYMENT_RECEIVED'…
  ref_id       TEXT,                           -- o que o evento tocou (usuário, assinatura); NULL se não casou
  payload      TEXT NOT NULL DEFAULT '{}',
  error        TEXT,                           -- mensagem, quando o processamento falhou
  received_at  TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT                            -- NULL = recebido e ainda não concluído
);
CREATE INDEX IF NOT EXISTS idx_webhook_events_received ON webhook_events(provider, received_at);

-- Assinatura da plataforma, por conta. Uma conta pode ter várias linhas ao
-- longo do tempo (cancelou e assinou de novo); o índice parcial garante uma só
-- em aberto. paid_until é derivado das cobranças pagas (src/lib/billing.ts) e
-- só é escrito por src/server/billing/lifecycle.ts.
CREATE TABLE IF NOT EXISTS subscriptions (
  id                    TEXT PRIMARY KEY,       -- 32 hex sem hífen: vai no externalReference do Asaas
  user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asaas_customer_id     TEXT NOT NULL,
  asaas_subscription_id TEXT,                   -- sub_…; NULL só entre o INSERT e a resposta do Asaas
  status                TEXT NOT NULL DEFAULT 'pending',  -- pending | active | cancelled
  cycle                 TEXT NOT NULL,          -- YEARLY | MONTHLY
  amount_cents          INTEGER NOT NULL,
  paid_until            TEXT,                   -- YYYY-MM-DD: data da renovação; NULL até o primeiro pagamento
  cancelled_at          TEXT,
  synced_at             TEXT,                   -- última consulta ao Asaas
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_asaas ON subscriptions(asaas_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(asaas_customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_open ON subscriptions(user_id) WHERE status IN ('pending', 'active');

-- Cobranças do Asaas, espelhadas. É daqui que paid_until é recalculado, e é o
-- que torna o webhook idempotente: a mesma cobrança paga duas vezes conta uma.
CREATE TABLE IF NOT EXISTS billing_payments (
  id              TEXT PRIMARY KEY,             -- pay_… do Asaas
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  status          TEXT NOT NULL,                -- como o Asaas manda (PENDING, RECEIVED, CONFIRMED, OVERDUE, REFUNDED…) ou DELETED
  value_cents     INTEGER NOT NULL,
  due_date        TEXT NOT NULL,                -- YYYY-MM-DD
  paid_at         TEXT,                         -- paymentDate do Asaas (YYYY-MM-DD)
  invoice_url     TEXT,                         -- página da cobrança no Asaas (comprovante)
  qr_payload      TEXT,                         -- copia-e-cola; o QR é desenhado a partir dele
  qr_expires_at   TEXT,                         -- expirationDate do Asaas
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_billing_payments_subscription ON billing_payments(subscription_id);
`;

/**
 * Divide o schema em comandos, ignorando `;` dentro de texto entre aspas
 * simples e tirando os comentários `--` (um ponto e vírgula dentro de
 * comentário partiria o comando ao meio).
 */
function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inString = false;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index]!;
    if (!inString && char === '-' && sql[index + 1] === '-') {
      while (index < sql.length && sql[index] !== '\n') index += 1;
      current += '\n';
      continue;
    }
    // Aspas escapadas ('') alternam duas vezes e voltam ao mesmo estado.
    if (char === "'") inString = !inString;
    if (char === ';' && !inString) {
      statements.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  statements.push(current.trim());
  return statements.filter((statement) => statement.length > 0);
}

export const SCHEMA_STATEMENTS = splitStatements(SCHEMA_SQL);

// Um split errado derruba o `npm run check` (que carrega este módulo), não a
// primeira consulta em produção.
for (const statement of SCHEMA_STATEMENTS) {
  if (!/^(CREATE|DROP|ALTER|PRAGMA)\b/i.test(statement)) {
    throw new Error(`Comando inesperado no schema: ${statement.slice(0, 60)}…`);
  }
}
