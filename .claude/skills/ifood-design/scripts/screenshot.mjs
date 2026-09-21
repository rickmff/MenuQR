#!/usr/bin/env node
/**
 * Screenshot de verificação (skill ifood-design) — Chrome headless via DevTools
 * Protocol, sem dependências. Existe porque o repositório não tem Playwright e
 * porque `chrome --screenshot --window-size=390,...` NÃO emula celular: no macOS
 * a janela mínima tem ~500px e a captura sai cortada.
 *
 *   node .claude/skills/ifood-design/scripts/screenshot.mjs http://localhost:3000/r/sabor-e-brasa
 *   node .../screenshot.mjs <url> --out /tmp/loja.png --full          página inteira
 *   node .../screenshot.mjs <url> --desktop                           1280x800, sem emulação de toque
 *   node .../screenshot.mjs <url> --width 375 --height 812
 *   node .../screenshot.mjs <url> --click '[aria-label^="Abrir sacola"]'   clica antes de capturar
 *   node .../screenshot.mjs <url> --reduced-motion                    emula prefers-reduced-motion
 *   node .../screenshot.mjs <url> --wait 2500                         espera extra (ms) após o load
 *
 * Em --full, elementos `fixed` (barra da sacola, toast) aparecem na altura da primeira
 * dobra, no meio da imagem: é efeito da captura, não bug de layout.
 *
 * Depois, abra o PNG com a ferramenta de leitura de imagem e OLHE o resultado.
 * Requer Node >= 22 (WebSocket nativo) e Chrome/Chromium instalado
 * (ou a variável CHROME_PATH apontando para o binário).
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const options = { width: 390, height: 844, scale: 2, mobile: true, full: false, wait: 1200, out: '', click: '', reducedMotion: false };
let url = '';

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  const next = () => {
    index += 1;
    if (args[index] === undefined) fail(`${arg} precisa de um valor`);
    return args[index];
  };
  if (arg === '--out') options.out = next();
  else if (arg === '--width') options.width = Number(next());
  else if (arg === '--height') options.height = Number(next());
  else if (arg === '--wait') options.wait = Number(next());
  else if (arg === '--click') options.click = next();
  else if (arg === '--full') options.full = true;
  else if (arg === '--reduced-motion') options.reducedMotion = true;
  else if (arg === '--desktop') Object.assign(options, { width: 1280, height: 800, scale: 1, mobile: false });
  else if (arg.startsWith('--')) fail(`opção desconhecida: ${arg}`);
  else url = arg;
}

function fail(message) {
  console.error(`screenshot: ${message}`);
  process.exit(2);
}

if (!url) fail('informe a URL. Ex.: screenshot.mjs http://localhost:3000/r/sabor-e-brasa');
if (typeof WebSocket === 'undefined') fail('precisa de Node >= 22 (WebSocket nativo).');
if (![options.width, options.height, options.wait].every(Number.isFinite)) fail('--width, --height e --wait precisam ser números');

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);
const chromePath = CANDIDATES.find((candidate) => existsSync(candidate));
if (!chromePath) fail('Chrome não encontrado. Defina CHROME_PATH com o caminho do binário.');

const out = resolve(options.out || join(tmpdir(), `menuqr-${Date.now()}.png`));
const profile = mkdtempSync(join(tmpdir(), 'menuqr-shot-'));

const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-extensions',
    '--disable-sync',
    '--disable-component-update',
    '--hide-scrollbars',
    '--disable-gpu',
    'about:blank',
  ],
  { stdio: ['ignore', 'ignore', 'pipe'] },
);

let finished = false;
function cleanup(code) {
  if (finished) return;
  finished = true;
  try {
    chrome.kill('SIGKILL');
  } catch {
    // já encerrou
  }
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    // o Chrome pode segurar arquivos por um instante; o SO limpa o tmp
  }
  process.exit(code);
}

const watchdog = setTimeout(() => {
  console.error('screenshot: tempo esgotado (45s). O servidor está no ar?');
  cleanup(1);
}, 45000);

/** O Chrome anuncia o endpoint no stderr: "DevTools listening on ws://…". */
const endpoint = await new Promise((resolveEndpoint, reject) => {
  let buffer = '';
  chrome.stderr.on('data', (chunk) => {
    buffer += chunk.toString();
    const match = buffer.match(/DevTools listening on (ws:\/\/\S+)/);
    if (match) resolveEndpoint(match[1]);
  });
  chrome.on('exit', () => reject(new Error('o Chrome encerrou antes de abrir o DevTools')));
}).catch((error) => {
  console.error(`screenshot: ${error.message}`);
  cleanup(1);
});

