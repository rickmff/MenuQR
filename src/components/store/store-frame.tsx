import { CartBar } from './cart-bar';
import { CartDrawer } from './cart-drawer';
import { StoreFooter } from './store-footer';
import { StoreHeader } from './store-header';
import { StoreProvider } from './store-provider';
import type { Business, MenuCategory } from '@/lib/types';

/**
 * Casca do cardápio público — cabeçalho, rodapé e sacola. O visual é o mesmo para todo
 * restaurante (vermelho iFood); a cor da marca fica só no manifest e na imagem de compartilhamento.
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
      <div className="flex min-h-dvh flex-col">
        <StoreHeader />
        <main id="conteudo" className="flex-1">
          {notice && <div className="container-page pt-4">{notice}</div>}
          {children}
        </main>
        <StoreFooter business={business} />
        <CartBar />
        <CartDrawer />
      </div>
    </StoreProvider>
  );
}
