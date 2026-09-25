'use client';

import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useSetupCollapsed } from '@/components/painel/setup-collapsed';
import type { SetupProgress, SetupSummary } from '@/components/painel/setup-steps';
import { Button } from '@/components/ui/button';
import { NavIcon } from '@/components/ui/button-icons';
import { Tag } from '@/components/ui/tag';
import { cn } from '@/lib/cn';
import { formatRadius } from '@/lib/delivery-area';
import type { Translate } from '@/lib/i18n';

/**
 * O guia de configuração, no formato do onboarding do Stripe: uma janela que
 * flutua no canto inferior direito do painel, acompanha o lojista de tela em
 * tela e encolhe para uma pílula quando ele quer o caminho livre.
 *
 * Três regras o definem:
 *
 * 1. **O progresso vem dos dados**, não de cliques (veja `setup-steps.ts`).
 *    Cada passo concluído mostra o que ficou gravado, para o lojista conferir
 *    sem abrir a aba.
 * 2. **Flutua, não ocupa.** Não pertence a nenhuma tela do painel: mora na
 *    casca, por cima de todas — é por isso que não disputa espaço com o
 *    conteúdo nem contraria "uma tela, um objetivo".
 * 3. **Some sozinho quando acaba**, e enquanto isso encolhe para uma pílula
 *    que sempre dá para reabrir.
 *
 * Publicar não é passo daqui: o botão de publicar vive na tela de
 * compartilhar, e o checklist não repete o que ela já resolve.
 */
export function SetupWidget({
  businessId,
  progress,
}: {
  businessId: string;
  progress: SetupProgress;
}) {
  const [collapsed, setCollapsed] = useSetupCollapsed(businessId);
  const t = useTranslations('painel.setup');
  const locale = useLocale();
  const pathname = usePathname();
  // Na prévia a moldura é a tela do celular do cliente: o guia cobriria a
  // barra da sacola e o CTA do prato, e o Esc dele fecharia junto com a sacola.
  const onPreview = pathname.startsWith('/painel/previa');

  // Esc fecha, como em qualquer camada que flutua. Não é modal: não prende o
  // foco nem trava a rolagem — o lojista continua usando a tela por baixo.
  useEffect(() => {
    if (collapsed || onPreview) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCollapsed(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [collapsed, onPreview, setCollapsed]);

  if (progress.complete || onPreview) return null;

  const { steps, done, total, next } = progress;
  const percent = Math.round((done / total) * 100);

  /*
   * As abas de "Dados do negócio" têm a barra de "Salvar" grudada no rodapé, e
   * no celular ela ocupa a largura toda: o widget cobriria justamente o botão.
   * Some ali no celular — quem está numa aba já é levado à próxima pelo
   * "Salvar e continuar" — e volta a partir de `lg`, onde a coluna é estreita
   * e a barra fica longe do canto.
   */
  const overSaveBar = pathname.startsWith('/painel/negocio');

  return (
    <div
      className={cn(
        'fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-50 lg:bottom-6 lg:right-6',
        // Expandido no celular, a janela vai de margem a margem.
        !collapsed && 'left-4 lg:left-auto',
        overSaveBar && 'max-lg:hidden',
      )}
    >
      {collapsed ? (
        <button
          type="button"
          aria-expanded={false}
          onClick={() => setCollapsed(false)}
          className="press flex w-full items-center gap-2.5 rounded-full border border-gray-200 bg-white py-3 pl-4 pr-5 shadow-high"
        >
          <ProgressRing percent={percent} />
          <span className="text-body2 font-semibold text-gray-700">{t('pill')}</span>
          <span className="text-body2 text-gray-600">
            {done}/{total}
          </span>
        </button>
      ) : (
        <div
          role="region"
          aria-labelledby="setup-titulo"
          className="animate-fade-in flex max-h-[min(40rem,80dvh)] w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-highest lg:w-[22rem]"
        >
          <div className="flex items-start gap-2 px-4 pb-3 pt-4">
            <div className="min-w-0 flex-1">
              <h2 id="setup-titulo" className="text-body1 font-bold text-gray-700">
                {t('title')}
              </h2>
              <p className="mt-0.5 text-caption text-gray-600">
                {t('progress', { done, total })}
              </p>
            </div>

            <button
              type="button"
              aria-expanded
              aria-label={t('collapse')}
              onClick={() => setCollapsed(true)}
              className="press -mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-sm text-gray-600 hover:bg-gray-50"
            >
              <ChevronDown aria-hidden="true" className="size-5" />
            </button>
          </div>

          <div aria-hidden="true" className="mx-4 h-1 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300 ease-standard"
              style={{ width: `${percent}%` }}
            />
          </div>

          <ol className="scrollbar-none mt-1 flex-1 overflow-y-auto px-2 py-2">
            {steps.map((step) => {
              const current = step.step === next?.step;
              const summary = step.done ? describeSummary(step.summary, t, locale) : '';
              return (
                <li key={step.step}>
                  <Link
                    href={step.href}
                    className="press flex items-center gap-3 rounded-sm px-2 py-2.5 hover:bg-gray-50"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'grid size-5 shrink-0 place-items-center rounded-full',
                        step.done
                          ? 'bg-success-bg text-success'
                          : cn('border', current ? 'border-primary' : 'border-gray-300'),
                      )}
                    >
                      {step.done && <Check className="size-3" strokeWidth={3} />}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          // Sem truncar: com a tag ao lado, "Primeiro item no
                          // cardápio" virava "Primeiro item no cardá…".
                          'block text-body2',
                          step.done ? 'text-gray-600' : 'font-semibold text-gray-700',
                        )}
                      >
                        {t(`steps.${step.step}`)}
                        <span className="sr-only">
                          {step.done ? t('stepDone') : t('stepPending')}
                        </span>
                      </span>
                      {summary && (
                        <span className="mt-0.5 block truncate text-caption text-gray-600">
                          {summary}
                        </span>
                      )}
                    </span>

                    {!step.done && step.required && <Tag tone="dark">{t('required')}</Tag>}

                    <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-gray-400" />
                  </Link>
                </li>
              );
            })}
          </ol>

          {next && (
            <div className="border-t border-gray-200 p-3">
              <Button href={next.href} size="sm" fullWidth after={<NavIcon />}>
                {t('continue')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** O resumo de um passo concluído, em uma linha, no idioma da tela. */
function describeSummary(
  summary: SetupSummary | null,
  t: Translate,
  locale: string,
): string {
  if (!summary) return '';
  switch (summary.kind) {
    case 'text':
      return summary.text;
    case 'days':
      return t('summary.days', { count: summary.count });
    case 'items':
      return t('summary.items', { count: summary.count });
    case 'delivery': {
      const parts: string[] = [];
      if (summary.address) parts.push(summary.address);
      if (summary.delivery) {
        const area =
          summary.delivery.zones > 0
            ? t('summary.zones', { count: summary.delivery.zones })
            : formatRadius(summary.delivery.radiusKm, locale);
        parts.push(t('summary.delivery', { area }));
      }
      if (summary.pickup) parts.push(t('summary.pickup'));
      return parts.join(' • ');
    }
  }
}

/**
 * O anel de progresso da pílula: mesma informação da barra, no espaço de um
 * ícone. É um `conic-gradient` porque um SVG aqui seria três elementos para
 * desenhar o mesmo círculo.
 */
function ProgressRing({ percent }: { percent: number }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-5 shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(var(--color-primary) ${percent}%, var(--color-gray-200) 0)`,
      }}
    >
      <span className="size-3 rounded-full bg-white" />
    </span>
  );
}
