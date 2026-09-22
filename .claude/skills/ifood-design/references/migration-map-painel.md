# Mapa de migração — painel, plataforma, demo e páginas globais

Re-skin mecânico: a estrutura das telas, as rotas, os formulários, as server actions, o `useActionState`, a validação zod e o fluxo continuam iguais. Troca-se classe legada por primitivo. O visual alvo está em `screens-painel-plataforma.md`.

Os números de linha referem-se ao commit `87aa474`; o código mudou depois dele, então confirme com `grep -n` pelo nome do símbolo antes de editar.

Ordem sugerida: casca do painel → formulários → landing → auth → shells do demo → páginas globais. Rode `node .claude/skills/ifood-design/scripts/audit-legacy.mjs --baseline` para ver os arquivos mais pesados primeiro.

## Painel

| Arquivo | Manter | Trocar |
|---|---|---|
| `src/app/painel/layout.tsx` | `requireUser`, `getBusinessByOwner`, `logoutAction`, o desvio para `DemoShell`, metadata `noindex` | header com blur e glifo → casca com `AppBar` + `Tabs` no celular e barra lateral em `lg`; extraia um `PanelShell` que o `demo-shell.tsx` também usa |
| `src/components/painel/dashboard-nav.tsx` | o array `navigation`, a regra de ativo (`pathname === href` para `/painel`, `startsWith` para o resto), `aria-current` | abas sublinhadas à mão → primitivo `Tabs` com `href`; em `lg`, os mesmos itens na barra lateral |
| `src/app/painel/page.tsx` | os dados, `CopyLink`, `ShareButton variant="button"`, `QrCode`, o checklist | `.surface` → `Card`; `font-display` some; marcadores de feito e pendente → `CircleCheck`/`Circle`; emojis de saudação saem |
| `src/components/painel/business-form.tsx` | `useActionState`, nomes dos campos, grade de horários, editor de bairros, validação `#rrggbb` | `Card` local (linhas 419-435) → primitivo; `Field` (437) e `inputClass` (466) → `TextField`; barra de salvar (412-414) → `StickyBottomBar`; alertas (78-87) → `Banner`; **cor da marca** (141-172) para uma seção "Avançado" sem a prévia de botões, removendo o uso de `readableOnLight` (linha 168) |
| `src/components/painel/item-form.tsx` | campos, editor de grupos e escolhas, server action | `Field` (407) e `inputClass` (436) → `TextField`/`TextArea`; checkboxes (261-269, 329-337) → `CheckboxRow`; alerta (155-159) → `Banner`; rótulo "Foto (URL da imagem ou emoji)" |
| `src/components/painel/category-manager.tsx` | reordenação, edição inline, ações de item, `PendingButton` com `useFormStatus` | cards → `Card`; linhas de item (157-203) → `ListRow` com miniatura via `isImageUrl()` (linha 159); setas em glifo → `IconButton` com `ChevronUp`/`ChevronDown`; inputs crus (251-284) → `TextField`. O campo de emoji da categoria **continua** (é dado do lojista). `window.confirm` (linha 59) pode ficar: trocá-lo por `ConfirmDialog` exige adiar o submit do form |
| `src/components/painel/onboarding-form.tsx` | slug ao vivo com prefixo de URL, server action | `inputClass` (138) → `TextField` com `prefix`; alerta (49-53) → `Banner` |
| `src/components/painel/publish-toggle.tsx` | a server action e o estado | botão que alterna rótulo → `Switch` + texto de estado |
| `src/components/painel/copy-link.tsx` | a cópia e o fallback | rótulo "Copiado!" → `toast('Link copiado')` + ícone `Copy` → `Check` |
| `src/components/painel/qr-code.tsx` | o SVG gerado no servidor | cor do QR de `#1c1815` para `#1a1a1a`; link de download → `Button variant="secondary"` |
| `src/app/painel/previa/page.tsx` | guardas e dados | composição manual (linhas 50-60) → `<StoreFrame embedded>`; selo "Prévia" → `Tag` |
| `src/app/painel/cardapio/page.tsx`, `negocio`, `comecar`, `cardapio/item/*` | tudo | títulos de página `text-h4 font-bold`; parágrafos de sucesso (`cardapio/page.tsx` linhas 45-52) → `Banner tone="success"` |

## Plataforma (landing, auth, institucional)

