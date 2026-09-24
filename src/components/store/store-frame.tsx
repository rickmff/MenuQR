import { CartBar } from './cart-bar';
import { CartSheet } from './cart/cart-sheet';
import { HideOnItem } from './hide-on-item';
import { StoreAboutSheet } from './store-about-sheet';
import { StoreFooter } from './store-footer';
import { StoreHeader } from './store-header';
import { StoreProvider } from './store-provider';
import { EmbeddedShell } from './store-shell';
import { ToastProvider } from '@/components/ui/toast';
import type { Business, MenuCategory } from '@/lib/types';

/**
 * Casca do cardápio — topo, rodapé, barra e sacola. O visual é o mesmo para
 * todo restaurante (o verde do sistema); a cor da marca fica só no manifest e
 * na imagem de compartilhamento.
 *
 * É a MESMA casca no cardápio servido pelo banco, no modo demonstração e na
 * prévia do painel (`embedded`): sem isso as versões começariam a divergir a
 * cada ajuste de layout. Na prévia ela vira um "aparelho" que rola por dentro
 * (`EmbeddedShell`). Ver também `StoreMenu`, que cuida do miolo.
 */
export function StoreFrame({
  business,
  menu,
  notice,
  embedded = false,
  basePath,
  children,
}: {
  business: Business;
  menu: MenuCategory[];
  /** Faixa extra sob a identidade da loja (o aviso do modo demonstração). */
  notice?: React.ReactNode;
  /** Dentro da prévia do painel. */
  embedded?: boolean;
  /** `/painel/previa` na prévia; o padrão é `/r/slug`. */
  basePath?: string;
  children: React.ReactNode;
}) {
  const content = (
    <>
      <StoreHeader />
      {/* Na prévia o `#conteudo` é o do painel: um id por página. */}
      <main id={embedded ? undefined : 'conteudo'} className="flex-1">
        {children}
      </main>
      <HideOnItem>
        <StoreFooter business={business} />
      </HideOnItem>
      <CartBar />
      <CartSheet />
      <StoreAboutSheet />
    </>
  );

  return (
    <StoreProvider business={business} menu={menu} basePath={basePath} embedded={embedded} notice={notice}>
      {embedded ? (
        // O toast mora DENTRO do aparelho: o `fixed` dele fica preso à moldura,
        // acima da barra da sacola, e não no pé da janela do painel.
        <EmbeddedShell>
          <ToastProvider>{content}</ToastProvider>
        </EmbeddedShell>
      ) : (
        <ToastProvider>
          {/* Branco explícito, e não o `gray-50` do papel: o cardápio é a LISTA —
              o equivalente à lista de conversas do WhatsApp, que no app deles
              também é branca. */}
          <div className="flex min-h-dvh flex-col bg-white">{content}</div>
        </ToastProvider>
      )}
    </StoreProvider>
  );
}
