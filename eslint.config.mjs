import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescriptConfig from 'eslint-config-next/typescript';

/** Configuração flat do ESLint (Next 16 já publica os presets nesse formato). */
const eslintConfig = [
  ...coreWebVitals,
  ...typescriptConfig,
  // `.agents/` são as skills do Clerk instaladas por `npx skills add`: código
  // de exemplo de outros frameworks, que não é nosso para consertar.
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', '.agents/**', '.claude/**'] },
];

export default eslintConfig;
