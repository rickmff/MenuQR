import 'server-only';

/**
 * Esquema do banco. Mantido como módulo (e não arquivo .sql lido em runtime)
 * para funcionar em qualquer alvo de deploy, inclusive serverless.
 */
export const SCHEMA_SQL = `-- Esquema do MenuQR. Executado automaticamente na primeira consulta.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  -- Guardamos o hash do token; o valor original só existe no cookie do usuário.
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

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
  hours                     TEXT NOT NULL DEFAULT '{}',   -- JSON: { "0": [{open,close}], … }
  accept_orders_when_closed INTEGER NOT NULL DEFAULT 0,
  delivery_enabled          INTEGER NOT NULL DEFAULT 1,
  min_order                 REAL NOT NULL DEFAULT 0,
  free_above                REAL NOT NULL DEFAULT 0,
  pickup_enabled            INTEGER NOT NULL DEFAULT 1,
  pickup_eta                TEXT NOT NULL DEFAULT '20-30 min',
  payments                  TEXT NOT NULL DEFAULT '[]',   -- JSON: ["Pix", …]
  pix_key                   TEXT NOT NULL DEFAULT '',
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
`;

/**
 * Divide o schema em comandos. Os comentários são removidos antes do split
 * porque um ponto e vírgula dentro de comentário partiria o comando ao meio.
 * (O schema não usa `--` dentro de literais de texto.)
 */
export const SCHEMA_STATEMENTS = SCHEMA_SQL.split('\n')
  .map((line) => line.replace(/--.*$/, ''))
  .join('\n')
  .split(';')
  .map((statement) => statement.trim())
  .filter((statement) => statement.length > 0);
