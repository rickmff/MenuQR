import { CartBar } from './cart-bar';
import { CartDrawer } from './cart-drawer';
import { StoreFooter } from './store-footer';
import { StoreHeader } from './store-header';
import { StoreProvider } from './store-provider';
import { normalizeHexColor, readableOnLight, readableTextColor } from '@/lib/colors';
import type { Business, MenuCategory } from '@/lib/types';

/**
 * A cor da marca vira variável CSS e todo o cardápio se adapta a ela.
 * `--tenant-brand-ink` é a versão escurecida até ter contraste sobre o fundo
 * claro: marcas amarelas ou lima continuam legíveis nos textos e nas abas.
 */
export function brandStyle(business: Business): React.CSSProperties {
  const brand = normalizeHexColor(business.brandColor);
  return {
    '--tenant-brand': brand,
    '--tenant-brand-text': readableTextColor(brand),
    '--tenant-brand-ink': readableOnLight(brand),
  } as React.CSSProperties;
}

/**
 * Casca do cardápio público — cabeçalho, rodapé, sacola e cores da marca.
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
      <div className="flex min-h-dvh flex-col" style={brandStyle(business)}>
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
