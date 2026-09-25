/**
 * O `<html>` mora em `[locale]/layout.tsx`, que sabe o idioma. Este layout só
 * existe para as rotas de fora do `[locale]` (imagens de compartilhamento,
 * manifesto, sitemap), que não renderizam página.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
