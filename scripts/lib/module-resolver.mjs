/**
 * Deixa o Node importar os módulos do app como o Next importa: caminhos `@/`,
 * imports sem extensão e o marcador `server-only`. Usado pelos scripts que
 * precisam rodar o código de verdade do servidor fora do Next.
 */
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CANDIDATES = ['.ts', '.tsx', '.mjs', '.js', '/index.ts', '/index.tsx'];

function resolveFile(base) {
  if (existsSync(base) && statSync(base).isFile()) return base;
  for (const suffix of CANDIDATES) {
    const candidate = base + suffix;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

export async function resolve(specifier, context, next) {
  if (specifier === 'server-only') {
    return { url: new URL('./server-only.mjs', import.meta.url).href, shortCircuit: true };
  }

  let base = null;
  if (specifier.startsWith('@/')) {
    base = path.join(root, 'src', specifier.slice(2));
  } else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }

  if (base) {
    const file = resolveFile(base);
    if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
  }

  return next(specifier, context);
}
