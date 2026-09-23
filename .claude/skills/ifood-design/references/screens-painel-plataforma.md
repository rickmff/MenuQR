# Painel, landing e auth

Só a estrutura funcional do Portal do Parceiro e do site institucional do iFood é documentada publicamente; o visual aqui é **inferido** — os mesmos tokens e primitivos da loja aplicados a um produto de gestão. A decisão é restilizar, não redesenhar tela a tela: rotas, formulários, server actions e fluxo continuam iguais.

## 1. Painel — `/painel/*`

**Reorganizado em 2026-09-22 pela regra "uma tela, um objetivo" (D16).** Abas: **Compartilhar** (`/painel`, a raiz — link, QR e o estado de publicação, porque link e QR não funcionam sem publicar), **Cardápio**, **Dados do negócio** (seis sub-abas que salvam sozinhas via `updateBusinessSectionAction`, que mescla a seção com o cadastro gravado) e **Conta**. Saíram da visão geral: estatísticas, checklist de pendências e o botão duplicado de carregar o exemplo.

**Guia de configuração (2026-09-22), no formato do onboarding do Stripe.** `SetupWidget` flutua no canto inferior direito de *todas* as telas do painel — entra pelo slot `floating` do `PanelShell`, nunca dentro de uma tela, e por isso não disputa espaço com o objetivo de nenhuma delas. Sete passos: as seis sub-abas de negócio e o primeiro item do cardápio. **O progresso é derivado do que está gravado** (`setup-steps.ts`, módulo puro que roda nos dois modos), nunca de "visitei a aba": cada passo concluído mostra o que ficou gravado, e volta a ficar pendente se o dado sair. `contato` e `cardapio` levam a tag `Obrigatório` (espelham `publishBlocker`). Recolhe para uma pílula com anel de progresso (`localStorage`, via `setup-collapsed.ts` — preferência de quem olha, não dado do restaurante), some sozinho quando os sete terminam e se esconde no celular em `/painel/negocio`, onde cobriria a barra de "Salvar". Publicar não é passo dele: o botão já vive na tela de compartilhar. Enquanto o guia está aberto, `business-form` encadeia as abas com "Salvar e continuar".

**Layout padronizado em 2026-09-22** (`src/components/painel/panel-page.tsx` e `panel-shell.tsx`):

- **Duas larguras, e só duas**: `PanelPage width="wide"` (64rem, `--container-panel`) para as telas de leitura e de lista (compartilhar, cardápio, prévia) e `width="form"` (48rem, `--container-panel-form`) para as que são um formulário (dados do negócio, conta, item, cadastro do restaurante). Nada de `max-w-xl/2xl/3xl/4xl` solto na página.
- **Alinhamento à esquerda no desktop** (decisão do dono): a coluna não é centralizada, começa na mesma vertical do logo e das abas. Trocar de aba não desloca o conteúdo de lado.
- **Respiro**: `PANEL_GUTTER` (`py-6 lg:py-10`) entre a casca e o conteúdo, e 24px entre blocos — o `space-y-6` do próprio `PanelPage`, não `mt-6`/`mt-8` repetidos na página.
- **Cabeçalho**: `PanelHeader` (título `text-h4 font-bold text-gray-700`, apoio `text-body2 text-gray-600`, ação da tela à direita). Nenhuma página escreve o próprio `h1`.
- **Casca única**: `PanelShell` serve o painel com banco e o modo demonstração; muda só o que fica à direita da barra. Barra de 56px (`h-14`), `Container` para a coluna, `DashboardNav` no mesmo `Container` para as abas alinharem com o conteúdo.
- Atenção ao esconder um `Button` por breakpoint: sem `tailwind-merge`, `hidden` perde para o `inline-flex` do primitivo — esconda o invólucro.

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
- **Cardápio em uma tela (2026-09-23, `menu-editor.tsx`, a partir do protótipo "Cardápio em uma tela")**: cada categoria é um `Card padding="none"`; o nome no cabeçalho é um botão que abre a renomeação inline (nome + descrição); a contagem ao lado; o `Menu` "⋯" (`ui/menu.tsx`, Radix) traz Renomear, Mover para cima/baixo e Excluir categoria (com `ConfirmDialog`). Linhas de item com `DishImage` de 40px, nome (+ `Tag` "Esgotado"), preço e número de complementos, `Switch` de disponível e `ChevronDown`; tocar na linha abre o `ItemForm inline` **no lugar dela** (nome em foco, Esc fecha). "Adicionar item" é uma linha fantasma no fim do card; "Nova categoria" um botão tracejado no fim da página; cardápio vazio mostra `EmptyState`. Salvar, excluir e renomear respondem com `useToast` (o `ToastProvider` vive no `PanelShell`), sem sair da página: `saveItemAction` devolve `{ success }`, e a `revalidateStore` já traz a lista nova. Sem emoji de categoria (decisão do dono). As rotas `/painel/cardapio/item[/id]` continuam para links antigos, com o mesmo `ItemForm` em página própria.
- Item (`item-form.tsx`, 2026-09-23): `ImageUpload` (quadro com lápis e lixeira sobre a foto, sem rótulo) à esquerda; Nome e Preço na mesma linha; Descrição; duas seções `<details>` recolhidas com resumo — Complementos e "Mais detalhes" (categoria, serve, etiquetas, alérgenos, calorias, texto alternativo); rodapé `sticky` com "Excluir item" à esquerda e Cancelar + ação principal ("Adicionar ao cardápio" / "Salvar") à direita. Disponível é o `Switch` da linha, não um campo.
- Publicar: `Switch` + texto de estado, no lugar do botão que alterna rótulo.
- Prévia (`/painel/previa`): a loja dentro de uma moldura `rounded-lg border border-gray-200 overflow-hidden` via `<StoreFrame embedded>`, com `Tag` "Prévia".

