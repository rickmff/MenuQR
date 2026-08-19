import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescriptConfig from 'eslint-config-next/typescript';

/** Configuração flat do ESLint (Next 16 já publica os presets nesse formato). */
const eslintConfig = [
  ...coreWebVitals,
  ...typescriptConfig,
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
];

export default eslintConfig;