| Arquivo | Manter | Trocar |
|---|---|---|
| `src/app/(plataforma)/page.tsx` — **migrado** | a ordem das seções, os textos vindos de `src/lib/platform.ts`, âncoras e links | tudo que é visual, conforme `screens-painel-plataforma.md` seção 2: sai o hero escuro com `glow-hero`/`grid-pattern`/`text-gradient`, o truque de borda em gradiente dos planos, os emojis de público |
| `src/lib/platform.ts` — **migrado** | todos os textos, planos e FAQ | o emoji de cada recurso virou um `id`; os ícones ficam em `src/components/platform/landing-content.tsx` (`featureIcons`), para `lucide-react` não entrar em `src/lib` |
| `src/lib/demo/showcase.ts` — **migrado** | a seleção de itens do mock | `emoji: item.image` → `image`, mais `categories`, `description` e `bagTotal`; o mock usa `DishImage` |
| `src/components/platform/site-header.tsx` — **migrado** | sombra ao rolar, links, estado do menu | `AppBar` + `Logo`; painel do menu mobile → `BottomSheet`; glifos de menu e fechar → `Menu`/`X` |
| `src/components/platform/site-footer.tsx` — **migrado** | colunas e links; o `©` é texto e fica | fundo `bg-gray-50`, `Logo`, tipografia nova |
| `src/components/platform/auth-form.tsx` | é o formulário do modo demonstração; auth é do dono (D14) | só se ele pedir: `Field`/`inputClass` → `TextField`, alerta → `Banner` |
| `(auth)/entrar`, `(auth)/criar-conta` — **migrados** (2026-09-22) | redirects, `proximo`, props do Clerk | só o formulário, sem header/footer; ver `screens-painel-plataforma.md` §3 |
| `termos-de-uso`, `politica-de-privacidade` | texto e `Breadcrumbs` | `max-w-narrow`, escala tipográfica nova |

## Modo demonstração

| Arquivo | Trocar |
|---|---|
| `src/components/demo/demo-shell.tsx` | para de duplicar o header do painel: usa o mesmo `PanelShell`; o estado de carregamento (linhas 27-31) vira `Skeleton` |
| `src/components/demo/demo-pages.tsx` | 37 ocorrências legadas: mesmas trocas de `painel/page.tsx`; a prévia (linhas 350-360) vira `<StoreFrame embedded>`; o estado vazio (291-301) vira `EmptyState` |
| `src/components/demo/demo-store.tsx` | `StoreLoading` (15-17) → `StoreSkeleton`; o "não encontrado" (19-42) → `EmptyState` |
| `src/components/demo/demo-banner.tsx` | `Banner tone="info"` com `FlaskConical` |
| `src/components/demo/qr-code-client.tsx` | placeholder `animate-pulse` (linha 28) → `Skeleton` |

Lembrete: demo × banco é decidido no **build** (`next.config.ts`, `NEXT_PUBLIC_DEMO_MODE`). Cada checkpoint desta fase pede as duas execuções.

## Páginas globais e metadados

| Arquivo | Trocar |
|---|---|
| `src/app/layout.tsx` | feito na fase 1: só Inter, `themeColor: '#ea1d2c'`, `viewportFit: 'cover'`, skip link com `sr-only focus:not-sr-only` |
| `src/app/error.tsx`, `src/app/not-found.tsx` | `EmptyState` com `TriangleAlert` / `SearchX`; o numeral gigante em laranja some |
| `src/app/manifest.ts` | `background_color: '#ffffff'`, `theme_color: '#ea1d2c'` |
| `src/app/opengraph-image.tsx` | gradiente escuro → vermelho chapado; emoji decorativo sai |
| `src/app/icon.svg`, `apple-icon.png` | se carregarem o laranja antigo, redesenhar em `#ea1d2c` |
| `src/server/actions/business.ts`, `src/lib/demo/actions.ts`, `src/lib/share-link.ts` | opcional: o `brandColor` padrão (`#c2410c`, `#d3410a`) para `#ea1d2c`. Os padrões de emoji (logo e imagem) ficam: são dado |
| `README.md` | atualizar a descrição do visual, a nota sobre cor da marca e a frase que cita um teste automatizado de isolamento do carrinho que não existe no repositório |

## Fase 7 — o que apagar

- O bloco `LEGADO` inteiro de `globals.css` (aliases de tema, variáveis de `:root` e classes de componente).
- `readableOnLight` em `src/lib/colors.ts` (o resto do arquivo continua servindo manifest e OG).
- `src/components/store/opening-badge.tsx` e `src/components/store/cart-drawer.tsx`.
- `src/app/dev/` (a galeria de primitivos).
- `hasRequiredOptions` e `optionCount` continuam: o quick-add depende do primeiro.
- Por fim, em `package.json`: `"audit:legado": "node .claude/skills/ifood-design/scripts/audit-legacy.mjs"` e o encadeamento em `check`.
