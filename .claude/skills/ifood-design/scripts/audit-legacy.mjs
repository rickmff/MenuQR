#!/usr/bin/env node
/**
 * Auditoria do design legado do Menu Online (skill ifood-design).
 *
 * Procura tudo que não pode sobrar depois da refatoração para o padrão iFood:
 * tokens ink-/flame-/whatsapp-, classes .btn/.surface/.field-input, Fraunces,
 * cor por tenant, emojis e glifos no chrome da UI, e APIs antigas.
 *
 *   node .claude/skills/ifood-design/scripts/audit-legacy.mjs            auditoria completa (exit 1 se achar erro)
 *   node .../audit-legacy.mjs src/components/store/item-card.tsx         só os arquivos/pastas informados
 *   node .../audit-legacy.mjs --baseline                                 contagens por regra e por arquivo (exit 0)
 *   node .../audit-legacy.mjs --strict                                   smells também reprovam
 *   node .../audit-legacy.mjs --json                                     saída para máquina
 *   node .../audit-legacy.mjs --allow 'src/app/dev/'                     ignora caminhos que casem com a regex
 *
 * Sem dependências; Node >= 20.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const FROM_SCRIPT = resolve(SCRIPT_DIR, '../../../..');
const ROOT = existsSync(join(FROM_SCRIPT, 'src')) ? FROM_SCRIPT : process.cwd();
const EXTENSIONS = ['.ts', '.tsx', '.css'];
const SKIP_DIRS = new Set(['node_modules', '.next', '.git']);

/**
 * Emoji nesses arquivos é DADO ou regra de negócio, não chrome:
 * a mensagem do WhatsApp e os valores padrão de logo/imagem/ícone.
 */
const EMOJI_ALLOWLIST = [
  'src/lib/whatsapp.ts',
  'src/lib/demo/actions.ts',
  'src/lib/demo/sample-data.ts',
  'src/lib/share-link.ts',
  'src/server/',
];

