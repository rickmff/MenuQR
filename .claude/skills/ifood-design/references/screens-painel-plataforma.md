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

**Refeita em 2026-09-22 por um brief próprio ("mostrar, não descrever").** Estrutura atual, cada seção com uma assinatura: hero com o produto rodando sozinho (`HeroDemo`: `StoreProvider` com id isolado, `ItemCard`/`CartBar`/`StoreHeader` reais, cursor falso, mensagem real de `buildOrderMessage`); "Como funciona" em scrollytelling (`HowItWorks`: painel fixo que morfa em 3 estados, QR real gerado no servidor); três capacidades interativas (`DemoOptions` com `OptionGroup` real, `DemoDelivery` com `calculateDeliveryFee`, `DemoHours` com `getOpeningStatus`); CTA magnético; rodapé de uma linha. Sem preço (não há plano grátis; volta com a cobrança), sem FAQ (schema removido), sem estatísticas inventadas. Animação: `motion` (só na landing), curva `[0.16,1,0.3,1]`, springs 350/30, reveals uma vez ao entrar, tudo com `useReducedMotion`. Título com `animate-word-in` (CSS puro, não atrasa o LCP). O que segue abaixo é a referência anterior, ainda válida como princípios de tom.

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
- O conteúdo (textos, planos, FAQ) continua em `src/lib/platform.ts`. Cada recurso tem um `id`, e `src/components/platform/landing-content.tsx` guarda `featureIcons: Record<FeatureId, LucideIcon>` — o `tsc` acusa recurso novo sem ícone, e o Lucide nunca entra em `src/lib`. Os públicos (`audiences`), que só existem na landing, moram inteiros nesse arquivo.
- **Feito em 2026-09-21**: `(plataforma)/page.tsx`, `site-header.tsx` e `site-footer.tsx` já seguem esta seção; use-os como referência viva para as páginas institucionais. Em 2026-09-22 a landing perdeu o selo "0% de comissão" e a faixa de reforço (repetiam as estatísticas do hero): uma informação, um lugar.

## 3. Auth — `/entrar`, `/criar-conta` (feito em 2026-09-22)

**Só o formulário.** As duas rotas vivem no grupo `src/app/(auth)/`, cujo `layout.tsx` não tem `SiteHeader` nem `SiteFooter`: a marca (`Logo`, link para `/`) em cima, o formulário centralizado, nada mais. Sem eyebrow, sem título de venda, sem painel de benefícios, sem estatísticas. Em `/criar-conta` fica uma única linha de rodapé com os links de termos e privacidade.

- Com Clerk (produção): `<SignIn />` / `<SignUp />` sem invólucro. O visual vem do `appearance` do `ClerkProvider` em `src/app/layout.tsx`: sem card (`options.elevation: 'flush'`; ele também remove o padding interno, então não acrescente borda — o formulário assenta direto na página), sem logo próprio (`options.logoPlacement: 'none'`), sem subtítulo de boas-vindas (`elements.headerSubtitle: { display: 'none' }`), cores e raio dos tokens. Nomes do Clerk 7: `colorForeground`, `colorMutedForeground`, `colorBorder`, `colorInput`; a chave é `options`, não `layout`.
- No modo demonstração: `Card padding="lg"` com `h1` `text-h6 font-bold` ("Entrar" / "Criar conta") e o `AuthForm` existente.
- Lógica (redirect de quem já está logado, `proximo`, URLs de retorno) é do dono e fica como está.

## 4. Páginas globais e metadados

- `not-found.tsx` e `error.tsx`: `EmptyState` (`SearchX` e `TriangleAlert`) com botões `primary` e `text`.
- Termos e privacidade: `max-w-narrow`, títulos `text-h4`/`text-h6`, corpo `text-body1 text-gray-600 leading-relaxed`, `Breadcrumbs`.
- `layout.tsx`: `themeColor: '#ea1d2c'`, `viewportFit: 'cover'`, skip link com `sr-only focus:not-sr-only` + `bg-gray-800 text-white rounded-sm`.
- `src/app/manifest.ts`: `background_color '#ffffff'`, `theme_color '#ea1d2c'`. `src/app/opengraph-image.tsx`: fundo vermelho chapado, sem gradiente.
- Por loja: `manifest.webmanifest` mantém `theme_color` da marca do restaurante e usa `background_color '#ffffff'`; `opengraph-image.tsx` mantém o fundo na cor da marca com o logo (emoji ou iniciais) — são os dois únicos lugares onde `brandColor` continua aparecendo.