## 2. Landing — `/`

**Refeita em 2026-09-22 por um brief próprio ("mostrar, não descrever").** Estrutura atual, cada seção com uma assinatura: hero com o produto rodando sozinho (`HeroDemo`: `StoreProvider` com id isolado, `ItemCard`/`CartBar`/`StoreHeader` reais, cursor falso, mensagem real de `buildOrderMessage`); "Como funciona" em scrollytelling (`HowItWorks`: painel fixo que morfa em 3 estados, QR real gerado no servidor); capacidades **listadas** (grade de seis linhas de texto, numeradas, com divisor em cima — os demos interativos `DemoOptions`/`DemoDelivery`/`DemoHours` foram apagados em 2026-09-22 a pedido do dono: a página já mostra o produto rodando duas vezes antes); **preço** (`#preco`, bloco `gray-50`): um `Card highlight` só, faixa vermelha "Plano único", R$ 49/mês na assinatura anual, cinco linhas com `Check` e o CTA — não há grátis nem teste, e um plano não é uma escolha, é a condição; CTA final; rodapé em colunas. Sem FAQ (schema removido) e sem estatísticas inventadas. O conteúdo de texto (`capabilities`, `pricing`) vive em `src/lib/platform.ts`. Animação: `motion` (só na landing), curva `[0.16,1,0.3,1]`, springs 350/30, reveals uma vez ao entrar, tudo com `useReducedMotion`. Título com `animate-word-in` (CSS puro, não atrasa o LCP). O que segue abaixo é a referência anterior, ainda válida como princípios de tom.

**Verde e WhatsApp (2026-09-22, depois de tudo abaixo).** A palavra "WhatsApp" do hero leva o glifo (`WhatsAppGlyph` dentro da máscara do `WordReveal`, em `currentColor`). A seção "Como funciona" usa `wallpaper` (bege `chat-bg` + `public/landing/doodle.svg` a 7%, derivando na diagonal em 75s), e o conteúdo fica em cartões brancos por cima. Preço e rodapé **não** usam: ver abaixo. Ilustrações de linha em `landing/illustrations.tsx`: um ícone por capacidade (`capabilityIcons`, chave = `label`), o cavalete com QR ao lado do título de Capacidades. O bloco verde do CTA usa `wallpaper-light` (o mesmo rabisco em branco).

