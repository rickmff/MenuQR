/**
 * Fotos do restaurante de exemplo, coladas à mão.
 *
 * Abre uma página local com a logo e cada prato do exemplo: um link pronto
 * para a busca no Google Imagens (foto grande, licença Creative Commons) e um
 * quadro onde se cola a foto escolhida — imagem copiada (Cmd+V), arquivo
 * arrastado ou o endereço da imagem. A foto é reduzida no navegador, gravada
 * em public/exemplo/ e o caminho vai para src/lib/demo/sample-menu.json, o
 * arquivo único do exemplo (modo demonstração e seed).
 *
 * Depois de colar, rode `npm run db:seed` para o banco receber as fotos.
 *
 * Uso: npm run fotos:exemplo  →  http://localhost:4321
 */
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const PORT = Number(process.env.PORT ?? 4321);
const JSON_PATH = "src/lib/demo/sample-menu.json";
const DIR = "public/exemplo";
const MAX_UPLOAD = 5 * 1024 * 1024;
const MAX_REMOTE = 20 * 1024 * 1024;

/** O que buscar para cada foto, e o emoji que volta se a foto for removida. */
const BUSCA = {
  logo: { busca: "ícone chama grelha hamburgueria", emoji: "🔥" },
  "demo-item-classic": {
    busca: "hambúrguer artesanal queijo alface tomate",
    emoji: "🍔",
  },
  "demo-item-cheddar": { busca: "hambúrguer cheddar bacon", emoji: "🥓" },
  "demo-item-costela": {
    busca: "hambúrguer costela desfiada barbecue",
    emoji: "🍖",
  },
  "demo-item-veggie": {
    busca: "hambúrguer vegetariano grão de bico beterraba",
    emoji: "🥬",
  },
  "demo-item-duplo": {
    busca: "hambúrguer duplo cheeseburger picles",
    emoji: "🍔",
  },
  "demo-item-frango": {
    busca: "sanduíche frango empanado crocante",
    emoji: "🍗",
  },
  "demo-item-combo-classic": {
    busca: "combo hambúrguer batata frita refrigerante",
    emoji: "🍟",
  },
  "demo-item-combo-duplo": {
    busca: "combo hambúrguer duplo batata frita bebida",
    emoji: "🥤",
  },
  "demo-item-combo-a-dois": {
    busca: "dois hambúrgueres batata frita para dividir",
    emoji: "🍽️",
  },
  "demo-item-fritas": {
    busca: "batata rústica com casca alecrim",
    emoji: "🍟",
  },
  "demo-item-onion": { busca: "anéis de cebola empanados", emoji: "🧅" },
  "demo-item-dadinho": {
    busca: "dadinho de tapioca geleia de pimenta",
    emoji: "🧀",
  },
  "demo-item-linguica": {
    busca: "linguiça na brasa farofa vinagrete",
    emoji: "🌭",
  },
  "demo-item-refri": { busca: "refrigerante lata copo com gelo", emoji: "🥤" },
  "demo-item-suco": { busca: "suco natural de fruta copo", emoji: "🍹" },
  "demo-item-limonada": { busca: "limonada suíça copo", emoji: "🍋" },
  "demo-item-cerveja": { busca: "cerveja artesanal copo", emoji: "🍺" },
  "demo-item-agua": { busca: "garrafa água mineral gelada", emoji: "💧" },
  "demo-item-brownie": { busca: "brownie com sorvete e calda", emoji: "🍫" },
  "demo-item-milkshake": { busca: "milkshake com chantili", emoji: "🍦" },
  "demo-item-pudim": { busca: "pudim de leite fatia calda", emoji: "🍮" },
};

/** A logo gerada no Canva em 2026-09-24: baixe por aqui e cole no quadro. */
const LOGO_CANVA = "https://www.canva.com/M/MAHWHBIuhok";

// ----------------------------------------------------------------- dados

const readSample = () => JSON.parse(readFileSync(JSON_PATH, "utf8"));
const writeSample = (data) =>
  writeFileSync(JSON_PATH, `${JSON.stringify(data, null, 2)}\n`);

/** Lista do que a página mostra, lida do JSON a cada pedido (outro editor pode ter mexido). */
function entries() {
  const { business, menu } = readSample();
  return [
    {
      id: "logo",
      group: "Logo",
      name: business.name,
      description:
        "Quadrada; aparece recortada num círculo ou quadrado de cantos redondos.",
      value: business.logo,
      square: true,
      extra: { label: "Logo gerada no Canva", href: LOGO_CANVA },
    },
    ...menu.flatMap((category) =>
      category.items.map((item) => ({
        id: item.id,
        group: category.name,
        name: item.name,
        description: item.description,
        value: item.image,
        square: false,
      })),
    ),
  ].map((entry) => ({ ...entry, busca: BUSCA[entry.id]?.busca ?? entry.name }));
}

