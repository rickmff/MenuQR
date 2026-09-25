# Kit de exploração do painel do Menu Online (para os agentes avaliadores)

Servidor de teste: **http://localhost:3201** (clone do projeto com SQLite local — pode criar/apagar à vontade; NÃO use localhost:3000, que é o servidor do dono contra o banco de produção).

Código-fonte do clone (idêntico à `main`): `../app/src` (o repositório real é `/Users/henriquefaria/Documents/code/MenuQR`, só leitura).

## Já pronto para ler
- `../report/e2e.json` e `../report/e2e.md`: o roteiro completo passo a passo, com o que o lojista viu em cada tela (notas) e as capturas em `../report/shots/*.png` (abra com a ferramenta de leitura de imagem).
- `../report/run2.log`: saída do roteiro.

## Para explorar no navegador por conta própria
Todos os comandos rodam de dentro de `pw/` com as chaves do Clerk no ambiente:

```bash
cd /Users/henriquefaria/Documents/code/MenuQR && set -a; source .env.local; set +a
cd <scratchpad>/pw
node bootstrap.mjs <seu-rotulo> [--menu] [--publish]   # cria conta + restaurante; imprime JSON com email, slug e o arquivo storageState
```

Depois, um script seu (ESM, na pasta `pw/`):

```js
import { chromium, devices } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ storageState: '<storageState do JSON>', viewport: { width: 1280, height: 900 }, locale: 'pt-BR' });
// celular: { ...devices['iPhone 13'], storageState }
const page = await context.newPage();
await page.goto('http://localhost:3201/painel/cardapio', { waitUntil: 'networkidle' });
await page.screenshot({ path: 'minha-captura.png', fullPage: true });
```

Helpers em `lib/session.mjs`: `collapseGuide(page)` (recolhe o guia flutuante), `uploadImage(page, group, file, hiddenName, scope)`, `waitForToast(page, texto)`, `visibleFeedback(page)`, `mockGeocode(page)` (o mapa procura endereço num serviço externo; o mock devolve um ponto fixo).
Fotos de exemplo: `../app/public/exemplo/*.jpg`.
Se precisar de uma conta nova sem passar pelo cadastro, `bootstrap.mjs` já faz tudo. Não apague contas alheias; `node cleanup.mjs` apaga TODOS os usuários de teste do Clerk — só rode no fim, se for o dono da rodada.

## Regras de avaliação
- A fonte das decisões de design já tomadas pelo dono é `/Users/henriquefaria/Documents/code/MenuQR/.claude/skills/ifood-design/SKILL.md` (tabela D1–D31) e `references/screens-painel-plataforma.md`. O que contraria uma decisão registrada não é "defeito": registre como "conflita com Dx" e diga se vale reabrir.
- Evidência sempre: captura (caminho), ou arquivo:linha do código, ou nota do relatório.
- Escreva em pt-BR.
