/**
 * Teste de ponta a ponta do painel do Menu Online — o caminho do lojista, do
 * zero ao cardápio publicado, com as ramificações de cada tela.
 *
 * Roteiro (um passo por tela/ramificação; falha em um não interrompe o resto):
 *   1. criar conta (Clerk, e-mail +clerk_test, código 424242)
 *   2. cadastro do restaurante: erros de validação, endereço já em uso, sucesso
 *   3. guia de configuração (SetupWidget) depois do cadastro
 *   4. Identidade: textos, logo, cor, capa; "Salvar e continuar"
 *   5. Contato: WhatsApp inválido → válido, Instagram
 *   6. Horários: dia fechado, horário incompleto → erro, horários novos
 *   7. Endereço e entrega: nenhum modo → erro; endereço + mapa + bairros + retirada; cobrança por distância
 *   8. Cardápio: erros, categoria, item com foto + complementos + detalhes, item sem foto,
 *      editar inline, disponível/esgotado, renomear, mover, excluir item, excluir categoria
 *   9. Compartilhar: loja 404 antes, publicar, 200 depois, copiar link, despublicar, publicar bloqueado
 *  10. Prévia e loja pública: complementos e modos de entrega chegam ao cliente
 *  11. Sair e entrar de novo (com `proximo`)
 *  12. Celular (390px): telas principais, sem estouro horizontal
 *  13. Conta: idioma inglês e volta; excluir a conta (limpa banco e Clerk)
 *
 * Uso:  node e2e.mjs [--only=cadastro,comecar,guia,identidade,contato,horarios,entrega,cardapio,publicar,loja,login,celular,conta]
 *                    [--keep] (não exclui a conta no fim) [--sweep] (apaga TODOS os usuários e2e-* do Clerk no fim)
 *                    [--headed] [--mobile]
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { devices } from 'playwright';
import {
  BASE, PASSWORD, Report, collapseGuide, coveredBy, deleteClerkUserByEmail, listClerkTestUsers, mockGeocode, openBrowser,
  signOut, signUp, sleep, testEmail, uploadImage, visibleFeedback, waitForImages, waitForText, waitForToast,
} from './lib/session.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
if (args.headed) process.env.E2E_HEADED = '1';
if (args.mobile) process.env.E2E_MOBILE = '1';
const only = typeof args.only === 'string' ? new Set(args.only.split(',')) : null;
const wants = (key) => !only || only.has(key);

const EXEMPLO = process.env.E2E_FOTOS ?? [path.resolve(import.meta.dirname, '..', 'public', 'exemplo'), path.resolve(import.meta.dirname, '..', 'app', 'public', 'exemplo')].find((dir) => existsSync(dir));
const foto = (name) => path.join(EXEMPLO, name);

const report = new Report(process.env.E2E_MOBILE ? 'e2e-mobile' : 'e2e');
const account = { email: testEmail('lojista'), password: PASSWORD };
const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(6, 12);
const restaurant = {
  name: 'Cantina E2E da Nona',
  // Sufixo por execução: o banco local guarda o restaurante de uma rodada interrompida.
  slug: `cantina-e2e-${stamp}`,
  tagline: 'Massa fresca todo dia',
  whatsappDigits: '11987654321',
};

const { browser, context, page, consoleErrors } = await openBrowser();
await mockGeocode(page);
const pathOf = () => new URL(page.url()).pathname;
const feedback = async () => (await visibleFeedback(page)).join(' | ');

/* ------------------------------------------------------------------ helpers */

/** Formulário de item "Novo item" no pé da categoria: o único sem `itemId`. */
const standingItemForm = (card) => card.locator('form:not(:has(input[name="itemId"]))').filter({ has: page.locator('input[name="price"]') }).first();
const editItemForm = (card) => card.locator('form:has(input[name="itemId"])').first();
const categoryCard = (name) => page.locator('section[aria-labelledby$="-title"]').filter({ has: page.getByRole('heading', { level: 2, name }) }).first();

async function fillGroup(form, index, { name, type = 'single', required = false, max = '', choices }) {
  // Tudo dentro do fieldset do grupo: "Máximo" só existe nos grupos que não são de escolha única,
  // então contar por índice no formulário inteiro erra o campo.
  const group = form.locator('fieldset').nth(index);
  await group.getByLabel('Nome do grupo').fill(name);
  await group.getByLabel('Tipo', { exact: true }).selectOption(type);
  // "Escolher uma" nasce obrigatório e "Retirar ingredientes" não tem a caixa (F55, F27).
  const requiredBox = group.getByLabel('Obrigatório', { exact: true });
  if (await requiredBox.isVisible().catch(() => false)) await requiredBox.setChecked(required);
  else if (required) report.note(`grupo "${name}" (${type}) não oferece "Obrigatório"`);
  if (type !== 'single' && max) await group.getByLabel('Máximo', { exact: true }).fill(String(max));
  for (const [i, choice] of choices.entries()) {
    if (i > 0) await group.getByRole('button', { name: 'Adicionar opção' }).click();
    const label = type === 'remove' ? 'Ingrediente' : 'Opção';
    await group.getByLabel(label, { exact: true }).nth(i).fill(choice.name);
    if (type !== 'remove' && choice.price) await group.getByLabel('Acréscimo (R$)').nth(i).fill(choice.price);
  }
}

/** Clica e espera a resposta da Server Action (POST com `Next-Action`), sem se confundir com o retorno antigo na tela. */
async function clickAction(locator) {
  const done = page.waitForResponse((r) => r.request().method() === 'POST' && Boolean(r.request().headers()['next-action']), { timeout: 30000 });
  await locator.click();
  await done;
  await sleep(400);
}

/** Envia a aba de "Dados do negócio" e relata o botão e o retorno que o lojista leu. */
async function saveSection(expect) {
  const submit = page.locator('form button[type="submit"]').last();
  const label = (await submit.innerText()).trim();
  const stale = (await visibleFeedback(page)).find((t) => /Não foi salvo|Ative entrega|Informe|Preencha/.test(t));
  if (stale) report.finding('baixa', `O erro do envio anterior continua na tela enquanto o lojista corrige o formulário: "${stale}"`);
  const before = pathOf();
  await clickAction(submit);
  // "Salvar e continuar" troca de aba assim que o servidor confirma: o texto de
  // sucesso pode nem chegar a aparecer. Navegar também prova que salvou.
  await page.waitForFunction((from) => location.pathname !== from || /Alterações salvas|Não foi salvo/.test(document.body.innerText), before, { timeout: 10000 }).catch(() => {});
  await sleep(300);
  const texts = (await visibleFeedback(page)).filter((t) => !/^Encontramos|^Entregando|^Nenhum ponto|^Dados do negócio$/.test(t));
  const navigated = pathOf() !== before;
  report.note(`botão dizia "${label}" → retorno: ${texts.join(' | ') || '(nada)'}${navigated ? ` → foi para ${pathOf()}` : ''}`);
  const ok = navigated || texts.some((t) => /Alterações salvas/.test(t));
  if (ok && navigated && !texts.some((t) => /Alterações salvas/.test(t))) {
    report.finding('baixa', `"Salvar e continuar" troca de aba na hora, sem o lojista ver a confirmação "Alterações salvas" (a aba seguinte abre sem nenhum sinal de que a anterior foi gravada)`);
  }
  if (expect === 'ok' && !ok) throw new Error(`esperava "Alterações salvas", veio: ${texts.join(' | ')}`);
  if (expect === 'error' && ok) throw new Error('esperava erro de validação, mas salvou');
  return label;
}