/** Nome do arquivo: slug do prato + sufixo novo a cada troca, para nenhum cache servir a foto velha. */
function fileNameFor(id, data) {
  const item = data.menu.flatMap((c) => c.items).find((i) => i.id === id);
  const base = id === "logo" ? "logo" : item.slug;
  return `${base}-${randomBytes(3).toString("hex")}.jpg`;
}

/** Aplica o valor novo e devolve o antigo. */
function setValue(data, id, value) {
  if (id === "logo") {
    const old = data.business.logo;
    data.business.logo = value;
    return old;
  }
  for (const category of data.menu) {
    const item = category.items.find((i) => i.id === id);
    if (!item) continue;
    const old = item.image;
    item.image = value;
    // O texto alternativo do exemplo já descreve o prato; só preenche se faltar.
    if (value.startsWith("/") && !item.imageAlt) item.imageAlt = item.name;
    return old;
  }
  throw new Error(`Item desconhecido: ${id}`);
}

/** Apaga o arquivo antigo quando ele era uma foto deste script. */
function removeOld(value) {
  if (!/^\/exemplo\/[a-z0-9-]+\.jpg$/.test(value)) return;
  const path = join("public", value);
  if (existsSync(path)) unlinkSync(path);
}

function save(id, bytes) {
  const data = readSample();
  const file = fileNameFor(id, data);
  mkdirSync(DIR, { recursive: true });
  writeFileSync(join(DIR, file), bytes);
  const value = `/exemplo/${file}`;
  removeOld(setValue(data, id, value));
  writeSample(data);
  return value;
}

function restore(id) {
  const data = readSample();
  const emoji = BUSCA[id]?.emoji ?? "🍽️";
  removeOld(setValue(data, id, emoji));
  writeSample(data);
  return emoji;
}

// ----------------------------------------------------------------- servidor

