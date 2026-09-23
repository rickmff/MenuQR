import { sampleBusiness } from '@/lib/demo/sample-data';
import { capabilities, platform, platformFaq, pricing, steps } from '@/lib/platform';
import { absoluteUrl, siteUrl } from '@/lib/site';

export const dynamic = 'force-static';

/**
 * Resumo do produto em texto puro para assistentes de IA (convenção
 * llms.txt): o que é, como funciona, quanto custa e onde estão as páginas.
 * Sai das mesmas constantes da landing, então não desatualiza sozinho.
 */
export function GET() {
  const lines = [
    `# ${platform.name}`,
    '',
    `> ${platform.tagline}. ${platform.shortDescription}`,
    '',
    platform.description,
    '',
    '## Como funciona',
    ...steps.map((step) => `- ${step.title}: ${step.text}`),
    '',
    '## O que o restaurante configura',
    ...capabilities.map((capability) => `- ${capability.title}: ${capability.text}`),
    '',
    '## Preço',
    `- ${pricing.badge}: ${pricing.price}${pricing.period} (${pricing.billing}). ${pricing.note}`,
    ...pricing.includes.map((line) => `- Inclui: ${line}`),
    '',
    '## Perguntas frequentes',
    ...platformFaq.map((entry) => `- ${entry.question} ${entry.answer}`),
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
