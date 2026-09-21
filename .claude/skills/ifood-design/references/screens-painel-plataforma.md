# Painel, landing e auth

Só a estrutura funcional do Portal do Parceiro e do site institucional do iFood é documentada publicamente; o visual aqui é **inferido** — os mesmos tokens e primitivos da loja aplicados a um produto de gestão. A decisão é restilizar, não redesenhar tela a tela: rotas, formulários, server actions e fluxo continuam iguais.

## 1. Painel — `/painel/*`

**Casca** (`painel/layout.tsx` e, no demo, `demo-shell.tsx`, que passa a usar o mesmo componente em vez de duplicar o header):

- Fundo `bg-gray-50`. Conteúdo em `Container`.
- Celular: `AppBar` com `Logo`, e à direita "Ver cardápio" (`IconButton` com `ExternalLink`, só quando publicado) e "Sair"; abaixo, `Tabs` com `href` — Visão geral, Cardápio, Dados do negócio.
- `lg:` barra lateral de 240px, branca, `border-r border-gray-200`, fixa: `Logo` no topo, itens com ícone e rótulo (`LayoutDashboard`, `Utensils`, `Store`); ativo `bg-primary-tint text-primary font-semibold rounded-sm`, inativo `text-gray-600 hover:bg-gray-50`; rodapé com o e-mail em `text-caption` e "Sair" com `LogOut`.
- O nome do negócio aparece no topo do conteúdo com `Tag` "Publicado" (positive) ou "Rascunho" (neutral).

**Conteúdo**:

- Blocos em `Card padding="md"` (`p-4 lg:p-6`), título `text-subtitle font-bold`, texto de apoio `text-body2 text-gray-600`.
- Visão geral: card do link público com `Button variant="secondary"` "Copiar link" (toast "Link copiado"), compartilhar e "Ver cardápio"; estatísticas em grade de cards (`text-h5 font-bold` + rótulo `text-caption text-gray-600`); card do QR com "Baixar QR"; checklist com `CircleCheck` em `text-positive` e `Circle` em `text-gray-400`.
- Formulários (`business-form`, `item-form`, `onboarding-form`): `TextField`, `TextArea`, `SelectField`, `CheckboxRow`; grupos em cards separados com título; a grade de horários e o editor de bairros mantêm a lógica e ganham `Switch`, `TextField` compactos e `IconButton` de remover (`Trash2`). Barra de salvar em `StickyBottomBar` com `Button` "Salvar alterações" `loading={pending}`. Sucesso e erro em `Banner`, não em parágrafo solto.
- **Cor da marca**: sai do fluxo principal e vai para uma seção "Avançado" recolhida (`<details>`), com o hint "Usada só no ícone do app instalado e na imagem de compartilhamento". A prévia de botões coloridos some — a loja é sempre vermelha.
- Campos de mídia: rótulos "Logo (URL da imagem ou emoji)" e "Foto (URL da imagem ou emoji)", com hint "Sem logo, mostramos as iniciais" / "Sem foto, a linha fica só com o texto".
- Cardápio (`category-manager`): cada categoria é um `Card`; itens em `ListRow` com miniatura de 40px (foto, emoji em tile `gray-100`, ou `ImageIcon`), nome, preço e `Tag` "Esgotado"; ações em `IconButton` (`Pencil`, `Trash2`, `ChevronUp`, `ChevronDown`); "Nova categoria" e "Novo item" em `Button variant="secondary" size="sm"` com `Plus`.
- Publicar: `Switch` + texto de estado, no lugar do botão que alterna rótulo.
- Prévia (`/painel/previa`): a loja dentro de uma moldura `rounded-lg border border-gray-200 overflow-hidden` via `<StoreFrame embedded>`, com `Tag` "Prévia".

## 2. Landing — `/`

Referência: site institucional do iFood — branco, muito respiro, vermelho escasso, CTAs pill.

- `site-header`: `AppBar` sticky branca com `Logo`; navegação em `Button variant="text" size="sm"`; "Entrar" em texto e "Criar conta" em `Button pill size="sm"`; no celular, `IconButton` com `Menu` abrindo um `BottomSheet` com os links.
- Hero sobre branco: título `text-h2 sm:text-h1 lg:text-display font-extrabold tracking-tight text-gray-700`, com no máximo uma palavra em `text-primary`; subtítulo `text-subtitle text-gray-600`; `Button pill size="lg"` "Criar meu cardápio" e `Button variant="text"` "Ver exemplo"; ao lado, o mock de celular mostrando a loja nova (bordas `rounded-xl`, `shadow-highest`).
- Seções alternando `bg-white` e `bg-gray-50`, `py-12 lg:py-16`, título `text-h4 lg:text-h3 font-bold`.
- Recursos: grade de `Card`s com ícone Lucide dentro de um círculo `bg-primary-tint text-primary` de 48px.
- Passos: círculo `bg-primary text-white` com o número, título e texto; sem linha conectora.
- Públicos: cards com ícone (`Beef`, `Soup`, `Coffee`, `Beer`).
- Planos: dois `Card`s; o destacado tem `border-2 border-primary` e `Tag tone="promo"` "Mais completo". Sem truque de borda em gradiente.
- FAQ: `<details>` com `ChevronDown` girando; divisores `border-b border-gray-200`.
- CTA final: bloco `bg-primary` com texto branco e botão branco de texto vermelho (o único lugar com fundo vermelho grande). Sem seção escura.
- `site-footer`: `bg-gray-50`, colunas de links em `text-body2 text-gray-600`, `Logo` e direitos em `text-caption`.
- Somem: fundo escuro, `glow-hero`, `grid-pattern`, `text-gradient`, blur, sombras coloridas, a fonte serifada.
- O conteúdo (textos, planos, FAQ) continua em `src/lib/platform.ts`. Os arrays que carregam ícone mudam para `src/components/platform/landing-content.tsx`, para o Lucide nunca entrar em `src/lib`.

## 3. Auth — `/entrar`, `/criar-conta`

- Página `bg-gray-50`, `Card` centrado `max-w-md p-6`, `Logo` acima.
- Título `text-h5 font-bold`, apoio `text-body2 text-gray-600`.
- `TextField`s, `Button fullWidth` "Entrar" / "Criar conta" com `loading`, erro em `Banner tone="error"`, link alternativo em `text-primary`.
- Em `/criar-conta`, o painel escuro de benefícios vira uma lista simples com `CircleCheck` em `text-positive` sobre branco, ao lado do formulário em `lg:`.

## 4. Páginas globais e metadados

- `not-found.tsx` e `error.tsx`: `EmptyState` (`SearchX` e `TriangleAlert`) com botões `primary` e `text`.
- Termos e privacidade: `max-w-narrow`, títulos `text-h4`/`text-h6`, corpo `text-body1 text-gray-600 leading-relaxed`, `Breadcrumbs`.
- `layout.tsx`: `themeColor: '#ea1d2c'`, `viewportFit: 'cover'`, skip link com `sr-only focus:not-sr-only` + `bg-gray-800 text-white rounded-sm`.
- `src/app/manifest.ts`: `background_color '#ffffff'`, `theme_color '#ea1d2c'`. `src/app/opengraph-image.tsx`: fundo vermelho chapado, sem gradiente.
- Por loja: `manifest.webmanifest` mantém `theme_color` da marca do restaurante e usa `background_color '#ffffff'`; `opengraph-image.tsx` mantém o fundo na cor da marca com o logo (emoji ou iniciais) — são os dois únicos lugares onde `brandColor` continua aparecendo.