async function readBody(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error("Arquivo grande demais.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

const isKnownId = (id) => typeof id === "string" && Object.hasOwn(BUSCA, id);

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(
    typeof body === "string" || Buffer.isBuffer(body)
      ? body
      : JSON.stringify(body),
  );
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const id = url.searchParams.get("id");
  try {
    if (req.method === "GET" && url.pathname === "/")
      return send(res, 200, PAGE, "text/html; charset=utf-8");
    if (req.method === "GET" && url.pathname === "/itens")
      return send(res, 200, entries());

    // Foto já gravada, para a prévia da página.
    if (
      req.method === "GET" &&
      /^\/exemplo\/[a-z0-9-]+\.jpg$/.test(url.pathname)
    ) {
      const path = join("public", url.pathname);
      return existsSync(path)
        ? send(res, 200, readFileSync(path), "image/jpeg")
        : send(res, 404, "não achei", "text/plain");
    }

    // Endereço colado: o navegador não baixa de outro domínio (CORS), o script baixa por ele.
    if (req.method === "GET" && url.pathname === "/baixar") {
      const target = url.searchParams.get("url") ?? "";
      if (!/^https?:\/\//i.test(target))
        return send(res, 400, { erro: "Cole um endereço http(s)." });
      const response = await fetch(target, {
        headers: { "User-Agent": "Mozilla/5.0 MenuOnline-fotos-exemplo" },
      });
      const type = response.headers.get("content-type") ?? "";
      if (!response.ok || !type.startsWith("image/")) {
        return send(res, 400, {
          erro: "Esse endereço não é de uma imagem. Use “Copiar endereço da imagem”.",
        });
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > MAX_REMOTE)
        return send(res, 400, { erro: "Imagem grande demais." });
      return send(res, 200, bytes, type);
    }

    if (req.method === "POST" && url.pathname === "/salvar" && isKnownId(id)) {
      const bytes = await readBody(req, MAX_UPLOAD);
      if (bytes[0] !== 0xff || bytes[1] !== 0xd8)
        return send(res, 400, { erro: "Esperava um JPEG." });
      return send(res, 200, { value: save(id, bytes) });
    }

    if (req.method === "POST" && url.pathname === "/remover" && isKnownId(id)) {
      return send(res, 200, { value: restore(id) });
    }

    send(res, 404, { erro: "Rota desconhecida." });
  } catch (error) {
    send(res, 500, {
      erro: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Fotos do exemplo: http://localhost:${PORT}`);
  console.log(
    `Grava em ${DIR}/ e em ${JSON_PATH}. Depois: npm run db:seed. Ctrl+C para sair.`,
  );
});

// ----------------------------------------------------------------- página

const PAGE = /* html */ `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fotos do exemplo</title>
<style>
  :root { color-scheme: light dark; --bg:#f6f7f6; --card:#fff; --line:#e3e6e3; --text:#1f2421; --muted:#667068; --green:#0b8639; --focus:#25d366; --warn:#b45309; }
  @media (prefers-color-scheme: dark) { :root { --bg:#111412; --card:#1b1f1c; --line:#2c322e; --text:#e8ece9; --muted:#9aa39c; --warn:#f59e0b; } }
  * { box-sizing: border-box; }
  body { margin:0; font:15px/1.45 system-ui, sans-serif; background:var(--bg); color:var(--text); }
  main { max-width: 960px; margin: 0 auto; padding: 24px 16px 64px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin: 32px 0 8px; }
  p.lead { color: var(--muted); margin: 0 0 8px; max-width: 70ch; }
  .progress { font-weight: 600; margin: 12px 0 0; }
  .card { display:grid; grid-template-columns: 1fr 200px; gap: 16px; background:var(--card); border:1px solid var(--line); border-radius:12px; padding:14px; margin-bottom:10px; }
  .name { font-weight:600; margin:0; }
  .desc { color:var(--muted); font-size:13px; margin:2px 0 10px; }
  .links { display:flex; flex-wrap:wrap; gap:8px; }
  .links a, button { font:inherit; font-size:13px; border-radius:999px; padding:6px 12px; text-decoration:none; cursor:pointer; }
  .links a.primary { background:var(--green); color:#fff; }
  .links a.ghost, button { background:transparent; color:var(--text); border:1px solid var(--line); }
  .drop { position:relative; aspect-ratio: 1; border:2px dashed var(--line); border-radius:10px; display:grid; place-items:center; text-align:center; font-size:12px; color:var(--muted); padding:8px; cursor:text; overflow:hidden; outline:none; }
  .drop:focus, .drop.over { border-color: var(--focus); border-style: solid; }
  .drop img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
  .drop .emoji { font-size: 56px; line-height: 1; display:block; margin-bottom: 6px; }
  .drop .busy { position:absolute; inset:0; display:grid; place-items:center; background:color-mix(in srgb, var(--card) 80%, transparent); font-weight:600; color:var(--text); }
  .status { font-size:12px; margin-top:8px; min-height: 1em; }
  .status.warn { color: var(--warn); }
  .row { display:flex; gap:8px; align-items:center; margin-top:10px; }
  @media (max-width: 560px) { .card { grid-template-columns: 1fr; } .drop { max-width: 220px; } }
</style>
</head>
<body>
<main>
  <h1>Fotos do restaurante de exemplo</h1>
  <p class="lead">Para cada prato: abra a busca, escolha uma foto <b>grande</b>, clique nela com o botão direito → <b>Copiar imagem</b>, clique no quadro ao lado e cole (Cmd+V). Também dá para arrastar um arquivo ou colar o endereço da imagem. Salva na hora em <code>public/exemplo/</code> e no <code>sample-menu.json</code>.</p>
  <p class="lead">A busca já vem filtrada por <b>licença Creative Commons</b>; confira a licença na página de origem antes de usar. O Pexels é outra opção de fotos com uso livre.</p>
  <p class="progress" id="progress"></p>
  <div id="list"></div>
</main>
<script>
const list = document.getElementById('list');
const progress = document.getElementById('progress');
const isPhoto = (v) => v.startsWith('/exemplo/');

const google = (q) => 'https://www.google.com/search?tbm=isch&tbs=isz:l,il:cl&q=' + encodeURIComponent(q);
const pexels = (q) => 'https://www.pexels.com/pt-br/procurar/' + encodeURIComponent(q) + '/';

let items = [];

async function load() {
  items = await (await fetch('/itens')).json();
  render();
}

function updateProgress() {
  const done = items.filter((i) => isPhoto(i.value)).length;
  progress.textContent = done + ' de ' + items.length + ' com foto';
}

function render() {
  list.innerHTML = '';
  let group = '';
  for (const item of items) {
    if (item.group !== group) {
      group = item.group;
      const h = document.createElement('h2');
      h.textContent = group;
      list.append(h);
    }
    list.append(card(item));
  }
  updateProgress();
}

function card(item) {
  const el = document.createElement('section');
  el.className = 'card';
  el.innerHTML = \`
    <div>
      <p class="name"></p>
      <p class="desc"></p>
      <div class="links">
        <a class="primary" target="_blank" rel="noopener">Buscar no Google Imagens</a>
        <a class="ghost pexels" target="_blank" rel="noopener">Pexels</a>
      </div>
      <div class="row"><button type="button" class="remove">Voltar ao emoji</button></div>
      <p class="status" role="status"></p>
    </div>
    <div class="drop" tabindex="0" aria-label="Colar foto"></div>\`;
  el.querySelector('.name').textContent = item.name;
  el.querySelector('.desc').textContent = item.description;
  el.querySelector('.primary').href = google(item.busca);
  el.querySelector('.pexels').href = pexels(item.busca);
  if (item.extra) {
    const a = document.createElement('a');
    a.className = 'ghost';
    a.target = '_blank';
    a.rel = 'noopener';
    a.href = item.extra.href;
    a.textContent = item.extra.label;
    el.querySelector('.links').append(a);
  }

  const drop = el.querySelector('.drop');
  const status = el.querySelector('.status');
  const remove = el.querySelector('.remove');

  const paint = () => {
    drop.innerHTML = '';
    remove.hidden = !isPhoto(item.value);
    if (isPhoto(item.value)) {
      const img = document.createElement('img');
      img.src = item.value;
      img.alt = '';
      drop.append(img);
    } else {
      drop.innerHTML = '<div><span class="emoji"></span>Clique aqui e cole<br>(Cmd+V) ou arraste</div>';
      drop.querySelector('.emoji').textContent = item.value;
    }
  };
  paint();

  const say = (text, warn = false) => { status.textContent = text; status.className = 'status' + (warn ? ' warn' : ''); };

  async function handle(blob) {
    const busy = document.createElement('div');
    busy.className = 'busy';
    busy.textContent = 'Salvando…';
    drop.append(busy);
    try {
      const { jpeg, width, height } = await reduce(blob, item.square);
      const response = await fetch('/salvar?id=' + encodeURIComponent(item.id), { method: 'POST', body: jpeg });
      const body = await response.json();
      if (!response.ok) throw new Error(body.erro);
      item.value = body.value;
      paint();
      updateProgress();
      const small = Math.min(width, height) < 700;
      say(small ? 'Salva, mas pequena (' + width + '×' + height + '). Abra a foto no site de origem e copie a versão grande.' : 'Salva: ' + width + '×' + height + '.', small);
    } catch (error) {
      busy.remove();
      say(error.message || 'Não deu para salvar.', true);
    }
  }

  async function fromText(text) {
    const url = text.trim();
    if (!/^https?:\\/\\//i.test(url)) return say('Cole uma imagem ou o endereço dela.', true);
    const response = await fetch('/baixar?url=' + encodeURIComponent(url));
    if (!response.ok) return say((await response.json()).erro, true);
    handle(await response.blob());
  }

  drop.addEventListener('paste', (event) => {
    event.preventDefault();
    const file = [...event.clipboardData.items].find((i) => i.type.startsWith('image/'))?.getAsFile();
    if (file) return handle(file);
    fromText(event.clipboardData.getData('text/plain'));
  });
  drop.addEventListener('dragover', (event) => { event.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (event) => {
    event.preventDefault();
    drop.classList.remove('over');
    const file = [...event.dataTransfer.files].find((f) => f.type.startsWith('image/'));
    if (file) return handle(file);
    fromText(event.dataTransfer.getData('text/uri-list') || event.dataTransfer.getData('text/plain'));
  });
  drop.addEventListener('click', () => drop.focus());

  remove.addEventListener('click', async () => {
    const response = await fetch('/remover?id=' + encodeURIComponent(item.id), { method: 'POST' });
    const body = await response.json();
    if (!response.ok) return say(body.erro, true);
    item.value = body.value;
    paint();
    updateProgress();
    say('Voltou ao emoji.');
  });

  return el;
}

/**
 * Reduz como o painel faz: prato até 1200 px no lado maior, sem cortar (a loja
 * recorta com object-cover); logo quadrada de 512 px, recortada no centro.
 */
async function reduce(blob, square) {
  const bitmap = await createImageBitmap(blob);
  let sx = 0, sy = 0, sw = bitmap.width, sh = bitmap.height, w, h;
  if (square) {
    const side = Math.min(sw, sh);
    sx = (sw - side) / 2; sy = (sh - side) / 2; sw = sh = side;
    w = h = Math.min(512, side);
  } else {
    const scale = Math.min(1, 1200 / Math.max(sw, sh));
    w = Math.round(sw * scale); h = Math.round(sh * scale);
  }
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h);
  const jpeg = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.84));
  return { jpeg, width: bitmap.width, height: bitmap.height };
}

load();
</script>
</body>
</html>`;
