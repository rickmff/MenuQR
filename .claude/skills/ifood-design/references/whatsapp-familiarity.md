# Familiaridade com o WhatsApp

## Sumário
1. Por quê
2. O que já entrou (2026-09-22)
3. Sugestões, por tela — o que falta decidir
4. O que não se copia
5. Acessibilidade: onde o WhatsApp falha e o MenuQR não

## 1. Por quê

O MenuQR entrega o pedido dentro do WhatsApp. O lojista já vive lá; o cliente também. Se a interface do cardápio e do painel "parecerem parentes" do WhatsApp, o sistema pega emprestada uma confiança que já existe: cor, papel de parede, balões, tiques, o ritmo das listas. A estrutura de telas continua a do iFood (é o melhor cardápio do país); a **pele** é a do WhatsApp.

Regra de bolso: copiar **padrões** (cor, textura, forma dos balões, tiques, listas), nunca **assets** (logo, doodle, ícones, nome).

## 2. O que já entrou

| Onde | O quê | Arquivo |
|---|---|---|
| Tokens | `primary #0b8639` e escala, `brand #25d366`, `primary-tint #d9fdd3` (balão), `chat-bg #efeae2`, `tick #53bdeb`, cinzas azulados, erro `#ea0038` | `src/app/globals.css`, `assets/theme.css`, `tokens.md` |
| Landing, hero | "WhatsApp" em `primary` com o glifo colado (`WhatsAppGlyph`, `currentColor`) | `ui/whatsapp-glyph.tsx`, `landing/word-reveal.tsx` |
| Landing, seções não brancas | `wallpaper`: bege + rabisco próprio (`public/landing/doodle.svg`, 7%); no bloco verde, `wallpaper-light` (branco, 16%). O rabisco deriva na diagonal em 75s (`--animate-wallpaper`). Não vale para o rodapé, que é liso: lá o letreiro do nome já é a textura | `globals.css`, `public/landing/` |
| Landing, ilustrações | linha só, `currentColor`, 1,5px: ícone por capacidade e cavalete com QR. A seção de preço não leva desenho: ali o cartão é o único assunto | `landing/illustrations.tsx` |
| Marca | logo do MenuQR em `brand` (verde vivo), como o ícone do app deles | `platform/logo.tsx` |
| Tag | `promo` é o balão verde; `error` tem vermelho próprio (`error-pressed`) | `ui/tag.tsx` |
| Clerk | `appearance` com os mesmos hexes | `src/app/layout.tsx` |

## 3. Sugestões, por tela

Cada linha é uma proposta. Nenhuma foi implementada; o dono escolhe.

### Loja (`/r/[slug]`)
1. **Lista de itens no ritmo da lista de conversas.** Foto do prato à esquerda em tile arredondado (12px — não círculo: comida não é avatar), nome em `font-semibold`, descrição em uma linha `gray-600`, preço à direita como a hora da conversa. Barato: é só realinhar `ItemCard`.
2. **Badge de não lidos na sacola.** Contagem em círculo `brand` com número em `gray-900` (o WhatsApp usa branco e falha em contraste; aqui não). Já existe o badge — troca de cor.
3. **Barra da sacola como balão.** `bg-primary-tint text-gray-900`, raio 8, com o "rabinho" no canto direito: a sacola é a mensagem que o cliente está montando. Médio: mexe em `cart-bar.tsx`.
4. **Loja fechada como papel de parede.** Em vez do banner amarelo, o cabeçalho sobre `chat-bg` esmaecido com o aviso "Abre hoje às 18:00" em balão da loja. Médio.
5. **Tiques no fim do pedido.** No passo `done`, os dois tiques (`tick`) animando de um para dois: "Pedido enviado" → "Pedido lido". Só o segundo tique de verdade depende de resposta; mostrar como estado visual sem prometer leitura. Barato.
6. **Busca com raio 24 e fundo `gray-100`** como a do WhatsApp — já é assim. Manter.

### Sacola e checkout
7. **Revisão do pedido como prévia da mensagem.** Antes de "Fazer pedido pelo WhatsApp", mostrar a mensagem real (`buildOrderMessage`) dentro de um balão enviado (`primary-tint`) sobre `chat-bg`. É o que vai acontecer; o cliente vê antes. Médio-alto: um passo a mais? Não — substitui a lista de revisão atual.
8. **Botão final com o glifo** à esquerda do rótulo, `currentColor`. Barato.

### Painel
9. **Sidebar como lista de conversas.** Itens com ícone à esquerda em círculo `gray-100`, ativo em `primary-tint` (já é), contagem de pendências em badge `brand`. Barato.
10. **Compartilhar como "enviar mensagem".** O bloco de link + QR ganha um botão "Enviar pelo WhatsApp" (`wa.me/?text=`), com o glifo. Barato e útil.
11. **Prévia com moldura de celular** sobre `chat-bg` esmaecido. Médio.

### Landing (além do feito)
12. **Hero: o telefone falso ganha papel de parede** dentro da tela (`chat-bg` + rabisco) quando mostra a mensagem chegando. Barato.
13. **Estados do "Como funciona"** com a notificação no estilo do WhatsApp (avatar redondo, nome em `font-semibold`, hora à direita, prévia em uma linha). Barato.
14. **Depoimentos** — não. Continua fora (D15).

### Páginas globais
15. **OG image e ícone do app** em `primary`/`brand` no lugar do laranja legado (fase 6 pendente). Barato, vale fazer junto.

## 4. O que não se copia

- O **logo** do WhatsApp em verde vivo como marca do MenuQR. O glifo entra só em `currentColor`, colado a texto que fala do WhatsApp (uso nominativo).
- O **doodle** deles (é arte protegida). O rabisco de `public/landing/doodle.svg` é desenho próprio: comida, pedido, conversa.
- O **nome** "WhatsApp" em título de seção ou de produto: aparece só quando o assunto é o WhatsApp.
- O verde vivo `#25d366` como texto ou como fundo de botão com rótulo branco.
- Fontes: o WhatsApp usa a do sistema; o MenuQR continua em Inter.

## 5. Acessibilidade

O WhatsApp aceita 2:1 no verde do logo e 3:1 no verde de ação com texto branco. O MenuQR não: `primary #0b8639` foi escolhido a 4,7:1 sobre branco, `error-pressed` a 5,9:1 sobre `error-bg`, o badge de contagem leva número escuro, e texto sobre `primary` é só título grande ou rótulo de botão em `font-semibold`. Se um dia o dono quiser o verde de ação do app (`#1daa61`) como `primary`, é trocar um valor — mas os rótulos brancos de botão caem para 3:1, e o `tokens.md` precisa registrar a escolha.
