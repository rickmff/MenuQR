import type { TranslationValues } from 'next-intl';

/**
 * Textos das funções puras de `src/lib` (horário, mensagem do pedido, taxa de
 * entrega). Elas não conhecem o idioma sozinhas: quem chama entrega o
 * tradutor do namespace `ui` e o idioma, e a mesma função serve ao server
 * component, ao client component e à server action.
 *
 * - client ou server component síncrono: `const text = useUiText()` (`./use-ui-text`);
 * - server component async, `generateMetadata`, server action: `const text = await getUiText()` (`./ui-text-server`).
 *
 * O `t` de `useTranslations('ui')` / `getTranslations('ui')` do next-intl
 * encaixa direto em `Translate`.
 */
export type Translate = (key: string, values?: TranslationValues) => string;

export interface UiText {
  /** Tradutor do namespace `ui` — não de outro, as chaves são relativas a ele. */
  t: Translate;
  /** Idioma atual (`pt-BR`, `en`): datas, horas e números saem nele. */
  locale: string;
}
