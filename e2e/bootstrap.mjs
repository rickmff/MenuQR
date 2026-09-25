/**
 * Cria uma conta de teste + restaurante (opcionalmente com cardápio pronto) e
 * guarda a sessão do navegador em ../sessions/<label>.json, para outro script
 * abrir o painel já logado sem repetir o cadastro.
 *
 * Uso: node bootstrap.mjs <label> [--menu] [--publish]
 *   --menu     cria 1 categoria com 1 item (com foto e complementos)
 *   --publish  salva horários, endereço e retirada e publica (exige --menu)
 * Saída (stdout, JSON): { email, password, slug, storageState }
 */
import path from 'node:path';
import { existsSync, writeFileSync } from 'node:fs';
import { BASE, PASSWORD, Report, collapseGuide, mockGeocode, openBrowser, signUp, sleep, testEmail, uploadImage, waitForToast } from './lib/session.mjs';

const EXEMPLO = process.env.E2E_FOTOS ?? [path.resolve(import.meta.dirname, '..', 'public', 'exemplo'), path.resolve(import.meta.dirname, '..', 'app', 'public', 'exemplo')].find((dir) => existsSync(dir));
const label = process.argv[2] ?? 'explorador';
const flags = new Set(process.argv.slice(3));
const report = new Report(`bootstrap-${label}`);
const email = testEmail(label);
const slug = `e2e-${label}-${Math.random().toString(36).slice(2, 7)}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
const { browser, context, page } = await openBrowser();
await mockGeocode(page);

await signUp(page, report, { email });
await page.goto(`${BASE}/painel/comecar`, { waitUntil: 'networkidle' });
await page.fill('#name', `Restaurante ${label}`);
await page.fill('#slug', slug);
// O campo de telefone é controlado: só depois de hidratar o que se digita chega ao campo oculto.
await page.fill('#whatsapp', '11987654321');
await page.waitForFunction(() => document.querySelector('input[type="hidden"][name="whatsapp"]')?.value === '+5511987654321', null, { timeout: 10000 }).catch(async () => { await page.fill('#whatsapp', ''); await page.fill('#whatsapp', '11987654321'); });
await page.getByRole('button', { name: 'Criar meu cardápio' }).click();
await page.waitForURL((url) => url.pathname !== '/painel/comecar', { timeout: 30000 });

if (flags.has('--menu')) {
  await page.goto(`${BASE}/painel/cardapio`, { waitUntil: 'networkidle' });
  await collapseGuide(page);
  await page.getByLabel('Nome da categoria').fill('Pratos');
  await page.getByRole('button', { name: 'Criar categoria' }).click();
  await waitForToast(page, 'Categoria criada');
  const card = page.locator('section[aria-labelledby$="-title"]').first();
  const form = card.locator('form').filter({ has: page.locator('input[name="price"]') }).first();
  await form.locator('input[name="name"]').fill('Prato da casa');
  await form.locator('input[name="price"]').fill('39,90');
  await uploadImage(page, form.getByRole('group', { name: 'Foto do prato' }), path.join(EXEMPLO, 'brasa-classic-308a6b.jpg'), 'image', form);
  await form.locator('summary', { hasText: 'Complementos' }).click();
  await form.getByRole('button', { name: 'Adicionar grupo' }).click();
  await form.getByLabel('Nome do grupo').first().fill('Tamanho');
  await form.getByLabel('Obrigatório', { exact: true }).first().check();
  await form.getByLabel('Opção', { exact: true }).first().fill('Individual');
  await form.getByRole('button', { name: 'Adicionar ao cardápio' }).click();
  await waitForToast(page, 'Item adicionado');
  if (flags.has('--publish')) {
    // Publicar exige horário com um dia aberto, endereço (rua e cidade) e uma
    // forma de receber (publishBlocker). A aba Horários já sugere 18h–23h:
    // basta salvar. O botão muda de rótulo com o próximo passo, então vale o
    // submit do formulário da aba, não o texto.
    const saveSection = async (href, fill) => {
      await page.goto(`${BASE}${href}`, { waitUntil: 'networkidle' });
      await collapseGuide(page);
      if (fill) await fill();
      await page.locator('form:has(input[name="section"]) button[type="submit"]').click();
      await waitForToast(page, 'Alterações salvas');
    };
    await saveSection('/painel/negocio/horarios');
    await saveSection('/painel/negocio/entrega', async () => {
      await page.fill('#street', 'Rua Augusta, 1500');
      await page.fill('#city', 'São Paulo');
      await page.locator('input[name="pickupEnabled"]').check();
    });
    await page.goto(`${BASE}/painel`, { waitUntil: 'networkidle' });
    await collapseGuide(page);
    await page.getByRole('button', { name: 'Publicar cardápio' }).click();
    await page.waitForFunction(() => document.body.innerText.includes('No ar'), null, { timeout: 30000 });
  }
}
await sleep(500);
const storageState = path.resolve(import.meta.dirname, '..', 'sessions', `${label}.json`);
writeFileSync(storageState, JSON.stringify(await context.storageState(), null, 2));
await browser.close();
process.stdout.write(`${JSON.stringify({ email, password: PASSWORD, slug, storageState })}\n`);
