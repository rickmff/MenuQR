#!/usr/bin/env node
/**
 * Regenera os PNG do manifesto (public/icone-*.png) a partir do mesmo desenho
 * de `src/components/platform/logo.tsx`, com o ImageResponse do Next — sem
 * dependência nova. Rode quando a marca mudar:
 *
 *   node scripts/gerar-icones.mjs
 *
 * `icone-192.png` e `icone-512.png` têm cantos arredondados e fundo
 * transparente (`purpose: any`); `icone-maskable-512.png` é em sangria total,
 * para o Android recortar no formato que quiser (`purpose: maskable`). O
 * favicon (`src/app/icon.svg`) e o ícone do iOS (`src/app/apple-icon.tsx`)
 * carregam o desenho por conta própria.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement as h } from 'react';
import { ImageResponse } from 'next/og';

const BRAND = '#25d366';
const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

function mark(size, { rounded }) {
  const eyes = h(
    'g',
    { fill: '#ffffff' },
    h('rect', { x: 7, y: 7, width: 8, height: 8, rx: 2 }),
    h('rect', { x: 17, y: 7, width: 8, height: 8, rx: 2 }),
    h('rect', { x: 7, y: 17, width: 8, height: 8, rx: 2 }),
    h('rect', { x: 17, y: 17, width: 3.5, height: 3.5, rx: 1 }),
    h('rect', { x: 21.5, y: 21.5, width: 3.5, height: 3.5, rx: 1 }),
  );
  const pupils = h(
    'g',
    { fill: BRAND },
    h('rect', { x: 9.5, y: 9.5, width: 3, height: 3, rx: 0.75 }),
    h('rect', { x: 19.5, y: 9.5, width: 3, height: 3, rx: 0.75 }),
    h('rect', { x: 9.5, y: 19.5, width: 3, height: 3, rx: 0.75 }),
  );
  return h(
    'div',
    { style: { width: '100%', height: '100%', display: 'flex' } },
    h(
      'svg',
      { width: size, height: size, viewBox: '0 0 32 32' },
      h('rect', { width: 32, height: 32, rx: rounded ? 8 : 0, fill: BRAND }),
      eyes,
      pupils,
    ),
  );
}

async function render(file, size, options) {
  const response = new ImageResponse(mark(size, options), { width: size, height: size });
  const bytes = Buffer.from(await response.arrayBuffer());
  writeFileSync(join(publicDir, file), bytes);
  console.log(`${file}: ${bytes.length} bytes`);
}

await render('icone-192.png', 192, { rounded: true });
await render('icone-512.png', 512, { rounded: true });
await render('icone-maskable-512.png', 512, { rounded: false });