**CTA final e rodapé (2026-09-22).** O CTA é o bloco previsto aqui, agora desenhado como um QR code: `rounded-xl bg-primary`, rabisco em branco por baixo e os três olhos de leitura nos cantos em branco a 14% — decoração `aria-hidden`, nunca informação. Dentro dele só o título e o botão branco (`MagneticCta variant="secondary"`, que ganhou a prop e o brilho vermelho correspondente); a linha de provas em `font-mono` fica **fora** do bloco, em `gray-600`, porque texto de 12px em branco sobre `primary` fica no limite do contraste. O rodapé virou quatro colunas (marca e contato + Produto, Conta, Legal; duas colunas no celular), barra inferior com direitos, e o nome da plataforma como letreiro (`text-gray-200` sobre `bg-gray-50`), cortado pela base. O rodapé perdeu o papel de parede em 2026-09-22: rabisco e letreiro se sobrepunham e nenhum dos dois se lia. Regra que fica: **uma textura por superfície** — no rodapé, a que carrega o nome — `aria-hidden`, com `pb-[clamp(...)]` reservando o espaço para ele não passar por cima de texto algum.

Referência: site institucional do iFood — branco, muito respiro, vermelho escasso, CTAs pill.

- `site-header`: barra sticky com `Logo`; navegação em `Button variant="text" size="sm"`; "Entrar" em texto e "Criar conta" em `Button pill size="sm"`; no celular, `IconButton` com `Menu` abrindo um `BottomSheet` com os links.
- **Vidro, sem borda (2026-09-22).** O `<header>` não tem fundo nem `border-b`. Quem tem é uma camada `aria-hidden` irmã, `absolute inset-x-0 top-0 -bottom-8`, com `backdrop-blur-xl`, `bg-white/55` (`/70` ao rolar) e uma máscara `linear-gradient(to bottom, #000 0, #000 62%, transparent)` nas duas grafias (com e sem `-webkit-`). Ela desce 2rem além da barra, então o desfoque termina em nada e a página some por baixo sem linha alguma; o conteúdo fica na faixa 100% opaca, acima da máscara. `scrolled` deixou de comandar a borda e passou a comandar a densidade do vidro e a altura.
- Este é o **único** `backdrop-blur` da plataforma — a auditoria o lista como *smell*, e aqui é intencional. A app bar da loja continua sem desfoque: ver `screens-cliente.md`.
- Hero sobre branco: título `text-h2 sm:text-h1 lg:text-display font-extrabold tracking-tight text-gray-700`, com no máximo uma palavra em `text-primary`; subtítulo `text-subtitle text-gray-600`; `Button pill size="lg"` "Criar meu cardápio" e `Button variant="text"` "Ver exemplo"; ao lado, o mock de celular mostrando a loja nova (bordas `rounded-xl`, `shadow-highest`).
- Seções alternando `bg-white` e `bg-gray-50`, `py-12 lg:py-16`, título `text-h4 lg:text-h3 font-bold`.
- Recursos: grade de `Card`s com ícone Lucide dentro de um círculo `bg-primary-tint text-primary` de 48px.
- Passos: círculo `bg-primary text-white` com o número, título e texto; sem linha conectora.
- Públicos: cards com ícone (`Beef`, `Soup`, `Coffee`, `Beer`).
- Planos: dois `Card`s; o destacado tem `border-2 border-primary` e `Tag tone="promo"` "Mais completo". Sem truque de borda em gradiente.
- FAQ: `<details>` com `ChevronDown` girando; divisores `border-b border-gray-200`.
- CTA final: bloco `bg-primary` com texto branco e botão branco de texto verde (o único lugar com fundo verde grande). Sem seção escura.
- `site-footer`: `bg-gray-50`, colunas de links em `text-body2 text-gray-600`, `Logo` e direitos em `text-caption`.
- Somem: fundo escuro, `glow-hero`, `grid-pattern`, `text-gradient`, blur, sombras coloridas, a fonte serifada.
- O conteúdo (textos, capacidades, preço, FAQ) continua em `src/lib/platform.ts` — a lista `plans`/`Plan` saiu em 2026-09-22, substituída por `pricing` (plano único). Cada recurso tem um `id`, e `src/components/platform/landing-content.tsx` guarda `featureIcons: Record<FeatureId, LucideIcon>` — o `tsc` acusa recurso novo sem ícone, e o Lucide nunca entra em `src/lib`. Os públicos (`audiences`), que só existem na landing, moram inteiros nesse arquivo.
- **Feito em 2026-09-21**: `(plataforma)/page.tsx`, `site-header.tsx` e `site-footer.tsx` já seguem esta seção; use-os como referência viva para as páginas institucionais. Em 2026-09-22 a landing perdeu o selo "0% de comissão" e a faixa de reforço (repetiam as estatísticas do hero): uma informação, um lugar.

