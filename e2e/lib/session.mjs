/**
 * Infra do teste E2E do Menu Online: sessão do navegador com a conta do Clerk,
 * relatório por passo (captura + tempo + observações) e limpeza.
 *
 * Roda contra um clone do projeto com SQLite local (nunca contra o Turso
 * compartilhado com a produção). Variáveis:
 *   E2E_BASE            http://localhost:3201 (padrão)
 *   E2E_HEADED=1        abre o Chrome visível
 *   E2E_MOBILE=1        viewport 390x844 (iPhone 13)
 *   E2E_REPORT_DIR      pasta do relatório (padrão: <kit>/report)
 *   E2E_REAL_GEOCODE=1  não intercepta /api/geocodificar (bate no Nominatim)
 *   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY / CLERK_SECRET_KEY  chaves da instância de dev
 */
import { chromium, devices } from 'playwright';
import { clerkSetup, setupClerkTestingToken } from '@clerk/testing/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const BASE = process.env.E2E_BASE ?? 'http://localhost:3201';
export const REPORT_DIR = path.resolve(process.env.E2E_REPORT_DIR ?? path.join(import.meta.dirname, '..', 'report'));
export const OTP = '424242';
export const PASSWORD = 'Senha-forte-e2e-2026!';

const CLERK_API = 'https://api.clerk.com/v1';

/** E-mail `+clerk_test`: o Clerk aceita o código 424242 e não envia e-mail. */
export function testEmail(label) {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(2, 14);
  return `e2e-${label}-${stamp}+clerk_test@menuonline.site`;
}

export class Report {
  constructor(name) {
    this.name = name;
    this.startedAt = new Date().toISOString();
    this.steps = [];
    this.findings = [];
    this.shotCount = 0;
    mkdirSync(path.join(REPORT_DIR, 'shots'), { recursive: true });
  }

  /** Um passo do roteiro: o que o lojista fez e o que viu. */
  async step(title, fn) {
    const started = Date.now();
    const entry = { title, status: 'ok', ms: 0, notes: [], shots: [] };
    this.steps.push(entry);
    this.current = entry;
    process.stdout.write(`▶ ${title}\n`);
    try {
      await fn(entry);
    } catch (error) {
      entry.status = 'fail';
      entry.error = String(error?.stack ?? error).split('\n').slice(0, 6).join('\n');
      process.stdout.write(`  ✗ ${entry.error.split('\n')[0]}\n`);
    } finally {
      entry.ms = Date.now() - started;
      process.stdout.write(`  ${entry.status === 'ok' ? '✓' : '✗'} ${entry.ms} ms\n`);
    }
    return entry.status === 'ok';
  }

  note(text) {
    this.current?.notes.push(text);
    process.stdout.write(`  · ${text}\n`);
  }

  /** Observação de UX, com o passo em que apareceu — vira insumo da avaliação. */
  finding(severity, text, extra = {}) {
    // A mesma observação em várias telas conta uma vez, com as telas listadas.
    const existing = this.findings.find((f) => f.text === text);
    if (existing) { existing.alsoIn = [...(existing.alsoIn ?? []), this.current?.title].filter(Boolean); return; }
    this.findings.push({ severity, text, step: this.current?.title ?? null, ...extra });
    process.stdout.write(`  ⚑ [${severity}] ${text}\n`);
  }

  async shot(page, name, options = {}) {
    this.shotCount += 1;
    const file = `${String(this.shotCount).padStart(3, '0')}-${name.replace(/[^a-z0-9-]+/gi, '-')}.png`;
    const full = path.join(REPORT_DIR, 'shots', file);
    await page.screenshot({ path: full, fullPage: options.fullPage ?? false, animations: 'disabled' });
    this.current?.shots.push(`shots/${file}`);
    return full;
  }

