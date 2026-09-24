/**
 * Aplica o schema no banco de DATABASE_URL e grava a versão (PRAGMA user_version).
 *
 * Em produção o `ensureSchema()` faz o mesmo na primeira consulta de cada
 * instância; este comando existe para o passo explícito antes de um deploy que
 * sobe a versão do schema — e para olhar o banco quando algo parece errado.
 *
 * Uso:
 *   npm run db:migrate                     # aplica se a versão gravada for outra
 *   npm run db:migrate -- --force          # reaplica mesmo com a versão igual
 *   npm run db:migrate -- --auditar        # conta linhas órfãs (sem apagar)
 *   npm run db:migrate -- --limpar-orfaos  # apaga as órfãs; faça backup antes
 */
const args = new Set(process.argv.slice(2));

const { db } = await import('../src/server/db/client.ts');
const { migrateNow, readSchemaVersion } = await import('../src/server/db/migrate.ts');
const { SCHEMA_VERSION } = await import('../src/server/db/schema.ts');

/**
 * Linhas cujo pai não existe mais — o que a cascata que não roda no Turso
 * deixou para trás. Da folha para a raiz, para a limpeza poder seguir a
 * mesma lista.
 */
const ORPHANS = [
  ['option_choices', 'group_id NOT IN (SELECT id FROM option_groups)'],
  ['option_groups', 'item_id NOT IN (SELECT id FROM items)'],
  ['items', 'business_id NOT IN (SELECT id FROM businesses) OR category_id NOT IN (SELECT id FROM categories)'],
  ['categories', 'business_id NOT IN (SELECT id FROM businesses)'],
  ['delivery_zones', 'business_id NOT IN (SELECT id FROM businesses)'],
  ['images', 'business_id NOT IN (SELECT id FROM businesses)'],
  ['businesses', 'owner_id NOT IN (SELECT id FROM users)'],
];

async function countOrphans() {
  const counts = [];
  for (const [table, where] of ORPHANS) {
    const result = await db.execute(`SELECT COUNT(*) AS total FROM ${table} WHERE ${where}`);
    counts.push([table, Number(result.rows[0]?.total ?? 0)]);
  }
  return counts;
}

function printCounts(counts) {
  for (const [table, total] of counts) console.log(`  ${table.padEnd(16)} ${total}`);
}

if (args.has('--auditar')) {
  console.log(`Versão do schema: ${await readSchemaVersion()} (código: ${SCHEMA_VERSION})`);
  console.log('Linhas órfãs:');
  const counts = await countOrphans();
  printCounts(counts);
  const total = counts.reduce((sum, [, count]) => sum + count, 0);
  console.log(total === 0 ? 'Nenhuma órfã.' : `\n${total} órfã(s). Para apagar: npm run db:migrate -- --limpar-orfaos`);
} else if (args.has('--limpar-orfaos')) {
  // Apagar um negócio órfão deixa as categorias dele órfãs: repete até zerar.
  for (let pass = 1; pass <= 6; pass += 1) {
    let removed = 0;
    for (const [table, where] of ORPHANS) {
      const result = await db.execute(`DELETE FROM ${table} WHERE ${where}`);
      removed += result.rowsAffected;
    }
    console.log(`Passada ${pass}: ${removed} linha(s) apagada(s).`);
    if (removed === 0) break;
  }
  console.log('Restou:');
  printCounts(await countOrphans());
} else {
  const result = await migrateNow({ force: args.has('--force') });
  console.log(
    result.applied
      ? `Schema aplicado: versão ${result.from} → ${result.to}.`
      : result.from > SCHEMA_VERSION
        ? `Banco na versão ${result.from}, à frente do código (${SCHEMA_VERSION}); nada aplicado (use --force para reaplicar).`
        : `Banco já na versão ${result.to}; nada a fazer (use --force para reaplicar).`,
  );
}
