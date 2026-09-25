import { sampleBusiness } from '@/lib/demo/sample-data';
import { capabilities, platform, platformFaq, pricing, steps } from '@/lib/platform';
import { legalText, platformText } from '@/lib/platform-text';
import { absoluteUrl, siteUrl } from '@/lib/site';

export const dynamic = 'force-static';

/**
 * Resumo do produto em texto puro para assistentes de IA (convenção
 * llms.txt): o que é, como funciona, quanto custa e onde estão as páginas.
 * Sai das mesmas mensagens da landing, então não desatualiza sozinho.
 *
 * Fica em pt-BR, o idioma padrão e o do público do produto: o arquivo é
 * estático e quem o lê é um robô sem cookie — ler o idioma da requisição só o
 * tornaria dinâmico.
 */
export function GET() {
  const t = platformText();
  const legal = legalText();
  const lines = [
    `# ${platform.name}`,
    '',
    `> ${t('tagline')}. ${t('shortDescription')}`,
    '',
    t('description', { name: platform.name }),
    '',
    '## Como funciona',
    ...steps.map((step) => `- ${t(`steps.${step.key}.title`)}: ${t(`steps.${step.key}.text`)}`),
    '',
    '## O que o restaurante configura',
    ...capabilities.map((key) => `- ${t(`capabilityList.${key}.title`)}: ${t(`capabilityList.${key}.text`)}`),
    '',
    '## Preço',
    `- ${t('pricing.badge')}: ${pricing.price}${t('pricing.period')} (${t('pricing.billing', { yearly: pricing.yearly })}). ${t('pricing.note')}`,
    ...pricing.includes.map((key) => `- Inclui: ${t(`pricing.includes.${key}`)}`),
    '',
    '## Perguntas frequentes',
    ...platformFaq.map((key) => `- ${legal(`faq.items.${key}.question`)} ${legal(`faq.items.${key}.answer`)}`),
    '',
    '## Páginas',
    `- [Página inicial](${siteUrl})`,
    `- [Perguntas frequentes](${absoluteUrl('/perguntas-frequentes')})`,
    `- [Cardápio de exemplo](${absoluteUrl(`/r/${sampleBusiness.slug}`)})`,
    `- [Criar conta](${absoluteUrl('/criar-conta')})`,
    `- [Termos de uso](${absoluteUrl('/termos-de-uso')})`,
    `- [Política de privacidade](${absoluteUrl('/politica-de-privacidade')})`,
    '',
    `Contato: ${platform.email}`,
  ];

  return new Response(`${lines.join('\n')}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