  write() {
    const summary = {
      name: this.name,
      base: BASE,
      startedAt: this.startedAt,
      finishedAt: new Date().toISOString(),
      passed: this.steps.filter((s) => s.status === 'ok').length,
      failed: this.steps.filter((s) => s.status === 'fail').length,
      steps: this.steps,
      findings: this.findings,
    };
    const json = path.join(REPORT_DIR, `${this.name}.json`);
    writeFileSync(json, JSON.stringify(summary, null, 2));
    const md = [
      `# ${this.name}`,
      '',
      `Base: ${BASE} · ${summary.passed} passos ok, ${summary.failed} falharam`,
      '',
      ...this.steps.map((s) =>
        [
          `## ${s.status === 'ok' ? '✅' : '❌'} ${s.title} (${s.ms} ms)`,
          ...s.notes.map((n) => `- ${n}`),
          ...(s.error ? ['', '```', s.error, '```'] : []),
          ...s.shots.map((f) => `![${f}](${f})`),
          '',
        ].join('\n'),
      ),
      '## Observações de UX',
      '',
      ...this.findings.map((f) => `- **[${f.severity}]** ${f.text}${f.step ? ` _(em: ${f.step})_` : ''}`),
      '',
    ].join('\n');
    writeFileSync(path.join(REPORT_DIR, `${this.name}.md`), md);
    return json;
  }
}

/** Abre o navegador já com o token de teste do Clerk (pula o Turnstile). */
export async function openBrowser({ mobile = Boolean(process.env.E2E_MOBILE), headed = Boolean(process.env.E2E_HEADED) } = {}) {
  await clerkSetup({
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  });
  const browser = await chromium.launch({ channel: 'chrome', headless: !headed, slowMo: headed ? 80 : 0 });
  const context = await browser.newContext({
    ...(mobile ? devices['iPhone 13'] : { viewport: { width: 1280, height: 900 } }),
    locale: 'pt-BR',
    // Sem movimento: as capturas saem estáveis e o teste não espera animação.
    reducedMotion: 'reduce',
  });
  // "Copiar link" usa navigator.clipboard: sem a permissão o toast nunca aparece no headless.
  await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    // Ruído conhecido: chaves de desenvolvimento do Clerk, CSS estrutural, Leaflet no Strict Mode.
    if (/development keys|Clerk has been loaded|structural CSS|Map container is already initialized/i.test(text)) return;
    consoleErrors.push(text.slice(0, 300));
  });
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${String(error).slice(0, 300)}`));
  await setupClerkTestingToken({ page });
  return { browser, context, page, consoleErrors, mobile };
}

/* ----------------------------------------------------------------- Clerk API */

async function clerkFetch(pathname, init = {}) {
  const response = await fetch(`${CLERK_API}${pathname}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const text = await response.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: response.ok, status: response.status, data };
}

/** Todos os usuários de teste deste roteiro que sobraram no Clerk. */
export async function listClerkTestUsers(prefix = 'e2e-') {
  const { data } = await clerkFetch(`/users?query=${encodeURIComponent(prefix)}&limit=100`);
  if (!Array.isArray(data)) return [];
  return data
    .map((user) => ({ id: user.id, email: user.email_addresses?.[0]?.email_address ?? '' }))
    .filter((user) => user.email.startsWith(prefix));
}

export async function deleteClerkUser(id) {
  return clerkFetch(`/users/${id}`, { method: 'DELETE' });
}

export async function deleteClerkUserByEmail(email) {
  const { data } = await clerkFetch(`/users?email_address=${encodeURIComponent(email)}`);
  if (!Array.isArray(data)) return null;
  for (const user of data) await deleteClerkUser(user.id);
  return data.length;
}

/* ------------------------------------------------------------- Auth no browser */

