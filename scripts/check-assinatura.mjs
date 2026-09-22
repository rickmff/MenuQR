/**
 * Regras da assinatura, conferidas sem servidor: até quando a conta está
 * paga, que estado ela tem em cada data, e a validação de CPF/CNPJ.
 *
 * Uso: npm run check:assinatura
 */
import assert from 'node:assert/strict';

const billing = await import('../src/lib/billing.ts');
const docs = await import('../src/lib/cpf-cnpj.ts');

const { BILLING_PLAN, addCycle, addDays, computePaidUntil, summarizeBilling, todaySP } = billing;

/* ------------------------------------------------------------------- datas */

assert.match(todaySP(), /^\d{4}-\d{2}-\d{2}$/, 'todaySP devolve YYYY-MM-DD');
// 22h em UTC de 21/09 já é 19h de 21/09 em São Paulo; 02h UTC de 22/09 ainda é dia 21 lá.
assert.equal(todaySP(new Date('2026-09-22T02:30:00Z')), '2026-09-21', 'todaySP usa o fuso de São Paulo');
assert.equal(addDays('2026-12-30', 7), '2027-01-06');
assert.equal(addCycle('2026-09-22', 'YEARLY'), '2027-09-22');
assert.equal(addCycle('2028-02-29', 'YEARLY'), '2029-02-28', 'ano seguinte não bissexto prende o dia');
assert.equal(addCycle('2026-01-31', 'MONTHLY'), '2026-02-28');
assert.equal(addCycle('2026-12-15', 'MONTHLY'), '2027-01-15');

/* -------------------------------------------------------------- paid_until */

const paid = (dueDate, status = 'RECEIVED') => ({ dueDate, status });

assert.equal(computePaidUntil([], 'YEARLY'), null, 'sem cobrança paga não há prazo');
assert.equal(computePaidUntil([paid('2026-09-22', 'PENDING')], 'YEARLY'), null, 'pendente não conta');
assert.equal(computePaidUntil([paid('2026-09-22')], 'YEARLY'), '2027-09-22');
assert.equal(
  computePaidUntil([paid('2026-09-22'), paid('2026-09-22')], 'YEARLY'),
  '2027-09-22',
  'a mesma cobrança repetida conta uma vez',
);
assert.equal(
  computePaidUntil([paid('2027-09-22'), paid('2026-09-22')], 'YEARLY'),
  '2028-09-22',
  'fora de ordem dá no mesmo',
);
assert.equal(
  computePaidUntil([paid('2026-09-22'), paid('2027-09-22', 'REFUNDED')], 'YEARLY'),
  '2027-09-22',
  'estorno tira a cobrança do conjunto',
);
assert.equal(
  computePaidUntil([paid('2026-09-22'), paid('2027-09-22', 'CONFIRMED')], 'YEARLY'),
  '2028-09-22',
  'renovação paga adiantada estende a partir do vencimento',
);

/* ------------------------------------------------------------------ estados */

const row = (overrides) => ({
  id: 'sub1',
  userId: 'u1',
  status: 'active',
  paidUntil: '2027-09-22',
  asaasCustomerId: 'cus_1',
  asaasSubscriptionId: 'sub_1',
  cycle: 'YEARLY',
  amountCents: BILLING_PLAN.amountCents,
  cancelledAt: null,
  syncedAt: null,
  createdAt: '2026-09-22T00:00:00Z',
  updatedAt: '2026-09-22T00:00:00Z',
  ...overrides,
});

const states = (rows, today) => {
  const access = summarizeBilling(rows, today);
  return `${access.state}:${access.allowed ? 'ok' : 'nao'}`;
};

