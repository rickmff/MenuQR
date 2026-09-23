import { CartBar } from './cart-bar';
import { CartSheet } from './cart/cart-sheet';
import { HideOnItem } from './hide-on-item';
import { StoreFooter } from './store-footer';
import { StoreHeader } from './store-header';
import { StoreProvider } from './store-provider';
import { ToastProvider } from '@/components/ui/toast';
import type { Business, MenuCategory } from '@/lib/types';

/**
 * Casca do cardápio público — cabeçalho, rodapé e sacola. O visual é o mesmo para todo
 * restaurante (o verde do sistema); a cor da marca fica só no manifest e na imagem de compartilhamento.
 *
 * É a MESMA casca no cardápio servido pelo banco e no modo demonstração: sem
 * isso as duas versões do exemplo começariam a divergir a cada ajuste de
 * layout. Ver também `StoreMenu`, que cuida do miolo.
 */
export function StoreFrame({
  business,
  menu,
  notice,
  children,
}: {
  business: Business;
  menu: MenuCategory[];
  notice?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <StoreProvider business={business} menu={menu}>
      <ToastProvider>
        {/* Branco explícito: o papel do sistema é o creme (D21), mas o cardápio
          * é a LISTA — o equivalente à lista de conversas do WhatsApp, que no
          * app deles também é branca. A foto do prato é a protagonista e pede
          * fundo neutro; o creme fica sendo a moldura em volta, no desktop. */}
        <div className="flex min-h-dvh flex-col bg-white">
          <StoreHeader />
          <main id="conteudo" className="flex-1">
            {notice && <div className="mx-auto w-full max-w-page px-4 pt-4 lg:px-8">{notice}</div>}
            {children}
          </main>
          <HideOnItem>
            <StoreFooter business={business} />
          </HideOnItem>
          <CartBar />
          <CartSheet />
        </div>
      </ToastProvider>
    </StoreProvider>
  );
}