## 3. Auth — `/entrar`, `/criar-conta` (feito em 2026-09-22)

**Só o formulário.** As duas rotas vivem no grupo `src/app/(auth)/`, cujo `layout.tsx` não tem `SiteHeader` nem `SiteFooter`: a marca (`Logo`, link para `/`) em cima, o formulário centralizado, nada mais. Sem eyebrow, sem título de venda, sem painel de benefícios, sem estatísticas. Em `/criar-conta` fica uma única linha de rodapé com os links de termos e privacidade.

- Com Clerk (produção): `<SignIn />` / `<SignUp />` sem invólucro. O visual vem do `appearance` do `ClerkProvider` em `src/app/layout.tsx`: sem card (`options.elevation: 'flush'`; ele também remove o padding interno, então não acrescente borda — o formulário assenta direto na página), sem logo próprio (`options.logoPlacement: 'none'`), sem subtítulo de boas-vindas (`elements.headerSubtitle: { display: 'none' }`), cores e raio dos tokens. Nomes do Clerk 7: `colorForeground`, `colorMutedForeground`, `colorBorder`, `colorInput`; a chave é `options`, não `layout`.
- **Três armadilhas do `appearance`, todas custaram uma regressão (2026-09-22):**
  1. **O Clerk desenha a borda dos campos e do botão de provedor com `box-shadow`, não com `border`.** `boxShadow: 'none !important'` para tirar o anel difuso apaga a borda junto e os campos somem da tela. A borda tem de ser reposta como `border: '1px solid … !important'`.
  2. **`border-color` com `!important` trava o estado de erro.** O campo recusado (`aria-invalid="true"`, classe `cl-error`) continua cinza. Reponha o vermelho depois da regra de foco, na mesma especificidade — é a ordem que decide.
  3. **O foco de teclado dos botões também é `box-shadow`.** Zerado ele, `Tab` não mostra mais nada. Reponha com `outline: 2px solid` + `outlineOffset: 2px` em `&:focus-visible`.
- `elements.rootBox` precisa de `width: '100%'`: o padrão do Clerk é `fit-content` e o formulário encolhe até a metade da coluna, cortando o texto dos campos. `cardBox` sozinho não resolve.
- O pacote `@clerk/localizations` pt-BR tem buracos — `formFieldInputPlaceholder__signUpPassword` cai no inglês ("Create a password"). O `localization` espalha o `ptBR` e sobrescreve o que falta; o rótulo e o exemplo do e-mail repetem os de `platform/auth-form.tsx`, para os dois modos falarem igual.
- No modo demonstração: `Card padding="lg"` com `h1` `text-h6 font-bold` ("Entrar" / "Criar conta") e o `AuthForm` existente.
- Lógica (redirect de quem já está logado, `proximo`, URLs de retorno) é do dono e fica como está.

## 4. Páginas globais e metadados

- `not-found.tsx` e `error.tsx`: `EmptyState` (`SearchX` e `TriangleAlert`) com botões `primary` e `text`.
- Termos e privacidade: `max-w-narrow`, títulos `text-h4`/`text-h6`, corpo `text-body1 text-gray-600 leading-relaxed`, `Breadcrumbs`.
- `layout.tsx`: `themeColor: '#cf1a27'`, `viewportFit: 'cover'`, skip link com `sr-only focus:not-sr-only` + `bg-gray-800 text-white rounded-sm`.
- `src/app/manifest.ts`: `background_color '#ffffff'`, `theme_color '#cf1a27'`. `src/app/opengraph-image.tsx`: fundo vermelho chapado, sem gradiente.
- Por loja: `manifest.webmanifest` mantém `theme_color` da marca do restaurante e usa `background_color '#ffffff'`; `opengraph-image.tsx` mantém o fundo na cor da marca com o logo (emoji ou iniciais) — são os dois únicos lugares onde `brandColor` continua aparecendo.