/* ===================================================================== 1 */
if (wants('cadastro')) await report.step('1. Criar conta em /criar-conta', async () => {
  await signUp(page, report, account);
  if (pathOf() !== '/painel/comecar') report.finding('media', `Conta nova caiu em ${pathOf()}, não em /painel/comecar`);
  await report.shot(page, 'pos-cadastro');
});

/* ===================================================================== 2 */
if (wants('comecar')) await report.step('2a. Cadastro do restaurante: enviar vazio', async () => {
  await page.goto(`${BASE}/painel/comecar`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#name');
  await report.shot(page, 'comecar-vazio');
  await page.getByRole('button', { name: 'Criar meu cardápio' }).click();
  await waitForText(page, /Informe|precisa de pelo menos/);
  report.note(`erros: ${await feedback()}`);
  await report.shot(page, 'comecar-erros');
  const errorCount = (await visibleFeedback(page)).length;
  if (errorCount < 2) report.finding('media', `Só ${errorCount} erro visível ao enviar o cadastro vazio`);
});

if (wants('comecar')) await report.step('2b. Cadastro: endereço já em uso (sabor-e-brasa)', async () => {
  await page.fill('#name', 'Sabor e Brasa');
  const derived = await page.inputValue('#slug');
  report.note(`slug derivado do nome: "${derived}"`);
  await page.fill('#whatsapp', restaurant.whatsappDigits);
  await page.getByRole('button', { name: 'Criar meu cardápio' }).click();
  await page.waitForFunction(() => document.body.innerText.includes('já está em uso'));
  report.note(`erro: ${await feedback()}`);
  await report.shot(page, 'comecar-slug-em-uso');
});

if (wants('comecar')) await report.step('2c. Cadastro: nome, endereço, WhatsApp, cidade → criar', async () => {
  await page.fill('#name', restaurant.name);
  await page.fill('#slug', restaurant.slug);
  await page.fill('#city', 'São Paulo');
  await report.shot(page, 'comecar-preenchido');
  await page.getByRole('button', { name: 'Criar meu cardápio' }).click();
  await page.waitForURL((url) => url.pathname !== '/painel/comecar', { timeout: 30000 });
  report.note(`depois de criar caiu em ${pathOf()}`);
  await page.waitForLoadState('networkidle');
  await report.shot(page, 'pos-cadastro-restaurante', { fullPage: true });
  if (pathOf() !== '/painel/cardapio') report.finding('info', `Depois do cadastro o painel abre em ${pathOf()}`);
});

/* ===================================================================== 3 */
if (wants('guia')) await report.step('3. Guia de configuração logo após o cadastro', async () => {
  const region = page.getByRole('region', { name: 'Configure seu restaurante' });
  const pill = page.getByRole('button', { name: /Configurar restaurante/ });
  if (await pill.isVisible().catch(() => false)) { await pill.click(); report.note('guia estava recolhido (pílula)'); }
  await region.waitFor();
  const text = (await region.innerText()).replace(/\n+/g, ' | ');
  report.note(`guia: ${text}`);
  await report.shot(page, 'guia-inicial');
  const items = await region.locator('li').allInnerTexts();
  const done = items.filter((t) => /concluído/.test(t)).length;
  report.note(`${done} de ${items.length} passos já concluídos só com o cadastro`);
  const continueLink = region.getByRole('link', { name: 'Continuar configuração' });
  if (await continueLink.count()) {
    const from = pathOf();
    report.note(`"Continuar configuração" aponta para ${await continueLink.getAttribute('href')}`);
    await continueLink.click();
    await page.waitForURL((url) => url.pathname !== from, { timeout: 10000 }).catch(() => {});
    report.note(`"Continuar configuração" levou a ${pathOf()}`);
  } else {
    report.note(`sem "Continuar configuração": o próximo passo é a própria tela (${pathOf()}); rodapé do guia: "${(await region.locator('div').last().innerText()).trim()}"`);
  }
  const create = page.getByRole('button', { name: 'Criar categoria' });
  const cover = await coveredBy(create);
  report.note(`guia cobre "Criar categoria" a 1280px: ${cover ?? 'não'}`);
  if (cover) report.finding('alta', `O guia ainda cobre "Criar categoria" a 1280px (${cover})`);
});

/* ===================================================================== 4 */
if (wants('identidade')) await report.step('4. Identidade: textos, logo, cor e capa', async () => {
  await page.goto(`${BASE}/painel/negocio`, { waitUntil: 'networkidle' });
  await report.shot(page, 'identidade-vazia', { fullPage: true });
  await page.fill('#tagline', restaurant.tagline);
  await page.fill('#description', 'Massa fresca feita todo dia, receita da nona. Ambiente familiar e entrega no bairro.');
  const logoUrl = await uploadImage(page, page.getByRole('group', { name: 'Logo do restaurante' }), foto('logo-b672d3.jpg'), 'logo');
  report.note(`logo enviada: ${logoUrl}`);
  report.note(`aviso após a logo: ${await feedback()}`);
  const coverUrl = await uploadImage(page, page.getByRole('group', { name: 'Capa do cardápio' }), foto('capa-d776e7.jpg'), 'cover');
  report.note(`capa enviada: ${coverUrl}`);
  await page.fill('#brandColor', '#0b8639').catch(async () => {
    await page.evaluate(() => { const el = document.querySelector('#brandColor'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(el, '#0b8639'); el.dispatchEvent(new Event('input', { bubbles: true })); });
  });
  await report.shot(page, 'identidade-preenchida', { fullPage: true });
  // Com foto enviada e texto digitado, tocar numa aba pergunta antes de descartar (F08).
  await page.getByRole('navigation', { name: 'Seções do negócio' }).getByRole('link', { name: /Contato/ }).click();
  const leave = page.getByRole('dialog');
  const asked = await leave.waitFor({ timeout: 3000 }).then(() => true).catch(() => false);
  report.note(`tocar em "Contato" com alterações pendentes pergunta antes: ${asked}${asked ? ` ("${(await leave.innerText()).replace(/\n+/g, ' | ')}")` : ''}`);
  if (!asked) report.finding('alta', 'Trocar de aba com foto enviada e não salva não pergunta antes de descartar');
  if (asked) {
    await leave.getByRole('button', { name: 'Continuar editando' }).click();
    await sleep(300);
    report.note(`depois de "Continuar editando" continua em ${pathOf()} com a descrição curta "${await page.inputValue('#tagline')}"`);
  }
  // O voltar do navegador (o gesto do celular) também pergunta.
  const before = pathOf();
  await page.goBack({ waitUntil: 'commit' }).catch(() => {});
  const askedBack = await page.getByRole('dialog').waitFor({ timeout: 3000 }).then(() => true).catch(() => false);
  report.note(`voltar do navegador com alterações pendentes pergunta antes: ${askedBack}; URL ${pathOf()}`);
  if (!askedBack) report.finding('media', 'O voltar do navegador descarta a Identidade editada sem perguntar');
  if (askedBack) {
    await page.getByRole('dialog').getByRole('button', { name: 'Continuar editando' }).click();
    await sleep(400);
    report.note(`depois de "Continuar editando": ${pathOf()}, descrição curta "${await page.inputValue('#tagline').catch(() => '?')}"`);
    if (pathOf() !== before) report.finding('alta', `Depois de "Continuar editando" no voltar, a tela mudou para ${pathOf()}`);
  }
  await saveSection('ok');
  await sleep(1500);
  report.note(`depois de salvar a identidade a URL é ${pathOf()}`);
  await report.shot(page, 'identidade-salva');
});

/* ===================================================================== 5 */
if (wants('contato')) await report.step('5. Contato: WhatsApp inválido → válido, Instagram', async () => {
  await page.goto(`${BASE}/painel/negocio/contato`, { waitUntil: 'networkidle' });
  report.note(`WhatsApp já vem preenchido do cadastro: "${await page.inputValue('#whatsapp')}"`);
  await page.fill('#whatsapp', '123');
  await saveSection('error');
  await report.shot(page, 'contato-whatsapp-invalido');
  await page.fill('#whatsapp', restaurant.whatsappDigits);
  await page.fill('#instagram', '@cantinae2e');
  await saveSection('ok');
  await sleep(1200);
  report.note(`depois de salvar o contato a URL é ${pathOf()}`);
  await report.shot(page, 'contato-salvo');
});

/* ===================================================================== 6 */
if (wants('horarios')) await report.step('6. Horários: fechar domingo, horário incompleto → erro, salvar', async () => {
  await page.goto(`${BASE}/painel/negocio/horarios`, { waitUntil: 'networkidle' });
  const opens = await page.$$eval('input[name$="-open"]', (els) => els.map((e) => `${e.name}=${e.value}`));
  report.note(`horários que o formulário abre (nada gravado no cadastro): ${opens.join(', ')}`);
  report.note(`sugestão visível: ${await page.getByText('Sugerimos das 18h às 23h').isVisible().catch(() => false)}`);
  await report.shot(page, 'horarios-padrao', { fullPage: true });
  await page.getByRole('switch', { name: 'Domingo: abre neste dia' }).click();
  await page.fill('input[name="hours-1-0-open"]', '');
  await saveSection('error');
  report.note(`campo vazio marcado: aria-invalid=${await page.getAttribute('input[name="hours-1-0-open"]', 'aria-invalid')}`);
  await report.shot(page, 'horarios-erro');
  await page.fill('input[name="hours-1-0-open"]', '11:30');
  await page.fill('input[name="hours-1-0-close"]', '15:00');
  await page.fill('input[name="hours-5-0-close"]', '23:59');
  // Almoço e jantar no sábado: segunda faixa (F44).
  await page.getByRole('button', { name: 'Sábado: adicionar horário' }).click();
  await page.fill('input[name="hours-6-1-open"]', '11:30').catch(async () => {
    report.note('segunda faixa de sábado não nasceu com o nome hours-6-1-open');
  });
  await page.fill('input[name="hours-6-0-open"]', '18:00');
  await page.fill('input[name="hours-6-1-close"]', '14:30').catch(() => {});
  await report.shot(page, 'horarios-duas-faixas', { fullPage: true });
  await saveSection('ok');
  await sleep(1200);
  report.note(`depois de salvar horários a URL é ${pathOf()}`);
});

/* ===================================================================== 7 */
if (wants('entrega')) await report.step('7a. Entrega: salvar sem entrega nem retirada → erro', async () => {
  await page.goto(`${BASE}/painel/negocio/entrega`, { waitUntil: 'networkidle' });
  await report.shot(page, 'entrega-vazia', { fullPage: true });
  const warning = await page.locator('text=Ligue a entrega, a retirada ou as duas').isVisible();
  report.note(`aviso "ligue a entrega ou a retirada" já visível antes de salvar: ${warning}`);
  await saveSection('error');
  await report.shot(page, 'entrega-erro-sem-modo');
});

if (wants('entrega')) await report.step('7b. Entrega: endereço, mapa, bairros, retirada → salvar', async () => {
  await page.fill('#street', 'Rua Augusta, 1500');
  await page.fill('#district', 'Consolação');
  await page.fill('#city', 'São Paulo');
  await page.fill('#state', 'SP');
  await page.fill('#postalCode', '01304-001');
  await page.check('input[name="deliveryEnabled"]');
  await page.fill('#minOrder', '25');
  await page.fill('#freeAbove', '80');
  // Em "Por bairro" o mapa é opcional e nasce recolhido (F43).
  const mapSummary = page.locator('summary', { hasText: 'Área de entrega no mapa' });
  if (await mapSummary.isVisible().catch(() => false)) { await mapSummary.click(); report.note('mapa estava recolhido em "Por bairro"'); }
  await page.getByRole('button', { name: 'Procurar meu endereço' }).click();
  await page.waitForFunction(() => document.querySelector('input[name="latitude"]')?.value !== '', null, { timeout: 20000 });
  report.note(`mapa: ${(await page.locator('fieldset:has(#deliveryRadius) [role="status"]').innerText()).trim()}`);
  await page.fill('#deliveryRadius', '5');
  const zonesBefore = await page.locator('input[name="zone-name"]').count();
  report.note(`bairros antes de adicionar: ${zonesBefore}`);
  await page.getByRole('button', { name: 'Adicionar bairro' }).click();
  await page.locator('input[name="zone-name"]').nth(0).fill('Consolação');
  // Digitado como o lojista escreve, com "R$": antes virava zero em silêncio (F01).
  await page.locator('input[name="zone-fee"]').nth(0).fill('R$ 6,00');
  await page.locator('input[name="zone-eta"]').nth(0).fill('30-40');
  await page.getByRole('button', { name: 'Adicionar bairro' }).click();
  await page.locator('input[name="zone-name"]').nth(1).fill('Bela Vista');
  await page.locator('input[name="zone-fee"]').nth(1).fill('9,50');
  await page.locator('input[name="zone-eta"]').nth(1).fill('40-55');
  await page.check('input[name="pickupEnabled"]');
  await page.fill('#pickupEta', '20-30 min');
  await report.shot(page, 'entrega-preenchida', { fullPage: true });
  await saveSection('ok');
  await sleep(1200);
  report.note(`depois de salvar entrega a URL é ${pathOf()}`);
  await report.shot(page, 'entrega-salva');
});

if (wants('entrega')) await report.step('7c. Entrega: cobrança por distância', async () => {
  await page.goto(`${BASE}/painel/negocio/entrega`, { waitUntil: 'networkidle' });
  const zones = await page.locator('input[name="zone-name"]').evaluateAll((els) => els.map((e) => e.value));
  const fees = await page.locator('input[name="zone-fee"]').evaluateAll((els) => els.map((e) => e.value));
  const etas = await page.locator('input[name="zone-eta"]').evaluateAll((els) => els.map((e) => e.value));
  report.note(`bairros gravados: ${zones.map((z, i) => `${z} ${fees[i]} ${etas[i]}`).join(' / ')}`);
  if (fees[0] !== '6,00') report.finding('alta', `Taxa digitada "R$ 6,00" voltou como "${fees[0]}"`);
  await page.getByRole('radio', { name: 'Por distância' }).click();
  // Sem o ponto no mapa, cobrar por distância não salva (F05).
  const removePoint = page.getByRole('button', { name: 'Remover do mapa' });
  if (await removePoint.isVisible().catch(() => false)) {
    await removePoint.click();
    await saveSection('error');
    await report.shot(page, 'entrega-distancia-sem-ponto', { fullPage: true });
    await page.getByRole('button', { name: /Procurar meu endereço|Marcar pelo endereço/ }).click();
    await page.waitForFunction(() => document.querySelector('input[name="latitude"]')?.value !== '', null, { timeout: 20000 });
  }
  await page.fill('#distanceBaseFee', '5');
  await page.fill('#distanceBaseKm', '3');
  await page.fill('#distancePerKmFee', '1,50');
  await report.shot(page, 'entrega-por-distancia', { fullPage: true });
  await saveSection('ok');
  // "Salvar e ir para…" já trocou de tela: volta à aba para conferir o que ficou gravado.
  await page.goto(`${BASE}/painel/negocio/entrega`, { waitUntil: 'networkidle' });
  const checked = await page.getByRole('radio', { checked: true }).innerText();
  report.note(`depois de recarregar a cobrança marcada é "${checked}"`);
  const zonesStill = await page.locator('input[name="zone-name"]').count();
  report.note(`bairros continuam no formulário (escondidos): ${zonesStill}`);
  // Volta para bairros: é o cenário mais comum e o que o checkout vai mostrar.
  await page.getByRole('radio', { name: 'Por bairro' }).click();
  await saveSection('ok');
});

if (wants('guia')) await report.step('7d. Guia de configuração depois dos dados do negócio', async () => {
  await page.goto(`${BASE}/painel`, { waitUntil: 'networkidle' });
  const pill = page.getByRole('button', { name: /Configurar restaurante/ });
  if (await pill.isVisible().catch(() => false)) await pill.click();
  const region = page.getByRole('region', { name: 'Configure seu restaurante' });
  await region.waitFor();
  report.note(`guia: ${(await region.innerText()).replace(/\n+/g, ' | ')}`);
  await report.shot(page, 'guia-depois-negocio');
});

/* ===================================================================== 8 */
if (wants('cardapio')) await report.step('8a. Cardápio vazio e erros de validação', async () => {
  await page.goto(`${BASE}/painel/cardapio`, { waitUntil: 'networkidle' });
  await report.shot(page, 'cardapio-vazio', { fullPage: true });
  report.note(`vazio: ${await page.locator('text=Comece pela primeira categoria').isVisible()}`);
  const create = page.getByRole('button', { name: 'Criar categoria' });
  report.note(`"Criar categoria" desabilitado com o campo vazio: ${await create.isDisabled()}`);
  const cover = await coveredBy(create);
  if (cover) report.finding('alta', `No desktop (1280px) o guia flutuante "${cover}" cobre o botão "Criar categoria" do cardápio vazio — o lojista não consegue clicar sem recolher o guia`);
  else report.note('o guia não cobre "Criar categoria"');
  await collapseGuide(page);
  await page.getByLabel('Nome da categoria').fill('X');
  await clickAction(create);
  report.note(`erro com 1 caractere: ${await feedback()}`);
  await page.getByLabel('Nome da categoria').fill('');
});

if (wants('cardapio')) await report.step('8b. Criar categoria "Massas"', async () => {
  await page.getByLabel('Nome da categoria').fill('Massas');
  await page.getByRole('button', { name: 'Criar categoria' }).click();
  await waitForToast(page, 'Categoria criada');
  await categoryCard('Massas').waitFor();
  report.note(`campo da próxima categoria voltou vazio: ${(await page.getByLabel('Nome da categoria').last().inputValue()) === ''}`);
  await report.shot(page, 'cardapio-categoria-criada', { fullPage: true });
});

if (wants('cardapio')) await report.step('8c. Item: erros (sem preço, preço inválido, nome curto)', async () => {
  const card = categoryCard('Massas');
  const form = standingItemForm(card);
  const submit = form.getByRole('button', { name: 'Adicionar ao cardápio' });
  report.note(`"Adicionar ao cardápio" desabilitado em branco: ${await submit.isDisabled()}`);
  await form.locator('input[name="name"]').fill('Lasanha');
  await clickAction(submit);
  report.note(`sem preço: ${await feedback()}`);
  await report.shot(page, 'item-erro-sem-preco');
  await form.locator('input[name="price"]').fill('abc');
  await clickAction(submit);
  report.note(`preço "abc": ${await feedback()}`);
  await form.locator('input[name="name"]').fill('L');
  await form.locator('input[name="price"]').fill('10');
  await clickAction(submit);
  report.note(`nome "L": ${await feedback()}`);
});

if (wants('cardapio')) await report.step('8d. Item completo: foto, complementos (3 grupos) e mais detalhes', async () => {
  const card = categoryCard('Massas');
  const form = standingItemForm(card);
  await form.locator('input[name="name"]').fill('Lasanha à Bolonhesa');
  await form.locator('input[name="price"]').fill('42,90');
  await form.locator('textarea[name="description"]').fill('Massa fresca, molho de tomate caseiro e muito queijo.');
  const photoUrl = await uploadImage(page, form.getByRole('group', { name: 'Foto do prato' }), foto('brasa-classic-308a6b.jpg'), 'image', form);
  report.note(`foto enviada: ${photoUrl}`);
  report.note(`aviso após a foto: ${await feedback()}`);
  await form.locator('summary', { hasText: 'Complementos' }).click();
  await form.getByRole('button', { name: 'Adicionar grupo' }).click();
  await fillGroup(form, 0, { name: 'Tamanho', type: 'single', required: true, choices: [{ name: 'Individual' }, { name: 'Para dois', price: '18' }] });
  await form.getByRole('button', { name: 'Adicionar grupo' }).click();
  await fillGroup(form, 1, { name: 'Adicionais', type: 'multi', max: 3, choices: [{ name: 'Queijo extra', price: '6' }, { name: 'Bacon', price: '8' }] });
  await form.getByRole('button', { name: 'Adicionar grupo' }).click();
  await fillGroup(form, 2, { name: 'Retirar ingredientes', type: 'remove', choices: [{ name: 'Sem cebola' }, { name: 'Sem manjericão' }] });
  // Grupo com nome e sem opção: o que acontece com ele ao salvar?
  await form.getByRole('button', { name: 'Adicionar grupo' }).click();
  await form.locator('fieldset').nth(3).getByLabel('Nome do grupo').fill('Grupo sem opções');
  await report.shot(page, 'item-complementos', { fullPage: true });
  await form.locator('summary', { hasText: 'Mais detalhes' }).click();
  await form.getByLabel('Serve').fill('1 pessoa');
  await form.getByLabel('Etiquetas').fill('Mais vendido, Vegetariano');
  await form.getByLabel('Alérgenos').fill('Glúten, Leite');
  await form.getByLabel('Calorias').fill('540');
  await form.getByLabel('Texto alternativo da foto').fill('Lasanha gratinada num prato fundo');
  await report.shot(page, 'item-mais-detalhes', { fullPage: true });
  const add = form.getByRole('button', { name: 'Adicionar ao cardápio' });
  const addCover = await coveredBy(add);
  if (addCover) report.finding('alta', `O botão "Adicionar ao cardápio" está coberto por ${addCover}`);
  // O grupo com nome e sem opção agora volta com erro, em vez de sumir (F07).
  await clickAction(add);
  const groupError = (await visibleFeedback(page)).find((t) => /Grupo 4|pelo menos uma opção/.test(t));
  report.note(`grupo sem opção: ${groupError ?? '(nenhum erro — o grupo sumiu?)'}`);
  if (!groupError) report.finding('media', 'Grupo de complementos com nome e sem opção ainda some em silêncio ao salvar');
  await report.shot(page, 'item-erro-grupo-vazio', { fullPage: true });
  await form.locator('fieldset').nth(3).getByRole('button', { name: 'Remover grupo' }).click();
  await add.click();
  await waitForToast(page, 'Item adicionado');
  const toastText = await page.locator('[role="status"]').filter({ hasText: 'Item adicionado' }).first().innerText();
  report.note(`toast do primeiro item: "${toastText.replace(/\n+/g, ' | ')}"`);
  const row = card.getByRole('button', { name: 'Editar Lasanha à Bolonhesa' });
  await row.waitFor();
  report.note(`linha do item: "${(await row.innerText()).replace(/\n+/g, ' ')}"`);
  if (!/3 complementos/.test(await row.innerText())) report.finding('media', 'A linha não mostra 3 complementos depois de salvar 3 grupos');
  report.note(`formulário do próximo item voltou em branco: ${(await standingItemForm(card).locator('input[name="name"]').inputValue()) === ''}`);
  report.note(`foco depois de adicionar: ${await page.evaluate(() => `${document.activeElement?.tagName}[name=${document.activeElement?.getAttribute('name')}]`)}`);
  await report.shot(page, 'item-salvo', { fullPage: true });
});

if (wants('cardapio')) await report.step('8e. Segundo item sem foto e segunda categoria', async () => {
  const card = categoryCard('Massas');
  const form = standingItemForm(card);
  await form.locator('input[name="name"]').fill('Nhoque ao sugo');
  await form.locator('input[name="price"]').fill('36');
  await form.getByRole('button', { name: 'Adicionar ao cardápio' }).click();
  await waitForToast(page, 'Item adicionado');
  await page.getByLabel('Nome da categoria').last().fill('Bebidas');
  await page.getByRole('button', { name: 'Criar categoria' }).click();
  await waitForToast(page, 'Categoria criada');
  const bebidas = categoryCard('Bebidas');
  await bebidas.waitFor();
  const bform = standingItemForm(bebidas);
  await bform.locator('input[name="name"]').fill('Limonada');
  await bform.locator('input[name="price"]').fill('12');
  await bform.locator('summary', { hasText: 'Mais detalhes' }).click();
  const categorySelect = bform.getByLabel('Categoria');
  report.note(`com 2 categorias o seletor "Categoria" aparece em Mais detalhes: ${await categorySelect.isVisible()}`);
  await bform.getByRole('button', { name: 'Adicionar ao cardápio' }).click();
  await waitForToast(page, 'Item adicionado');
  report.note(`resumo do cabeçalho: ${(await page.locator('main p').first().innerText()).trim()}`);
  await report.shot(page, 'cardapio-duas-categorias', { fullPage: true });
});

if (wants('cardapio')) await report.step('8f. Editar item inline: preço, Esc, cancelar, salvar', async () => {
  const card = categoryCard('Massas');
  await card.getByRole('button', { name: 'Editar Nhoque ao sugo' }).click();
  const form = editItemForm(card);
  await form.waitFor();
  report.note(`nome já em foco ao abrir: ${await page.evaluate(() => document.activeElement?.name)}`);
  report.note(`botões do editor: ${(await form.locator('button').allInnerTexts()).map((t) => t.trim()).filter(Boolean).join(' / ')}`);
  await report.shot(page, 'item-editor-inline', { fullPage: true });
  await page.keyboard.press('Escape');
  await sleep(400);
  report.note(`Esc fechou o editor: ${!(await editItemForm(card).isVisible().catch(() => false))}`);
  await card.getByRole('button', { name: 'Editar Nhoque ao sugo' }).click();
  await editItemForm(card).locator('input[name="price"]').fill('38,50');
  // Abrir outra linha com o preço mudado pergunta antes de descartar (F08).
  await card.getByRole('button', { name: 'Editar Lasanha à Bolonhesa' }).click();
  const leave = page.getByRole('dialog');
  const asked = await leave.waitFor({ timeout: 3000 }).then(() => true).catch(() => false);
  report.note(`abrir outra linha com alteração pendente pergunta antes: ${asked}`);
  if (!asked) report.finding('media', 'Abrir outra linha do cardápio com um item em edição descarta a edição sem perguntar');
  if (asked) await leave.getByRole('button', { name: 'Continuar editando' }).click();
  await sleep(300);
  await editItemForm(card).getByRole('button', { name: 'Salvar' }).click();
  await waitForToast(page, 'Item salvo');
  await sleep(800);
  report.note(`linha depois de salvar: "${(await card.getByRole('button', { name: 'Editar Nhoque ao sugo' }).innerText()).replace(/\n+/g, ' ')}"`);
  // Duplicar e mudar de posição (F45, F28).
  await card.getByRole('button', { name: 'Editar Nhoque ao sugo' }).click();
  await editItemForm(card).getByRole('button', { name: 'Duplicar item' }).click();
  await waitForToast(page, 'cópia').catch(() => {});
  await card.getByRole('button', { name: /Nhoque ao sugo \(cópia\)/ }).first().waitFor({ timeout: 15000 }).catch(() => {});
  await sleep(800);
  const copyEditor = editItemForm(card);
  report.note(`depois de duplicar: editor aberto com "${await copyEditor.locator('input[name="name"]').inputValue().catch(() => '?')}", foco em ${await page.evaluate(() => document.activeElement?.getAttribute('name'))}`);
  await copyEditor.getByRole('button', { name: 'Mover para cima' }).click();
  await sleep(1200);
  const itemOrder = (await card.locator('li').allInnerTexts()).map((t) => t.split('\n')[0].trim()).filter(Boolean);
  report.note(`ordem dos itens em Massas depois de mover a cópia para cima: ${itemOrder.join(' → ')}`);
  await report.shot(page, 'item-duplicado', { fullPage: true });
  await editItemForm(card).getByRole('button', { name: 'Excluir item' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Excluir' }).click();
  await waitForToast(page, 'Item excluído');
  // A lista chega pela revalidação logo depois do toast.
  await card.getByRole('button', { name: /Nhoque ao sugo \(cópia\)/ }).waitFor({ state: 'detached', timeout: 15000 });
});

if (wants('cardapio')) await report.step('8g. Esgotar item pelo interruptor e voltar', async () => {
  const sw = page.getByRole('switch', { name: 'Disponível para pedido: Nhoque ao sugo' });
  await sw.click();
  await page.waitForFunction(() => document.body.innerText.includes('Esgotado'), null, { timeout: 15000 });
  report.note('selo "Esgotado" apareceu na linha');
  await report.shot(page, 'item-esgotado');
  await sw.click();
  await page.waitForFunction(() => !document.body.innerText.includes('Esgotado'), null, { timeout: 15000 });
});

if (wants('cardapio')) await report.step('8h. Renomear, mover e excluir categoria; excluir item', async () => {
  const card = categoryCard('Bebidas');
  await card.getByRole('button', { name: 'Opções de Bebidas' }).click();
  const menuItems = await page.getByRole('menuitem').allInnerTexts();
  report.note(`menu ⋯: ${menuItems.join(' / ')}`);
  await page.getByRole('menuitem', { name: 'Mover para cima' }).click();
  await sleep(1200);
  const order = await page.locator('section[aria-labelledby$="-title"] h2').allInnerTexts();
  report.note(`ordem depois de mover: ${order.map((t) => t.trim()).join(' → ')}`);
  const sectionId = await card.getAttribute('aria-labelledby');
  const section = page.locator(`section[aria-labelledby="${sectionId}"]`);
  await card.getByRole('heading', { level: 2 }).getByRole('button').click();
  const rename = section.locator('header form');
  await rename.getByLabel('Nome da categoria').fill('Bebidas geladas');
  await rename.getByLabel('Descrição', { exact: true }).fill('Sucos, refrigerantes e cervejas');
  await rename.getByRole('button', { name: 'Salvar' }).click();
  await waitForToast(page, 'Categoria atualizada');
  await categoryCard('Bebidas geladas').waitFor();
  // Excluir item com confirmação
  const massas = categoryCard('Massas');
  await massas.getByRole('button', { name: 'Editar Nhoque ao sugo' }).click();
  await editItemForm(massas).getByRole('button', { name: 'Excluir item' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  report.note(`diálogo: ${(await dialog.innerText()).replace(/\n+/g, ' | ')}`);
  await report.shot(page, 'excluir-item-dialogo');
  await dialog.getByRole('button', { name: 'Excluir' }).click();
  await waitForToast(page, 'Item excluído');
  // Excluir categoria com item dentro
  const bebidas = categoryCard('Bebidas geladas');
  await bebidas.getByRole('button', { name: 'Opções de Bebidas geladas' }).click();
  await page.getByRole('menuitem', { name: 'Excluir categoria' }).click();
  await page.getByRole('dialog').waitFor();
  report.note(`diálogo: ${(await page.getByRole('dialog').innerText()).replace(/\n+/g, ' | ')}`);
  await page.getByRole('dialog').getByRole('button', { name: 'Excluir' }).click();
  await waitForToast(page, 'Categoria excluída');
  await sleep(800);
  report.note(`categorias restantes: ${(await page.locator('section[aria-labelledby$="-title"] h2').allInnerTexts()).map((t) => t.trim()).join(', ')}`);
  await report.shot(page, 'cardapio-final', { fullPage: true });
});

/* ===================================================================== 9 */
if (wants('publicar')) await report.step('9a. Loja pública responde 404 antes de publicar', async () => {
  const response = await context.request.get(`${BASE}/r/${restaurant.slug}`);
  report.note(`GET /r/${restaurant.slug} → ${response.status()}`);
  await page.goto(`${BASE}/painel/cardapio`, { waitUntil: 'networkidle' });
  const view = page.getByRole('link', { name: 'Ver como o cliente vê' });
  report.note(`"Ver como o cliente vê" aponta para ${await view.getAttribute('href')}`);
});

if (wants('publicar')) await report.step('9b. Publicar, copiar link, abrir', async () => {
  await page.goto(`${BASE}/painel`, { waitUntil: 'networkidle' });
  await report.shot(page, 'compartilhar-rascunho', { fullPage: true });
  await collapseGuide(page);
  const publish = page.getByRole('button', { name: 'Publicar cardápio' });
  report.note(`botão publicar aria-disabled: ${await publish.getAttribute('aria-disabled')}`);
  await publish.click();
  await page.waitForFunction(() => document.body.innerText.includes('No ar'), null, { timeout: 30000 });
  report.note('tag "No ar" apareceu');
  await waitForToast(page, 'Cardápio publicado').then(() => report.note('toast "Cardápio publicado."')).catch(() => report.note('sem toast ao publicar'));
  await report.shot(page, 'compartilhar-publicado', { fullPage: true });
  await page.getByRole('button', { name: 'Copiar link' }).click();
  await waitForToast(page, 'Link copiado').then(() => report.note('toast "Link copiado"')).catch(() => report.note('toast "Link copiado" não apareceu'));
  // O QR sai em PNG (F35).
  const download = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
  await page.getByRole('button', { name: 'Baixar QR code' }).or(page.getByRole('link', { name: 'Baixar QR code' })).first().click();
  const file = await download;
  report.note(`"Baixar QR code" baixou: ${file ? file.suggestedFilename() : '(nenhum download)'}`);
  const response = await context.request.get(`${BASE}/r/${restaurant.slug}`);
  report.note(`GET /r/${restaurant.slug} depois de publicar → ${response.status()}`);
  report.note(`"Ver cardápio" no topo: ${await page.getByRole('link', { name: 'Ver cardápio' }).isVisible()}`);
});

/* ==================================================================== 10 */
if (wants('loja')) await report.step('10a. Prévia dentro do painel', async () => {
  await page.goto(`${BASE}/painel/previa`, { waitUntil: 'networkidle' });
  await waitForImages(page);
  await report.shot(page, 'previa', { fullPage: true });
  const text = await page.locator('#conteudo').innerText();
  report.note(`prévia mostra o item: ${/Lasanha/.test(text)}; retirada/entrega: ${/Retirada/.test(text)} / ${/Entrega/.test(text)}`);
  await page.getByRole('link', { name: /Lasanha/ }).first().click();
  await page.waitForURL(/\/painel\/previa\/item\//);
  await waitForImages(page);
  await report.shot(page, 'previa-item', { fullPage: true });
  const groups = await page.locator('[role="group"] h2, [role="group"] h3').allInnerTexts();
  report.note(`grupos de complementos na prévia: ${groups.map((t) => t.trim()).join(' / ')}`);
});

if (wants('loja')) await report.step('10b. Loja pública: item com complementos e modos de entrega', async () => {
  await page.goto(`${BASE}/r/${restaurant.slug}`, { waitUntil: 'networkidle' });
  await waitForImages(page);
  await report.shot(page, 'loja-publica', { fullPage: true });
  const text = await page.locator('main').first().innerText();
  report.note(`capa/logo/nome: ${/Cantina E2E/.test(text)}; "Aberto"/"Fechado": ${(text.match(/Aberto[^\n]*|Fechado[^\n]*/) ?? ['?'])[0]}`);
  report.note(`pedido mínimo na tela: ${(text.match(/(Pedido m|M)ínimo[^\n]*/) ?? ['-'])[0]}; entrega grátis: ${(text.match(/Entrega grátis[^\n]*/) ?? ['-'])[0]}`);
  await page.getByRole('link', { name: /Lasanha/ }).first().click();
  await page.waitForURL(/\/item\//);
  await waitForImages(page);
  const groups = await page.locator('[role="group"]').evaluateAll((els) => els.map((el) => el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby'))?.textContent.trim()).filter(Boolean));
  report.note(`grupos na loja: ${groups.join(' / ')}`);
  // O CTA do pé ("Adicionar 1 por R$ …"); os "Adicionar <opção>" dos adicionais são outros botões.
  const add = page.getByRole('button', { name: /^Adicionar \d+ por/ }).first();
  report.note(`"Adicionar" bloqueado até escolher o tamanho: ${await add.getAttribute('aria-disabled')}`);
  await page.getByRole('radio', { name: /Para dois/ }).check().catch(async () => page.locator('label', { hasText: 'Para dois' }).click());
  await page.locator('label', { hasText: 'Queijo extra' }).click().catch(() => {});
  await sleep(300);
  report.note(`botão agora: "${(await add.innerText()).trim()}"`);
  await report.shot(page, 'loja-item', { fullPage: true });
  await add.click();
  await page.waitForURL((url) => !/\/item\//.test(url.pathname), { timeout: 15000 });
  await page.getByRole('button', { name: /Ver sacola|Abrir sacola/ }).first().click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await sleep(800);
  await report.shot(page, 'loja-finalizar', { fullPage: true });
  const zones = await page.locator('#cart-zone option').allInnerTexts().catch(() => []);
  report.note(`bairros no checkout: ${zones.map((t) => t.trim()).join(' / ')}`);
});

/* ==================================================================== 11 */
if (wants('publicar')) await report.step('9c. Despublicar e publicar bloqueado (todos os itens esgotados)', async () => {
  await page.goto(`${BASE}/painel`, { waitUntil: 'networkidle' });
  await collapseGuide(page);
  await page.getByRole('button', { name: 'Despublicar' }).click();
  // Despublicar pergunta antes (F32).
  const confirm = page.getByRole('dialog');
  await confirm.waitFor();
  report.note(`confirmação: ${(await confirm.innerText()).replace(/\n+/g, ' | ')}`);
  await report.shot(page, 'despublicar-confirmacao');
  await confirm.getByRole('button', { name: 'Despublicar' }).click();
  await page.waitForFunction(() => document.body.innerText.includes('Rascunho'), null, { timeout: 30000 });
  await waitForToast(page, 'Cardápio despublicado').then(() => report.note('toast "Cardápio despublicado."')).catch(() => report.note('sem toast ao despublicar'));
  // Cliente que abre o link de um cardápio despublicado (F33).
  const off = await context.newPage();
  const offResponse = await off.goto(`${BASE}/r/${restaurant.slug}`, { waitUntil: 'networkidle' });
  report.note(`/r/${restaurant.slug} despublicado → ${offResponse?.status()} "${(await off.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 140)}"`);
  await report.shot(off, 'loja-despublicada');
  await off.close();
  await page.goto(`${BASE}/painel/cardapio`, { waitUntil: 'networkidle' });
  await page.getByRole('switch', { name: 'Disponível para pedido: Lasanha à Bolonhesa' }).click();
  await page.waitForFunction(() => document.body.innerText.includes('Esgotado'), null, { timeout: 15000 });
  await page.goto(`${BASE}/painel`, { waitUntil: 'networkidle' });
  const publish = page.getByRole('button', { name: 'Publicar cardápio' });
  report.note(`aria-disabled: ${await publish.getAttribute('aria-disabled')}; motivo: ${(await page.locator('[role="tooltip"]').allInnerTexts()).join(' | ')}`);
  await publish.hover();
  await sleep(400);
  await report.shot(page, 'publicar-bloqueado');
  await page.goto(`${BASE}/painel/cardapio`, { waitUntil: 'networkidle' });
  await page.getByRole('switch', { name: 'Disponível para pedido: Lasanha à Bolonhesa' }).click();
  await page.waitForFunction(() => !document.body.innerText.includes('Esgotado'), null, { timeout: 15000 });
  await page.goto(`${BASE}/painel`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Publicar cardápio' }).click();
  await page.waitForFunction(() => document.body.innerText.includes('No ar'), null, { timeout: 30000 });
});

if (wants('login')) await report.step('11. Sair e entrar de novo com destino (proximo)', async () => {
  await signOut(page);
  report.note(`depois de sair: ${pathOf()}`);
  await page.goto(`${BASE}/painel/cardapio`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(/\/entrar/);
  report.note(`deslogado, /painel/cardapio mandou para ${pathOf()}${new URL(page.url()).search}`);
  await report.shot(page, 'entrar');
  await page.waitForSelector('input[name="identifier"]');
  await page.fill('input[name="identifier"]', account.email);
  await page.click('.cl-formButtonPrimary');
  await page.waitForSelector('input[name="password"]', { timeout: 20000 });
  await page.fill('input[name="password"]', account.password);
  await page.click('.cl-formButtonPrimary');
  await page.waitForURL((url) => url.pathname.startsWith('/painel'), { timeout: 45000 });
  report.note(`depois do login caiu em ${pathOf()}`);
});

/* ==================================================================== 12 */
if (wants('celular')) await report.step('12. Celular 390px: painel, cardápio, entrega, guia', async () => {
  // A mesma sessão do desktop, num aparelho de 390px: o que muda é a tela, não a conta.
  const mobile = await browser.newContext({ ...devices['iPhone 13'], locale: 'pt-BR', reducedMotion: 'reduce', storageState: await context.storageState() });
  const mpage = await mobile.newPage();
  mpage.setDefaultTimeout(15000);
  await mockGeocode(mpage);
  const overflow = async () => mpage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  for (const [name, url] of [['painel', '/painel'], ['cardapio', '/painel/cardapio'], ['identidade', '/painel/negocio'], ['entrega', '/painel/negocio/entrega'], ['conta', '/painel/conta']]) {
    await mpage.goto(`${BASE}${url}`, { waitUntil: 'networkidle' });
    await sleep(800);
    const extra = await overflow();
    report.note(`${url}: estouro horizontal ${extra}px; guia visível: ${await mpage.getByRole('region', { name: 'Configure seu restaurante' }).isVisible().catch(() => false)} / pílula: ${await mpage.getByRole('button', { name: /Configurar restaurante/ }).isVisible().catch(() => false)}`);
    if (extra > 0) report.finding('alta', `${url} estoura ${extra}px na horizontal no celular`);
    await report.shot(mpage, `celular-${name}`, { fullPage: true });
  }
  await mpage.goto(`${BASE}/painel/cardapio`, { waitUntil: 'networkidle' });
  const card = mpage.locator('section[aria-labelledby$="-title"]').first();
  await card.waitFor();
  // Categoria com itens mostra "Adicionar item" em vez do formulário aberto (F42).
  const addItem = card.getByRole('button', { name: 'Adicionar item' });
  if (await addItem.isVisible().catch(() => false)) { await addItem.click(); report.note('celular: "Adicionar item" abriu o formulário na categoria'); }
  await card.locator('summary', { hasText: 'Complementos' }).first().click();
  await sleep(400);
  await report.shot(mpage, 'celular-complementos', { fullPage: true });
  await mobile.close();

  // Conta nova, configuração pela metade: o guia no celular não pode cobrir os botões (F02, F16).
  const { execFileSync } = await import('node:child_process');
  const fresh = JSON.parse(execFileSync('node', [path.join(import.meta.dirname, 'bootstrap.mjs'), 'celular'], { encoding: 'utf8', env: process.env }).trim().split('\n').pop());
  const phone = await browser.newContext({ ...devices['iPhone 13'], locale: 'pt-BR', reducedMotion: 'reduce', storageState: fresh.storageState });
  const ppage = await phone.newPage();
  ppage.setDefaultTimeout(15000);
  for (const [url, buttonName] of [['/painel/cardapio', 'Criar categoria'], ['/painel/negocio/entrega', /^Salvar/], ['/painel/negocio/horarios', /^Salvar/]]) {
    await ppage.goto(`${BASE}${url}`, { waitUntil: 'networkidle' });
    await sleep(600);
    const guideOpen = await ppage.getByRole('region', { name: 'Configure seu restaurante' }).isVisible().catch(() => false);
    const pill = await ppage.getByRole('button', { name: /Configurar restaurante/ }).isVisible().catch(() => false);
    const button = ppage.getByRole('button', { name: buttonName }).last();
    // A pílula flutua como um botão de ação: o que vale é o fim da rolagem, onde o
    // espaço reservado sob a página deixa a última linha acima dela.
    await ppage.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await sleep(400);
    const cover = await coveredBy(button);
    report.note(`celular, conta nova, ${url}: guia aberto=${guideOpen}, pílula=${pill}, "${buttonName}" coberto por: ${cover ?? 'nada'}`);
    if (cover) report.finding('alta', `No celular, em ${url}, "${buttonName}" fica coberto por ${cover}`);
    await report.shot(ppage, `celular-conta-nova-${url.split('/').pop()}`);
  }
  const pillButton = ppage.getByRole('button', { name: /Configurar restaurante/ });
  if (await pillButton.isVisible().catch(() => false)) {
    await pillButton.click();
    await sleep(500);
    report.note(`pílula aberta no celular: ${await ppage.getByRole('dialog').isVisible().catch(() => false) ? 'sheet (dialog)' : 'não abriu como sheet'}`);
    await report.shot(ppage, 'celular-guia-sheet');
  }
  await phone.close();
  await deleteClerkUserByEmail(fresh.email);
});

/* ==================================================================== 13 */
if (wants('conta')) await report.step('13a. Conta: perfil do Clerk e idioma inglês', async () => {
  await page.goto(`${BASE}/painel/conta`, { waitUntil: 'networkidle' });
  await report.shot(page, 'conta', { fullPage: true });
  report.note(`perfil do Clerk montado: ${await page.locator('.cl-userProfile-root').isVisible()}`);
  await page.getByRole('group', { name: 'Idioma' }).getByRole('button', { name: 'English' }).click();
  await page.waitForFunction(() => document.body.innerText.includes('Business details'), null, { timeout: 20000 });
  report.note(`painel em inglês: ${(await page.locator('nav[aria-label]').first().innerText()).replace(/\n+/g, ' / ')}`);
  await report.shot(page, 'conta-ingles', { fullPage: true });
  await page.getByRole('group', { name: 'Language' }).getByRole('button', { name: 'Português' }).click();
  await page.waitForFunction(() => document.body.innerText.includes('Dados do negócio'), null, { timeout: 20000 });
});

if (wants('conta') && !args.keep) await report.step('13b. Excluir a conta (limpa banco e Clerk)', async () => {
  await page.goto(`${BASE}/painel/conta`, { waitUntil: 'networkidle' });
  await page.locator('summary', { hasText: 'Quero excluir minha conta' }).click();
  const submit = page.getByRole('button', { name: 'Excluir conta definitivamente' });
  report.note(`botão desabilitado antes da frase: ${await submit.isDisabled()}`);
  await page.fill('#delete-confirmation', 'Excluir minha conta');
  await report.shot(page, 'excluir-conta', { fullPage: true });
  await submit.click();
  await page.waitForURL((url) => url.pathname === '/', { timeout: 45000 });
  report.note(`depois de excluir caiu em ${pathOf()}`);
  const response = await context.request.get(`${BASE}/r/${restaurant.slug}`);
  report.note(`GET /r/${restaurant.slug} depois de excluir → ${response.status()}`);
  const left = await deleteClerkUserByEmail(account.email);
  report.note(`usuários do Clerk com este e-mail que sobraram (apagados agora): ${left}`);
  if (left) report.finding('alta', 'Excluir a conta não apagou o usuário no Clerk');
});

/* ------------------------------------------------------------------ fim */
if (consoleErrors.length) report.note(`erros de console (${consoleErrors.length}): ${[...new Set(consoleErrors)].slice(0, 8).join(' || ')}`);
await browser.close();
if (!args.keep) {
  // A própria conta, se o passo de exclusão não rodou (ou falhou): não fica lixo no Clerk.
  const left = await deleteClerkUserByEmail(account.email);
  if (left) process.stdout.write(`conta de teste apagada no Clerk por fora do painel: ${account.email}\n`);
}
if (args.sweep) {
  // Só quando pedido: outras rodadas (ou agentes) podem estar usando contas e2e-* agora.
  for (const user of await listClerkTestUsers()) { await deleteClerkUserByEmail(user.email); process.stdout.write(`limpo no Clerk: ${user.email}\n`); }
}
const file = report.write();
process.stdout.write(`\nRelatório: ${file}\n${report.steps.filter((s) => s.status === 'ok').length} ok / ${report.steps.filter((s) => s.status === 'fail').length} falhas · ${report.findings.length} observações\n`);
if (args.keep) process.stdout.write(`Conta mantida: ${account.email} / ${account.password}\n`);
process.exit(report.steps.some((s) => s.status === 'fail') ? 1 : 0);