const RULES = [
  {
    id: 'token-legado',
    severity: 'error',
    hint: 'use a escala Pomodoro (gray-*, primary, pink-*) — references/tokens.md',
    // Precedido de '-' é o caso normal (bg-ink-50); só não pode ser meio de palavra (drink-100).
    regex: /(?<![a-zA-Z0-9_])(?:ink|flame|whatsapp)-\d{2,3}(?:\/\d{1,3})?(?![\w-])/g,
  },
  {
    id: 'var-legada',
    severity: 'error',
    hint: 'variável CSS do tema antigo',
    regex:
      /--(?:color-(?:ink|flame|whatsapp)-\d+|radius-(?:card|btn)|shadow-(?:soft|lift|glow)|ease-out-soft|font-fraunces|tenant-brand(?:-text|-ink)?|header-height)(?![\w-])/g,
  },
  {
    id: 'classe-legada',
    severity: 'error',
    hint: 'troque pelo primitivo de src/components/ui — references/components.md',
    regex:
      /(?<![\w-])(?:rounded-card|rounded-btn|shadow-soft|shadow-lift|shadow-glow|ease-out-soft|btn|btn-sm|btn-primary|btn-dark|btn-outline|btn-ghost-light|surface|surface-hover|eyebrow|text-gradient|glow-hero|grid-pattern|field-input|field-input-invalid|container-page|sr-only-focusable)(?![\w-])/g,
  },
  {
    id: 'fonte-legada',
    severity: 'error',
    hint: 'Inter na interface, Figtree no título do site institucional (D19)',
    regex: /\bFraunces\b/g,
  },
  {
    id: 'api-legada',
    severity: 'error',
    hint: 'símbolo do design antigo — references/migration-map-loja.md',
    regex: /\b(?:brandStyle|readableOnLight|OpeningBadge|emojiClassName|CartDrawer)\b/g,
  },
  {
    id: 'emoji-no-chrome',
    severity: 'error',
    hint: 'ícone Lucide no lugar — mapa em references/components.md',
    // Pictogramas + setas, formas geométricas, dingbats e o sinal de menos tipográfico.
    regex: /\p{Extended_Pictographic}|[←-⇿■-◿☀-➿⬀-⯿−]/gu,
    stripComments: true,
    skip: (file) => EMOJI_ALLOWLIST.some((entry) => file.startsWith(entry)),
    ignoreMatch: (text) => text === '©' || text === '®' || text === '™',
  },
  // ------------------------------------------------------------- smells
  {
    id: 'smell-vidro',
    severity: 'warning',
    hint: 'o iFood é chapado: sem blur',
    regex: /(?<![\w-])backdrop-blur(?:-\w+)?(?![\w-])/g,
  },
  {
    id: 'smell-gradiente',
    severity: 'warning',
    hint: 'sem gradiente (exceto image-gradient sob texto em foto)',
    regex: /(?<![\w-])bg-(?:linear|gradient)-to-\w+/g,
  },
  {
    id: 'smell-raio',
    severity: 'warning',
    hint: 'raio por papel: xs 4 · sm 8 · md 12 · lg 16 · xl 24 · full',
    regex: /(?<![\w-])rounded(?:-[trblse]{1,2})?-(?:2xl|3xl|4xl|\[)/g,
  },
  {
    id: 'smell-sombra',
    severity: 'warning',
    hint: 'sombra só low/medium/high/highest',
    regex: /(?<![\w-])shadow-(?:2xs|xs|sm|md|lg|xl|2xl)(?![\w-])/g,
  },
  {
    id: 'smell-tamanho',
    severity: 'warning',
    hint: 'escala tipográfica Pomodoro: caption, body2, body1, subtitle, h6…display',
    regex: /(?<![\w-])text-(?:xs|sm|base|lg|xl|[2-9]xl)(?![\w-])/g,
  },
  {
    id: 'smell-paleta',
    severity: 'warning',
    hint: 'cor fora do Pomodoro (não gera CSS depois do reset). `green-*` é do tema desde 2026-09-23 (D19) e não conta aqui',
    regex:
      /(?<![\w-])(?:bg|text|border|ring|from|to|via|fill|stroke|accent|outline|divide)-(?:slate|zinc|neutral|stone|red|orange|amber|yellow|lime|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|rose)-\d{2,3}/g,
  },
  {
    id: 'smell-serif',
    severity: 'warning',
    hint: 'sem serif',
    regex: /(?<![\w-])font-serif(?![\w-])/g,
  },
  {
    id: 'smell-100vh',
    severity: 'warning',
    hint: 'use dvh (Safari iOS)',
    regex: /\b100vh\b/g,
  },
  {
    id: 'smell-confirm',
    severity: 'warning',
    hint: 'ConfirmDialog no lugar de window.confirm',
    regex: /window\.confirm\(/g,
  },
];

// ------------------------------------------------------------------ args
const args = process.argv.slice(2);
const flags = { baseline: false, json: false, strict: false, color: process.stdout.isTTY };
const allow = [];
const targets = [];

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--baseline') flags.baseline = true;
  else if (arg === '--json') flags.json = true;
  else if (arg === '--strict') flags.strict = true;
  else if (arg === '--no-color') flags.color = false;
  else if (arg === '--allow') {
    const pattern = args[index + 1];
    if (!pattern) fail('--allow precisa de uma regex');
    try {
      allow.push(new RegExp(pattern));
    } catch {
      fail(`regex inválida em --allow: ${pattern}`);
    }
    index += 1;
  } else if (arg === '--help' || arg === '-h') {
    console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\*?/, ''));
    process.exit(0);
  } else if (arg.startsWith('--')) fail(`opção desconhecida: ${arg}`);
  else targets.push(arg);
}

function fail(message) {
  console.error(`audit-legacy: ${message}`);
  process.exit(2);
}

// --------------------------------------------------------------- arquivos
function walk(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (EXTENSIONS.some((ext) => entry.name.endsWith(ext))) out.push(full);
  }
  return out;
}

const fullAudit = targets.length === 0;
const files = [];
for (const target of fullAudit ? ['src'] : targets) {
  const absolute = existsSync(resolve(process.cwd(), target))
    ? resolve(process.cwd(), target)
    : resolve(ROOT, target);
  if (!existsSync(absolute)) fail(`caminho não encontrado: ${target}`);
  if (statSync(absolute).isDirectory()) walk(absolute, files);
  else files.push(absolute);
}

const toPosix = (file) => relative(ROOT, file).split(sep).join('/');

/** Troca comentários por espaços, preservando quebras de linha (linha/coluna continuam certas). */
function stripComments(source) {
  const blank = (match) => match.replace(/[^\n]/g, ' ');
  return source
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (match, lead) => lead + ' '.repeat(match.length - lead.length));
}

// ----------------------------------------------------------------- varredura
const findings = [];

