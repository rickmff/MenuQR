import { BILLING_PLAN, formatPlanPrice } from './billing';

/**
 * Identidade da plataforma (o produto white label). Só o que não muda com o
 * idioma mora aqui; os textos comerciais (slogan, descrição, passos,
 * capacidades, preço) estão no namespace `platform` de `messages/` e as
 * perguntas frequentes no `legal`.
 */
export const platform = {
  name: 'Menu Online',
  email: 'contato@menuqr.app',
  /** Domínio padrão usado quando NEXT_PUBLIC_SITE_URL não está definido. */
  fallbackUrl: 'https://www.menuqr.app',
} as const;

/** Como funciona, do lado do lojista — três estados de um painel só na landing (`platform.steps.<chave>`). */
export const steps = [
  { number: '01', key: 'create' },
  { number: '02', key: 'share' },
  { number: '03', key: 'receive' },
] as const;

/**
 * O que o lojista configura e o cardápio aplica sozinho (`platform.capabilityList.<chave>`).
 * Texto puro: a landing lista, não demonstra mais — cada linha precisa existir
 * de verdade no produto.
 */
export const capabilities = ['addons', 'delivery', 'pickup', 'hours', 'menu', 'promotion'] as const;

export type CapabilityKey = (typeof capabilities)[number];

/** As perguntas da página de FAQ, na ordem (`legal.faq.items.<chave>`). */
export const platformFaq = ['commission', 'app', 'howOrdersArrive', 'liveChanges', 'google', 'domain'] as const;

/**
 * Plano único: não há grátis nem teste (decisão do dono). O valor anunciado
 * por mês é o anual dividido por doze — o número de verdade mora em
 * `BILLING_PLAN` (src/lib/billing.ts), e é dele que a cobrança sai. Os
 * rótulos em volta estão em `platform.pricing`.
 */
export const pricing = {
  price: formatPlanPrice(BILLING_PLAN.amountCents / 12).replace(/,\d{2}$/, ''),
  yearly: formatPlanPrice(BILLING_PLAN.amountCents),
  includes: ['menuLink', 'unlimitedItems', 'deliveryPickupHours', 'unlimitedOrders', 'liveEdits'],
} as const;
