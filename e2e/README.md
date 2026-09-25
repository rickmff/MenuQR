# Teste de ponta a ponta do painel do lojista

Percorre, num Chrome de verdade, tudo o que um dono de restaurante faz no Menu Online: cria a conta (Clerk), cadastra o restaurante, preenche Identidade / Contato / Horários / Endereço e entrega (com logo, capa, mapa, bairros, retirada e cobrança por distância), monta o cardápio (categorias, itens com foto, complementos dos três tipos, "Mais detalhes", edição inline, esgotado, renomear/mover/excluir), publica, confere prévia e loja pública (até o checkout com os bairros), sai e entra de novo, passa pelas telas no celular, troca o idioma e exclui a conta. Cada bloco também tenta o caminho errado (formulário vazio, endereço já em uso, WhatsApp inválido, horário pela metade, sem modo de entrega, item sem preço, publicar sem item disponível).

O resultado é um relatório com uma linha por passo, o que o lojista viu na tela e capturas: `report/e2e.md`, `report/e2e.json`, `report/shots/*.png`. Observações de UX detectadas pelo próprio roteiro saem marcadas com ⚑.

## Nunca contra o banco de produção

O `.env.local` deste repositório aponta para o Turso que a produção usa. O roteiro cria e apaga contas, restaurantes, fotos — **suba um servidor com banco local só para o teste**:

```bash
# 1) clone descartável do projeto (o Next recusa dois `next dev` na mesma pasta)
DEST=/tmp/menuqr-e2e && mkdir -p $DEST && cp -R src public scripts messages package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs $DEST/ && cp -Rc node_modules $DEST/node_modules
# 2) ambiente: chaves do Clerk (instância de desenvolvimento) + SQLite local + cobrança desligada
{ grep -E '^(NEXT_PUBLIC_CLERK_|CLERK_SECRET_KEY)' .env.local; echo NEXT_PUBLIC_DEMO_MODE=0; echo DATABASE_URL=file:./data/menuqr.db; echo BILLING_MODE=off; echo NEXT_PUBLIC_SITE_URL=http://localhost:3201; } > $DEST/.env.local
# 3) o restaurante de exemplo precisa existir (testa "endereço já em uso")
(cd $DEST && mkdir -p data && DATABASE_URL=file:./data/menuqr.db npm run db:seed)
# 4) sobe na 3201
(cd $DEST && npx next dev -p 3201)
```

Sem o dev server do repositório rodando, dá para pular o clone: `DATABASE_URL=file:./data/e2e.db BILLING_MODE=off NEXT_PUBLIC_SITE_URL=http://localhost:3201 npx next dev -p 3201` (e o seed com o mesmo `DATABASE_URL`).

## Rodar

```bash
cd e2e && npm ci                      # playwright + @clerk/testing; usa o Google Chrome instalado (channel 'chrome')
set -a; source ../.env.local; set +a  # NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY e CLERK_SECRET_KEY (instância de desenvolvimento)
node e2e.mjs                          # ~5 min; relatório em report/
```

Opções: `--headed` (Chrome visível), `--mobile` (roteiro inteiro a 390px), `--only=cadastro,comecar,...` (blocos), `--keep` (mantém a conta e imprime e-mail/senha), `--sweep` (apaga todos os usuários `e2e-*` do Clerk no fim). Variáveis: `E2E_BASE` (padrão `http://localhost:3201`), `E2E_REPORT_DIR`, `E2E_REAL_GEOCODE=1` (não intercepta a busca de endereço; por padrão o mapa recebe um ponto fixo em vez de bater no Nominatim).

Como o cadastro passa pelo captcha: `@clerk/testing` pede um token de teste com a `CLERK_SECRET_KEY` e o injeta nas chamadas do Clerk; o e-mail é `e2e-…+clerk_test@…` e o código de verificação é sempre `424242` (nada é enviado). No fim o roteiro exclui a conta pelo próprio painel (isso também testa a exclusão) e confere no Clerk.

## Ferramentas ao lado

- `bootstrap.mjs <rótulo> [--menu] [--publish]`: cria conta + restaurante (e um item com foto e complemento) e guarda a sessão em `sessions/<rótulo>.json`, para abrir o painel já logado em outro script.
- `cleanup.mjs`: apaga todos os usuários `e2e-*` da instância de desenvolvimento do Clerk.
- `lib/session.mjs`: sessão, relatório, login/cadastro, upload, toasts, mock do mapa.
- `EXPLORAR.md`: roteiro para quem for explorar o painel à mão a partir dessas peças.

O que o teste não cobre: assinatura/cobrança (`BILLING_MODE=off`), e-mail de verdade, arrastar e soltar a foto, HEIC, aparelho Android/iOS real.
