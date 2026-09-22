import { CartBar } from './cart-bar';
import { CartDrawer } from './cart-drawer';
import { HideOnItem } from './hide-on-item';
import { StoreFooter } from './store-footer';
import { StoreHeader } from './store-header';
import { StoreProvider } from './store-provider';
import { ToastProvider } from '@/components/ui/toast';
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
      <ToastProvider>
        <div className="flex min-h-dvh flex-col">
          <StoreHeader />
          <main id="conteudo" className="flex-1">
            {notice && <div className="mx-auto w-full max-w-page px-4 pt-4 lg:px-8">{notice}</div>}
            {children}
          </main>
          <HideOnItem>
            <StoreFooter business={business} />
          </HideOnItem>
          <CartBar />
          <CartDrawer />
        </div>
      </ToastProvider>
    </StoreProvider>
  );
}
