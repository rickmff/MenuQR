/**
 * As abas de "Dados do negócio" — a fonte da verdade, do tipo à ordem.
 *
 * Fica num módulo sem dependências de propósito: o formulário, as abas, o
 * checklist de configuração e a server action importam daqui, e nada aqui
 * importa de volta. Antes o tipo vinha de `@/server/actions/business` e um
 * módulo do cliente acabava dependendo de um `'use server'`.
 */
export type BusinessSection =
  | 'identidade'
  | 'contato'
  | 'horarios'
  | 'entrega';

/**
 * As abas de "Dados do negócio", na ordem em que aparecem e em que o checklist
 * de configuração as percorre. Fica num arquivo próprio para o formulário e o
 * checklist poderem importar sem depender um do outro.
 *
 * Rótulo, título e descrição de cada aba moram nas mensagens
 * (`painel.sections.<aba>`), com a mesma chave daqui.
 */
export const BUSINESS_SECTIONS: Record<BusinessSection, { href: string }> = {
  identidade: { href: '/painel/negocio' },
  contato: { href: '/painel/negocio/contato' },
  horarios: { href: '/painel/negocio/horarios' },
  /*
   * O endereço mora aqui, e não numa aba só dele: o mapa da área de entrega
   * procura o restaurante por esses campos, e tê-los em outra tela obrigava o
   * lojista a salvar, trocar de aba e voltar só para o mapa achar o ponto.
   */
  entrega: { href: '/painel/negocio/entrega' },
};

/**
 * A ordem das abas na tela. Escrita à mão, e não derivada de `Object.keys`: a
 * ordem é uma decisão explícita, e a lista existe mesmo que o objeto acima
 * ainda não tenha sido avaliado.
 *
 * Desde 2026-09-25 é a mesma ordem do guia de configuração (`SETUP_ORDER` em
 * `setup-steps.ts`): primeiro o que impede o cliente de pedir (endereço e
 * entrega, horários), depois a identidade, e o contato por último — o WhatsApp
 * já vem do cadastro. Assim "Salvar e ir para…" anda sempre para a aba seguinte
 * à direita, sem pular nenhuma.
 */
export const ONBOARDING_ORDER: BusinessSection[] = [
  'entrega',
  'horarios',
  'identidade',
  'contato',
];