/** Cria a conta pelo formulário do Clerk em /criar-conta e confirma o código. */
export async function signUp(page, report, { email, password = PASSWORD }) {
  await page.goto(`${BASE}/criar-conta`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[name="emailAddress"]');
  await report.shot(page, 'criar-conta');
  await page.fill('input[name="emailAddress"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('.cl-formButtonPrimary');
  // Etapa do código: o input real é um só, invisível, esticado sobre as seis caixas.
  await page.waitForSelector('input[data-input-otp]', { timeout: 30000 });
  report.note(`etapa de código em ${new URL(page.url()).pathname}`);
  await report.shot(page, 'criar-conta-codigo');
  await page.focus('input[data-input-otp]');
  await page.keyboard.type(OTP, { delay: 40 });
  await page.waitForURL((url) => url.pathname.startsWith('/painel'), { timeout: 45000 });
  report.note(`depois do cadastro caiu em ${new URL(page.url()).pathname}`);
}

export async function signIn(page, report, { email, password = PASSWORD, next } = {}) {
  await page.goto(`${BASE}/entrar${next ? `?proximo=${encodeURIComponent(next)}` : ''}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[name="identifier"]');
  await page.fill('input[name="identifier"]', email);
  await page.click('.cl-formButtonPrimary');
  await page.waitForSelector('input[name="password"]', { timeout: 20000 });
  await page.fill('input[name="password"]', password);
  await page.click('.cl-formButtonPrimary');
  await page.waitForURL((url) => url.pathname.startsWith('/painel'), { timeout: 45000 });
  report.note(`depois do login caiu em ${new URL(page.url()).pathname}`);
}

/** Sai pelo menu do avatar (UserButton do Clerk). */
export async function signOut(page) {
  await page.click('.cl-userButtonTrigger');
  await page.click('.cl-userButtonPopoverActionButton__signOut');
  await page.waitForURL((url) => !url.pathname.startsWith('/painel'), { timeout: 30000 });
}

/* ------------------------------------------------------------------ helpers */

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Texto da(s) região(ões) de status/alerta visíveis — o retorno que o lojista lê. */
export async function visibleFeedback(page) {
  const texts = await page.$$eval('[role="alert"], [role="status"]', (els) =>
    els.filter((el) => el.checkVisibility?.() ?? true).map((el) => el.textContent.trim()).filter(Boolean),
  );
  return [...new Set(texts)];
}

/** Espera um texto aparecer no corpo da página (o retorno de um envio). */
export async function waitForText(page, pattern, timeout = 30000) {
  const source = pattern instanceof RegExp ? pattern.source : pattern;
  await page.waitForFunction((src) => new RegExp(src).test(document.body.innerText), source, { timeout });
}

/** Recolhe o guia flutuante, quando aberto, para ele não cobrir o que está embaixo. */
export async function collapseGuide(page) {
  const button = page.getByRole('button', { name: 'Recolher o guia de configuração' });
  if (await button.isVisible().catch(() => false)) { await button.click(); return true; }
  return false;
}

/** O ponto central do elemento está coberto por outro (o guia flutuante, por exemplo)? */
export async function coveredBy(locator) {
  return locator.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    if (!top || el.contains(top) || top.contains(el)) return null;
    const region = top.closest('[role="region"], [role="dialog"], header, nav');
    return (region?.getAttribute('aria-labelledby') && document.getElementById(region.getAttribute('aria-labelledby'))?.textContent.trim()) || top.tagName.toLowerCase();
  });
}

/** Espera o toast (região aria-live do painel) mostrar um texto. */
export async function waitForToast(page, text, timeout = 15000) {
  await page.waitForFunction(
    (expected) => Array.from(document.querySelectorAll('[role="status"]')).some((el) => el.textContent.includes(expected)),
    text,
    { timeout },
  );
}

/** Espera as fotos da tela terminarem de carregar (a foto do prato entra com fade e a captura sairia sem ela). */
export async function waitForImages(page, timeout = 10000) {
  await page.waitForFunction(() => Array.from(document.images).every((img) => img.complete), null, { timeout }).catch(() => {});
}

/** Intercepta a geocodificação (Nominatim) por um ponto fixo, salvo se pedirem o serviço real. */
export async function mockGeocode(page, point = { latitude: -23.5614, longitude: -46.6559, label: 'Rua Augusta, 1500, Consolação, São Paulo - SP' }) {
  if (process.env.E2E_REAL_GEOCODE) return;
  await page.route('**/api/geocodificar**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(point) }),
  );
}

/** Envia um arquivo pelo quadro de imagem (input[type=file] escondido) e espera o /img/<id>. */
export async function uploadImage(page, group, filePath, hiddenName, scope = page) {
  const input = group.locator('input[type="file"]');
  await input.setInputFiles(filePath);
  const hidden = scope.locator(`input[type="hidden"][name="${hiddenName}"]`).first();
  const handle = await hidden.elementHandle();
  await page.waitForFunction((el) => /^\/img\//.test(el.value), handle, { timeout: 30000 });
  return hidden.inputValue();
}
