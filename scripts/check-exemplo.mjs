/**
 * Garante que o cardápio de exemplo é EXATAMENTE o mesmo nos dois caminhos:
 *
 *   navegador (modo demonstração)  →  src/lib/demo/sample-menu.json
 *   servidor  (banco de dados)     →  seed → tabelas → repositórios
 *
 * O script popula um banco descartável com o seed de verdade, lê de volta pelo
 * mesmo código que o cardápio público usa e compara campo a campo. Qualquer
 * divergência — um complemento que se perdeu, uma cor diferente, um item fora
 * de ordem — derruba o comando.
 *
 * Uso: npm run check:exemplo
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';

const DB_FILE = 'data/.check-exemplo.db';

function cleanup() {
  for (const suffix of ['', '-shm', '-wal']) {
    rmSync(`${DB_FILE}${suffix}`, { force: true });
  }
}

cleanup();
execFileSync(process.execPath, ['scripts/seed.mjs'], {
  env: { ...process.env, DATABASE_URL: `file:./${DB_FILE}`, DATABASE_AUTH_TOKEN: '' },
  stdio: 'pipe',
});

process.env.DATABASE_URL = `file:./${DB_FILE}`;
delete process.env.DATABASE_AUTH_TOKEN;

const { getBusinessBySlug } = await import('../src/server/repositories/businesses.ts');
const { getMenu } = await import('../src/server/repositories/menu.ts');

const expected = JSON.parse(readFileSync('src/lib/demo/sample-menu.json', 'utf8'));
const business = await getBusinessBySlug(expected.business.slug);
if (!business) {
  cleanup();
  console.error(`✗ o seed não criou /r/${expected.business.slug}.`);
  process.exit(1);
}
const menu = await getMenu(business.id);
cleanup();

/* ------------------------------------------------------------- comparação */

/** Campos que só existem no banco (data de criação, dono) ficam de fora. */
const IGNORED = new Set(['createdAt', 'updatedAt', 'ownerId']);

const differences = [];

function compare(path, expectedValue, actualValue) {
  if (Array.isArray(expectedValue) || Array.isArray(actualValue)) {
    if (!Array.isArray(expectedValue) || !Array.isArray(actualValue)) {
      differences.push(`${path}: esperado lista, veio ${typeof actualValue}`);
      return;
    }
    if (expectedValue.length !== actualValue.length) {
      differences.push(
        `${path}: ${expectedValue.length} no exemplo, ${actualValue.length} no banco`,
      );
    }
    const size = Math.max(expectedValue.length, actualValue.length);
    for (let index = 0; index < size; index += 1) {
      compare(`${path}[${index}]`, expectedValue[index], actualValue[index]);
    }
    return;
  }

  const isObject = (value) => value !== null && typeof value === 'object';
  if (isObject(expectedValue) || isObject(actualValue)) {
    if (!isObject(expectedValue) || !isObject(actualValue)) {
      differences.push(`${path}: ${JSON.stringify(expectedValue)} ≠ ${JSON.stringify(actualValue)}`);
      return;
    }
    const keys = new Set([...Object.keys(expectedValue), ...Object.keys(actualValue)]);
    for (const key of keys) {
      if (IGNORED.has(key)) continue;
      compare(path ? `${path}.${key}` : key, expectedValue[key], actualValue[key]);
    }
    return;
  }

  // O banco guarda vazio como '' ou null conforme a coluna; para o cardápio
  // renderizado os dois significam "não informado".
  const empty = (value) => value === '' || value === null || value === undefined;
  if (empty(expectedValue) && empty(actualValue)) return;

  if (expectedValue !== actualValue) {
    differences.push(`${path}: ${JSON.stringify(expectedValue)} ≠ ${JSON.stringify(actualValue)}`);
  }
}

compare('negócio', expected.business, business);
compare('cardápio', expected.menu, menu);

if (differences.length > 0) {
  console.error('✗ O cardápio de exemplo diverge entre o navegador e o banco:\n');
  for (const difference of differences) console.error(`  · ${difference}`);
  console.error(
    '\nO exemplo tem uma fonte só: src/lib/demo/sample-menu.json.\n' +
      'Ajuste o JSON (ou o seed/repositório que o lê) até este comando passar.',
  );
  process.exit(1);
}

const items = expected.menu.reduce((total, category) => total + category.items.length, 0);
const groups = expected.menu.reduce(
  (total, category) =>
    total + category.items.reduce((sum, item) => sum + (item.options?.length ?? 0), 0),
  0,
);
console.log(
  `✓ Cardápio de exemplo idêntico nos dois caminhos: ` +
    `${expected.menu.length} categorias, ${items} itens, ${groups} grupos de complementos.`,
);
