import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { DemoStoreLayout } from '@/components/demo/demo-store';
import { StoreFrame } from '@/components/store/store-frame';
import { StoreUnavailable } from '@/components/store/store-unavailable';
import { demoMode } from '@/lib/demo/config';
import { lookupStore } from '@/server/store-data';

/** O cardápio é servido estático e revalidado quando o lojista salva algo. */
export const revalidate = 300;

/**
 * A casca da loja (cabeçalho, sacola, rodapé) vive no layout, nos dois modos:
 * ela sobrevive à navegação entre o cardápio e a página do prato, e é isso
 * que mantém a sacola aberta ao voltar de uma edição e o toast vivo depois de
 * "Adicionar".
 */
export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  // Sem isto a leitura do idioma cairia nos headers e a loja deixaria de ser estática.
  setRequestLocale(locale);

  // No modo demonstração os dados vivem no navegador: a casca é montada no cliente.
  if (demoMode) return <DemoStoreLayout slug={slug}>{children}</DemoStoreLayout>;

  const lookup = await lookupStore(slug);
  if (lookup.status === 'missing') notFound();
  // Assinatura vencida ou cardápio despublicado: a página inteira é o aviso,
  // sem casca nem cardápio (vale também para /item/…, que passa por aqui).
  if (lookup.status === 'unavailable') return <StoreUnavailable business={lookup.business} />;
  if (lookup.status === 'unpublished') {
    return <StoreUnavailable business={lookup.business} reason="unpublished" />;
  }

  return (
    <StoreFrame business={lookup.data.business} menu={lookup.data.menu}>
      {children}
    </StoreFrame>
  );
}
