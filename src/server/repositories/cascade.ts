import 'server-only';
import type { InStatement } from '@libsql/client';

/**
 * Apagar em cascata sem depender do banco.
 *
 * O schema declara ON DELETE CASCADE, mas o SQLite só obedece com
 * `PRAGMA foreign_keys = ON` na conexão — e no Turso cada consulta pode ir por
 * uma conexão diferente, então o PRAGMA que a migração executa não vale para o
 * DELETE que vem depois. Em desenvolvimento (arquivo) há uma conexão só e a
 * cascata funciona, o que escondia o problema: em produção, apagar uma conta
 * deixava negócio, cardápio e fotos órfãos.
 *
 * Por isso quem apaga monta a lista de DELETEs da folha para a raiz e manda
 * tudo num batch (uma transação). A ordem importa: cada tabela sai antes da que
 * ela referencia. As subconsultas sempre filtram por negócio, para um id
 * forjado nunca alcançar dado de outro lojista.
 */
export function businessCascadeStatements(businessId: string): InStatement[] {
  const items = 'SELECT id FROM items WHERE business_id = ?';
  return [
    {
      sql: `DELETE FROM option_choices WHERE group_id IN (SELECT id FROM option_groups WHERE item_id IN (${items}))`,
      args: [businessId],
    },
    { sql: `DELETE FROM option_groups WHERE item_id IN (${items})`, args: [businessId] },
    { sql: 'DELETE FROM items WHERE business_id = ?', args: [businessId] },
    { sql: 'DELETE FROM categories WHERE business_id = ?', args: [businessId] },
    { sql: 'DELETE FROM delivery_zones WHERE business_id = ?', args: [businessId] },
    { sql: 'DELETE FROM business_covers WHERE business_id = ?', args: [businessId] },
    { sql: 'DELETE FROM images WHERE business_id = ?', args: [businessId] },
    { sql: 'DELETE FROM rate_limits WHERE key = ?', args: [`upload:${businessId}`] },
    { sql: 'DELETE FROM businesses WHERE id = ?', args: [businessId] },
  ];
}

/** Tudo de uma conta: os negócios dela (já com o que pendura neles) e a linha do dono. */
export function userCascadeStatements(userId: string, businessIds: string[]): InStatement[] {
  return [
    ...businessIds.flatMap(businessCascadeStatements),
    // Negócio que apareceu entre o SELECT e o batch sai aqui; sem filhos ainda.
    { sql: 'DELETE FROM businesses WHERE owner_id = ?', args: [userId] },
    // A assinatura no Asaas já foi cancelada pelo gancho de exclusão; aqui sai o espelho.
    {
      sql: 'DELETE FROM billing_payments WHERE subscription_id IN (SELECT id FROM subscriptions WHERE user_id = ?)',
      args: [userId],
    },
    { sql: 'DELETE FROM subscriptions WHERE user_id = ?', args: [userId] },
    { sql: 'DELETE FROM users WHERE id = ?', args: [userId] },
  ];
}
