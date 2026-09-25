/**
 * Cores do QR do cardápio, as mesmas na tela, no PNG e no SVG. Módulo à parte
 * porque o QR da tela é server component e o download é client: constante
 * exportada de um arquivo `'use client'` chega ao servidor como referência,
 * não como valor.
 */
export const QR_COLORS = { dark: '#1c1815', light: '#ffffff' } as const;