const socket = new WebSocket(endpoint);
await new Promise((ready, reject) => {
  socket.addEventListener('open', ready, { once: true });
  socket.addEventListener('error', () => reject(new Error('falha ao conectar no DevTools')), { once: true });
}).catch((error) => {
  console.error(`screenshot: ${error.message}`);
  cleanup(1);
});

let nextId = 0;
const pending = new Map();
const listeners = new Map();

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id !== undefined && pending.has(message.id)) {
    const { resolve: done, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else done(message.result);
  } else if (message.method && listeners.has(message.method)) {
    for (const listener of listeners.get(message.method)) listener(message.params);
    listeners.delete(message.method);
  }
});

function send(method, params = {}, sessionId) {
  nextId += 1;
  const id = nextId;
  socket.send(JSON.stringify({ id, method, params, sessionId }));
  return new Promise((done, reject) => pending.set(id, { resolve: done, reject }));
}

const once = (method) =>
  new Promise((done) => listeners.set(method, [...(listeners.get(method) ?? []), done]));
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

try {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const page = (method, params) => send(method, params, sessionId);

  await page('Page.enable');
  await page('Emulation.setDeviceMetricsOverride', {
    width: options.width,
    height: options.height,
    deviceScaleFactor: options.scale,
    mobile: options.mobile,
  });
  if (options.mobile) await page('Emulation.setTouchEmulationEnabled', { enabled: true });
  if (options.reducedMotion) {
    await page('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  }

  const loaded = once('Page.loadEventFired');
  const navigation = await page('Page.navigate', { url });
  if (navigation.errorText) throw new Error(`não abriu ${url}: ${navigation.errorText}`);
  await loaded;
  await sleep(options.wait);

  if (options.click) {
    const { result } = await page('Runtime.evaluate', {
      expression: `(() => { const el = document.querySelector(${JSON.stringify(options.click)}); if (!el) return false; el.click(); return true; })()`,
      returnByValue: true,
    });
    if (!result.value) throw new Error(`--click não encontrou: ${options.click}`);
    await sleep(700);
  }

  const capture = { format: 'png' };
  if (options.full) {
    const { cssContentSize } = await page('Page.getLayoutMetrics');
    capture.captureBeyondViewport = true;
    capture.clip = { x: 0, y: 0, width: cssContentSize.width, height: Math.min(cssContentSize.height, 8000), scale: 1 };
  }
  const { data } = await page('Page.captureScreenshot', capture);
  writeFileSync(out, Buffer.from(data, 'base64'));

  const overflow = await page('Runtime.evaluate', {
    expression: 'document.documentElement.scrollWidth - document.documentElement.clientWidth',
    returnByValue: true,
  });
  console.log(out);
  console.log(`${options.width}x${options.height}${options.mobile ? ' (celular)' : ' (desktop)'}${options.full ? ', página inteira' : ''}`);
  if (overflow.result.value > 0) {
    console.log(`ATENÇÃO: a página estoura ${overflow.result.value}px na horizontal — algo está mais largo que a tela.`);
  }
  clearTimeout(watchdog);
  cleanup(0);
} catch (error) {
  console.error(`screenshot: ${error.message}`);
  clearTimeout(watchdog);
  cleanup(1);
}