for (const file of [...new Set(files)].sort()) {
  const path = toPosix(file);
  if (allow.some((pattern) => pattern.test(path))) continue;
  const raw = readFileSync(file, 'utf8');
  let stripped = null;

  for (const rule of RULES) {
    if (rule.skip?.(path)) continue;
    const source = rule.stripComments ? (stripped ??= stripComments(raw)) : raw;
    rule.regex.lastIndex = 0;
    for (const match of source.matchAll(rule.regex)) {
      if (rule.ignoreMatch?.(match[0])) continue;
      const before = source.slice(0, match.index);
      const line = before.split('\n').length;
      const column = match.index - before.lastIndexOf('\n');
      findings.push({ file: path, line, column, rule: rule.id, severity: rule.severity, match: match[0] });
    }
  }
}

// Checagens globais: só na auditoria completa (por arquivo elas sempre falhariam até a fase 7).
if (fullAudit) {
  const globalError = (file, message) =>
    findings.push({ file, line: 1, column: 1, rule: 'global', severity: 'error', match: message });

  const pkgPath = join(ROOT, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (!pkg.dependencies?.['lucide-react']) globalError('package.json', 'falta a dependência lucide-react');
  }

  const cssPath = join(ROOT, 'src/app/globals.css');
  if (existsSync(cssPath)) {
    const css = readFileSync(cssPath, 'utf8');
    if (!/--color-primary:\s*#0b8639/i.test(css)) {
      globalError('src/app/globals.css', 'tema Pomodoro ausente (--color-primary: #0b8639)');
    }
    if (/LEGADO/.test(css)) {
      globalError('src/app/globals.css', 'bloco LEGADO de aliases ainda presente (remover na fase 7)');
    }
  }

  if (existsSync(join(ROOT, 'src/app/dev'))) {
    globalError('src/app/dev', 'galeria descartável de primitivos ainda existe (apagar na fase 7)');
  }
}

// -------------------------------------------------------------------- saída
const errors = findings.filter((entry) => entry.severity === 'error');
const warnings = findings.filter((entry) => entry.severity === 'warning');

const countBy = (list, key) => {
  const counts = new Map();
  for (const entry of list) counts.set(entry[key], (counts.get(entry[key]) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
};

if (flags.json) {
  console.log(
    JSON.stringify(
      {
        root: ROOT,
        errors,
        warnings,
        counts: {
          errors: errors.length,
          warnings: warnings.length,
          byRule: Object.fromEntries(countBy(findings, 'rule')),
          byFile: Object.fromEntries(countBy(findings, 'file')),
        },
      },
      null,
      2,
    ),
  );
} else {
  const paint = (code, text) => (flags.color ? `\u001b[${code}m${text}\u001b[0m` : text);
  const hints = Object.fromEntries(RULES.map((rule) => [rule.id, rule.hint]));

  if (flags.baseline) {
    console.log(paint('1', `Linha de base do design legado — ${files.length} arquivos varridos`));
    console.log('\nPor regra:');
    for (const [rule, count] of countBy(findings, 'rule')) console.log(`  ${String(count).padStart(5)}  ${rule}`);
    console.log('\nPor arquivo (25 maiores):');
    for (const [file, count] of countBy(findings, 'file').slice(0, 25)) {
      console.log(`  ${String(count).padStart(5)}  ${file}`);
    }
    const filesWithErrors = new Set(errors.map((entry) => entry.file)).size;
    console.log(`\n${errors.length} erros em ${filesWithErrors} arquivos · ${warnings.length} smells`);
  } else {
    const shown = flags.strict ? findings : errors;
    const byFile = new Map();
    for (const entry of shown) byFile.set(entry.file, [...(byFile.get(entry.file) ?? []), entry]);
    for (const [file, entries] of byFile) {
      console.log(paint('1', file));
      for (const entry of entries) {
        const tag = entry.severity === 'error' ? paint('31', 'erro ') : paint('33', 'smell');
        console.log(`  ${String(entry.line).padStart(4)}:${String(entry.column).padEnd(3)} ${tag} ${entry.rule.padEnd(16)} ${entry.match}`);
      }
    }
    if (shown.length > 0) {
      console.log('\nO que fazer:');
      for (const [rule] of countBy(shown, 'rule')) console.log(`  ${rule.padEnd(16)} ${hints[rule] ?? ''}`);
    }
    const summary = `${errors.length} erros · ${warnings.length} smells${flags.strict ? ' (modo estrito)' : ''}`;
    console.log(`\n${errors.length === 0 && (!flags.strict || warnings.length === 0) ? paint('32', 'OK') : paint('31', 'REPROVADO')} — ${summary}`);
    if (!flags.strict && warnings.length > 0) console.log('Rode com --strict para listar os smells.');
  }
}

// exitCode (e não process.exit) para o stdout em pipe terminar de escrever antes de sair.
process.exitCode = flags.baseline ? 0 : errors.length > 0 || (flags.strict && warnings.length > 0) ? 1 : 0;