assert.equal(states([], '2026-09-22'), 'none:nao');
assert.equal(states([row({ status: 'pending', paidUntil: null })], '2026-09-22'), 'pending:nao');
assert.equal(states([row()], '2026-09-22'), 'active:ok');
assert.equal(states([row()], '2027-09-21'), 'active:ok', 'véspera ainda é ativa');
assert.equal(states([row()], '2027-09-22'), 'past_due:ok', 'no vencimento entra a carência');
assert.equal(states([row()], '2027-09-28'), 'past_due:ok', 'último dia da carência');
assert.equal(states([row()], '2027-09-29'), 'expired:nao', 'carência de 7 dias acabou');
assert.equal(states([row({ status: 'cancelled', cancelledAt: 'x' })], '2027-01-01'), 'cancelled:ok', 'cancelada usa até o fim');
assert.equal(states([row({ status: 'cancelled', cancelledAt: 'x' })], '2027-09-22'), 'cancelled:nao', 'cancelada não tem carência');
assert.equal(states([row({ status: 'cancelled', paidUntil: null })], '2026-09-22'), 'cancelled:nao');
assert.equal(
  states([row({ id: 'nova', status: 'pending', paidUntil: null }), row({ status: 'cancelled' })], '2027-01-01'),
  'cancelled:ok',
  'cancelou e assinou de novo: vale a que dá acesso',
);
assert.equal(
  states([row({ id: 'nova', status: 'pending', paidUntil: null }), row({ status: 'cancelled' })], '2027-10-01'),
  'pending:nao',
  'sem acesso, vale a que está em aberto',
);
assert.equal(summarizeBilling([], '2026-09-22', true).allowed, true, 'isenta sempre passa');
assert.equal(summarizeBilling([row()], '2027-08-23').renewalDue, true, '30 dias antes já avisa a renovação');
assert.equal(summarizeBilling([row()], '2027-08-22').renewalDue, false, '31 dias antes ainda não');
assert.equal(summarizeBilling([row()], '2027-09-25').renewalDue, true, 'na carência a renovação é urgente');
assert.equal(summarizeBilling([row()], '2027-09-25').graceUntil, '2027-09-29');
assert.equal(summarizeBilling([row({ status: 'cancelled' })], '2027-08-22').renewalDue, false, 'cancelada não pede renovação');

/* ---------------------------------------------------------------- CPF/CNPJ */

assert.equal(docs.isValidCpf('529.982.247-25'), true);
assert.equal(docs.isValidCpf('529.982.247-26'), false, 'dígito verificador errado');
assert.equal(docs.isValidCpf('111.111.111-11'), false, 'repetido');
assert.equal(docs.isValidCnpj('11.222.333/0001-81'), true);
assert.equal(docs.isValidCnpj('11.222.333/0001-82'), false);
assert.equal(docs.isValidCnpj('12.ABC.345/01DE-35'), true, 'CNPJ alfanumérico (exemplo da Receita)');
assert.equal(docs.isValidCnpj('12.abc.345/01de-35'), true, 'minúsculas valem');
assert.equal(docs.isValidCpfCnpj('52998224725'), true);
assert.equal(docs.isValidCpfCnpj('11222333000181'), true);
assert.equal(docs.isValidCpfCnpj('123'), false);
assert.equal(docs.isValidCpfCnpj(''), false);
assert.equal(docs.formatCpfCnpj('52998224725'), '529.982.247-25');
assert.equal(docs.formatCpfCnpj('11222333000181'), '11.222.333/0001-81');
assert.equal(docs.normalizeCpfCnpj('12.abc.345/01de-35'), '12ABC34501DE35');

console.log('✓ Regras da assinatura: datas, paid_until, estados e CPF/CNPJ conferidos.');

/* ------------------------------------------------ webhook contra um banco */

