#!/usr/bin/env node
/**
 * Codemod da fase 1 (skill ifood-design): traduz as escalas PADRÃO do Tailwind
 * para a escala Pomodoro, preservando o tamanho visual de cada elemento.
 *
 * Por que existe: o tema novo reaproveita nomes do Tailwind com outros valores
 * (rounded-xl era 12px e passa a ser 24px; rounded-lg era 8px e vira 16px).
 * Sem a tradução, 100+ elementos legados mudariam de forma na fase 1. Uma única
 * passada de regex mapeia cada ocorrência uma vez (sem troca em cascata).
 *
 *   node .claude/skills/ifood-design/scripts/codemod-scale.mjs --dry-run   mostra o que mudaria
 *   node .claude/skills/ifood-design/scripts/codemod-scale.mjs             aplica em src/**\/*.{ts,tsx}
 *   node .../codemod-scale.mjs src/components/store                        só um caminho
 *
 * Rode UMA vez, logo depois de colar assets/theme.css em globals.css. Rodar de
 * novo retraduziria o que já está na escala nova (rounded-md -> rounded-sm).
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const FROM_SCRIPT = resolve(SCRIPT_DIR, '../../../..');
const ROOT = existsSync(join(FROM_SCRIPT, 'src')) ? FROM_SCRIPT : process.cwd();

/** Tailwind padrão -> Pomodoro, pelo valor em px mais próximo. */
const RADIUS = { md: 'sm', lg: 'sm', xl: 'md', '2xl': 'lg', '3xl': 'xl' };
/** xs 12 · sm 14 · base 16 · lg 18 · xl 20 · 2xl 24 · 3xl 30->28 · 4xl 36->32 · 5xl 48->40 · 6xl 60->48 · 7xl 72->56 */
const TEXT = {
  xs: 'caption',
  sm: 'body2',
  base: 'body1',
  lg: 'subtitle',
  xl: 'h6',
  '2xl': 'h5',
  '3xl': 'h4',
  '4xl': 'h3',
  '5xl': 'h2',
  '6xl': 'h1',
  '7xl': 'display',
};

const RADIUS_RE = /(?<![\w-])(rounded(?:-(?:[trblse]|tl|tr|bl|br|ss|se|es|ee))?)-(md|lg|xl|2xl|3xl)(?![\w-])/g;
const TEXT_RE = /(?<![\w-])text-(xs|sm|base|lg|xl|[2-7]xl)(?![\w-])/g;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const targets = args.filter((arg) => !arg.startsWith('--'));

function walk(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = [];
for (const target of targets.length ? targets : ['src']) {
  const absolute = existsSync(resolve(process.cwd(), target)) ? resolve(process.cwd(), target) : resolve(ROOT, target);
  if (!existsSync(absolute)) {
    console.error(`codemod-scale: caminho não encontrado: ${target}`);
    process.exit(2);
  }
  if (statSync(absolute).isDirectory()) walk(absolute, files);
  else files.push(absolute);
}

let changedFiles = 0;
let replacements = 0;

for (const file of files.sort()) {
  const before = readFileSync(file, 'utf8');
  let count = 0;
  const after = before
    .replace(RADIUS_RE, (_, prefix, size) => {
      count += 1;
      return `${prefix}-${RADIUS[size]}`;
    })
    .replace(TEXT_RE, (_, size) => {
      count += 1;
      return `text-${TEXT[size]}`;
    });
  if (after === before) continue;
  changedFiles += 1;
  replacements += count;
  console.log(`${String(count).padStart(4)}  ${relative(ROOT, file)}`);
  if (!dryRun) writeFileSync(file, after);
}

console.log(
  `\n${replacements} trocas em ${changedFiles} arquivos${dryRun ? ' (dry-run: nada foi gravado)' : ''}.`,
);
