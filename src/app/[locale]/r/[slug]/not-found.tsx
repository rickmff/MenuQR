import { ItemMissing } from '@/components/store/item-missing';

/**
 * `notFound()` de um prato: responde 404 dentro da casca da loja, com o "‹" e
 * o caminho de volta ao cardápio. O `notFound()` do próprio layout (loja que
 * não existe) continua subindo para o 404 global.
 */
export default function ItemNotFound() {
  return <ItemMissing />;
}