// A parte de banco roda num arquivo descartável, pelo mesmo código do webhook.
{
  const { randomUUID } = await import('node:crypto');
  const { readFileSync, rmSync } = await import('node:fs');

  const DB_FILE = 'data/.check-assinatura.db';
  const cleanup = () => {
    for (const suffix of ['', '-shm', '-wal']) rmSync(`${DB_FILE}${suffix}`, { force: true });
  };
  cleanup();
  process.env.DATABASE_URL = `file:./${DB_FILE}`;
  delete process.env.DATABASE_AUTH_TOKEN;
  process.env.BILLING_MODE = 'asaas';

  const { db } = await import('../src/server/db/client.ts');
  const { ensureSchema } = await import('../src/server/db/migrate.ts');
  const subs = await import('../src/server/repositories/subscriptions.ts');
  const { handleAsaasEvent } = await import('../src/server/billing/webhook.ts');
  const { claimWebhookEvent, markWebhookProcessed } = await import('../src/server/repositories/webhook-events.ts');

  const fixture = (name) => JSON.parse(readFileSync(`scripts/fixtures/asaas/${name}.json`, 'utf8'));

  try {
    await ensureSchema();
    const userId = randomUUID();
    await db.execute({ sql: 'INSERT INTO users (id, name, email) VALUES (?, ?, ?)', args: [userId, 'Lojista', `${userId}@check.menuqr`] });

    const subscriptionId = randomUUID().replace(/-/g, '');
    await subs.insertSubscription({ id: subscriptionId, userId, asaasCustomerId: 'cus_fixture_000001', cycle: 'YEARLY', amountCents: 58800 });
    await subs.attachAsaasSubscription(subscriptionId, 'sub_fixture_000001');

    const state = async () => {
      const [record] = await subs.listSubscriptionsByUser(userId);
      return `${record.status}:${record.paidUntil ?? '-'}`;
    };

    // Cobrança criada: pendente, sem prazo.
    let result = await handleAsaasEvent(fixture('payment-created'));
    assert.equal(result.outcome, 'processed');
    assert.equal(await state(), 'pending:-');

    // Pix caiu: ativa por um ano a partir do vencimento.
    result = await handleAsaasEvent(fixture('payment-received'));
    assert.equal(result.outcome, 'processed');
    assert.equal(await state(), 'active:2027-09-22');

    // O mesmo evento de novo (entrega "pelo menos uma vez"): nada muda.
    await handleAsaasEvent(fixture('payment-received'));
    assert.equal(await state(), 'active:2027-09-22', 'evento repetido não estende');

    // Idempotência pela reivindicação do id do evento, como a rota faz.
    const claim = await claimWebhookEvent({ provider: 'asaas', eventId: 'evt_fixture_received_0001', type: 'PAYMENT_RECEIVED' });
    assert.equal(claim.status, 'claimed');
    await markWebhookProcessed(claim.id, subscriptionId);
    const again = await claimWebhookEvent({ provider: 'asaas', eventId: 'evt_fixture_received_0001', type: 'PAYMENT_RECEIVED' });
    assert.equal(again.status, 'duplicate', 'o segundo envio do mesmo evento é ignorado');

    // Renovação que chega sem o id da assinatura: casa pelo cliente e estende mais um ano.
    result = await handleAsaasEvent(fixture('payment-by-customer'));
    assert.equal(result.outcome, 'processed', 'casou pelo cliente');
    assert.equal(await state(), 'active:2028-09-22');

    // Estorno da primeira: sobra só a renovação.
    result = await handleAsaasEvent(fixture('payment-refunded'));
    assert.equal(result.outcome, 'processed');
    assert.equal(await state(), 'active:2028-09-22', 'estorno recua o conjunto, não a data mais alta');

    // Cliente desconhecido: fica registrado como não casado, sem erro.
    const unknown = fixture('payment-by-customer');
    unknown.id = 'evt_fixture_unknown_0001';
    unknown.payment.id = 'pay_fixture_999999';
    unknown.payment.customer = 'cus_ninguem';
    result = await handleAsaasEvent(unknown);
    assert.equal(result.outcome, 'unmatched');

    // Evento que não é de cobrança: ignorado.
    result = await handleAsaasEvent({ id: 'evt_x', event: 'TRANSFER_CREATED' });
    assert.equal(result.outcome, 'ignored');

    console.log('✓ Webhook do Asaas: criada → paga → repetida → renovação pelo cliente → estorno, sem surpresas.');
  } finally {
    cleanup();
  }
}
