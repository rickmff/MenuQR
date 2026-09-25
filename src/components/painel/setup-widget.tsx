'use client';

import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import {
  useCallback,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from 'react';
import { useSetupPreference } from '@/components/painel/setup-collapsed';
import type { SetupPreference } from '@/components/painel/setup-preference';
import type { SetupProgress, SetupStepState, SetupSummary } from '@/components/painel/setup-steps';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { NavIcon } from '@/components/ui/button-icons';
import { Tag } from '@/components/ui/tag';
import { cn } from '@/lib/cn';
import { formatRadius } from '@/lib/delivery-area';
import type { Translate } from '@/lib/i18n';

/** Os breakpoints do Tailwind (`lg`, `xl`), para decidir o formato do guia. */
const LG = '(min-width: 64rem)';
const XL = '(min-width: 80rem)';

/**
 * O guia de configuração, no formato do onboarding do Stripe: acompanha o
 * lojista de tela em tela, mora na casca (slot `floating` do `PanelShell`) e
 * encolhe para uma pílula quando ele quer o caminho livre.
 *
 * Quatro regras o definem:
 *
 * 1. **O progresso vem dos dados**, não de cliques (veja `setup-steps.ts`).
 *    Cada passo concluído mostra o que ficou gravado; cada pendente, o que
 *    falta — o lojista não precisa abrir a aba para descobrir.
 * 2. **Nunca cobre o conteúdo** (2026-09-25). Aberto no desktop, a coluna do
 *    painel cede o espaço dele (`data-setup-docked`, lido pelo `PanelShell`):
 *    antes ele flutuava por cima e escondia justamente "Criar categoria" e
 *    "Adicionar ao cardápio" — o passo obrigatório do guia, bloqueado pelo
 *    guia. Por isso nasce aberto só a partir de `xl`, onde ceder o espaço não
 *    aperta a coluna; abaixo disso nasce em pílula (a escolha gravada do
 *    lojista vale por cima da regra, e chega do servidor pelo cookie para o
 *    HTML já sair no formato certo). No celular a pílula abre uma folha por
 *    baixo (`BottomSheet`), com fundo escurecido, e tocar num passo fecha a
 *    folha e leva até ele. A pílula sobe o que a barra de "Salvar" grudada no
 *    pé ocupa (`--panel-bottom-inset`) e não fica sobre o botão; no fim da
 *    rolagem, um espaçador depois da coluna impede que ela cubra a última linha.
 * 3. **Um próximo passo só**: "Continuar configuração" leva a `progress.next`
 *    (obrigatórios primeiro), e some quando o lojista já está lá — mandar para
 *    a própria tela não é ajuda. Quando o próximo passo é opcional, o botão é
 *    `secondary`: publicar já está liberado, e o verde cheio fica com o
 *    "Publicar cardápio" de Compartilhar, não com o que pode ficar para depois.
 * 4. **Termina dizendo o que fazer.** Tudo configurado e o cardápio ainda em
 *    rascunho, a lista vira "Tudo pronto — Publicar cardápio"; publicado, o
 *    guia some.
 */
export function SetupWidget({
  businessId,
  progress,
  initialPreference = null,
}: {
  businessId: string;
  progress: SetupProgress;
  /** A escolha gravada, lida do cookie pelo layout (o modo demo não tem servidor). */
  initialPreference?: SetupPreference;
}) {
  const t = useTranslations('painel.setup');
  const locale = useLocale();
  const pathname = usePathname();
  const [preference, setPreference] = useSetupPreference(businessId, initialPreference);
  const lg = useMediaQuery(LG);
  const xl = useMediaQuery(XL);
  const bottomBarRegistered = useBottomBarRegistered();
  const titleId = useId();

  // A folha do celular. Não é preferência gravada: é uma olhada, e fecha
  // sozinha quando a tela muda (inclusive por um link de dentro dela).
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetPath, setSheetPath] = useState(pathname);
  if (sheetPath !== pathname) {
    setSheetPath(pathname);
    setSheetOpen(false);
  }
  // A janela passou de `lg` (tablet girado, janela alargada): a folha não
  // existe lá, e sem isto reabria sozinha ao voltar para o celular.
  if (sheetOpen && lg) setSheetOpen(false);

  /**
   * Quem recebe o foco depois de abrir ou recolher pelo teclado. O botão que
   * foi apertado sai da tela junto com o formato antigo; sem isto o foco caía
   * no `<body>`.
   */
  const focusNext = useRef<'pill' | 'panel' | null>(null);
  const takeFocus = useCallback((target: 'pill' | 'panel') => {
    return (node: HTMLElement | null) => {
      if (node && focusNext.current === target) {
        focusNext.current = null;
        node.focus();
      }
    };
  }, []);

  // Na prévia a moldura é a tela do celular do cliente: o guia cobriria a
  // barra da sacola e o CTA do prato.
  const onPreview = pathname.startsWith('/painel/previa');
  const ready = progress.publishReady;
  if (onPreview || (progress.complete && !ready)) return null;

  /*
   * A partir de que largura o guia aparece aberto no canto (abaixo dela, a
   * pílula): `lg`, `xl` ou nunca (`pill`). O HTML sai com os dois e o CSS
   * escolhe pela largura, que o servidor não conhece — assim o celular nunca
   * vê o guia aberto piscar. Depois da hidratação a largura é conhecida e a
   * resposta vira `lg` (aberto, e a janela já passa de `lg`) ou `pill`.
   */
  const layout: 'lg' | 'xl' | 'pill' =
    lg === null || xl === null
      ? preference === null
        ? 'xl'
        : preference === 'open'
          ? 'lg'
          : 'pill'
      : lg && (preference === null ? xl : preference === 'open')
        ? 'lg'
        : 'pill';

  /*
   * Rede de segurança do celular: a barra de "Salvar" das abas do negócio que
   * ainda não se registrou em `bottom-inset.ts` não empurra a pílula para
   * cima, e ela cairia sobre o botão. Ali, sem nenhuma barra registrada, a
   * pílula fica fora do celular (o que o antigo `overSaveBar` fazia sempre);
   * registrada a barra, a regra deixa de valer sozinha.
   */
  const pillOffPhone = !bottomBarRegistered && pathname.startsWith('/painel/negocio');

  const { steps, done, total, next } = progress;
  const percent = ready ? 100 : Math.round((done / total) * 100);
  const onShare = pathname === '/painel';

  // O botão do rodapé: publicar (na tela de compartilhar, onde o botão mora)
  // ou o próximo passo. Nenhum dos dois quando o lojista já está no destino.
  // Passo opcional pendente (a Identidade) com os obrigatórios feitos: o
  // botão desce para `secondary` e não disputa com o Publicar do cabeçalho.
  const action: { href: string; label: string; variant: 'primary' | 'secondary' } | null = ready
    ? onShare
      ? null
      : { href: '/painel', label: t('ready.cta'), variant: 'primary' }
    : next && next.href !== pathname
      ? { href: next.href, label: t('continue'), variant: next.required ? 'primary' : 'secondary' }
      : null;
  const readyText = onShare ? t('ready.here') : t('ready.text');

  const collapse = () => {
    focusNext.current = 'pill';
    setPreference('collapsed');
  };

  const expand = () => {
    // Lido na hora do toque: antes da hidratação `lg` ainda é `null`.
    if (window.matchMedia(LG).matches) {
      focusNext.current = 'panel';
      setPreference('open');
    } else {
      setSheetOpen(true);
    }
  };

  // Esc recolhe só quando o foco está no guia. Ouvir na janela recolhia o guia
  // junto com o Esc do editor de item, do menu e dos diálogos.
  const onPanelKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    event.preventDefault();
    collapse();
  };

  const stepList = (onNavigate?: () => void) => (
    <StepList
      steps={steps}
      next={next}
      pathname={pathname}
      t={t}
      locale={locale}
      onNavigate={onNavigate}
    />
  );

  return (
    <>
      {layout !== 'pill' && (
        <div
          role="region"
          aria-labelledby={titleId}
          onKeyDown={onPanelKeyDown}
          // O `PanelShell` e o toast leem isto para ceder o espaço do guia a
          // partir da mesma largura em que o CSS o mostra.
          data-setup-docked={layout}
          className={cn(
            'animate-fade-in fixed bottom-6 right-6 z-50 hidden max-h-[min(40rem,80dvh)] w-[22rem] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-highest',
            layout === 'lg' ? 'lg:flex' : 'xl:flex',
          )}
        >
          <div className="flex items-start gap-2 px-4 pb-3 pt-4">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-body1 font-bold text-gray-700">
                {ready ? t('ready.title') : t('title')}
              </h2>
              <p className="mt-0.5 text-caption text-gray-600">
                {ready ? readyText : t('progress', { done, total })}
              </p>
            </div>

            <button
              ref={takeFocus('panel')}
              type="button"
              aria-expanded
              aria-label={t('collapse')}
              onClick={collapse}
              className="press -mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-sm text-gray-600 hover:bg-gray-50"
            >
              <ChevronDown aria-hidden="true" className="size-5" />
            </button>
          </div>

          {!ready && (
            <>
              <ProgressBar percent={percent} className="mx-4" />
              <div className="scrollbar-none mt-1 flex-1 overflow-y-auto px-2 py-2">
                {stepList()}
              </div>
            </>
          )}

          {action && (
            <div className={cn('p-3', !ready && 'border-t border-gray-200')}>
              <Button href={action.href} variant={action.variant} size="sm" fullWidth after={<NavIcon />}>
                {action.label}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* A pílula existe sempre; o CSS a esconde onde o guia aparece aberto. */}
      <button
        ref={takeFocus('pill')}
        type="button"
        aria-expanded={sheetOpen}
        // No celular a pílula abre uma folha modal; no desktop, o guia no canto.
        aria-haspopup={lg === false ? 'dialog' : undefined}
        onClick={expand}
        className={cn(
          'press fixed right-4 z-50 flex items-center gap-2.5 rounded-full border border-gray-200 bg-white py-3 pl-4 pr-5 shadow-high',
          // Acima da barra de "Salvar" grudada no pé, quando houver uma.
          'bottom-[calc(max(1rem,var(--safe-bottom))+var(--panel-bottom-inset,0px))] lg:right-6 lg:bottom-[calc(1.5rem+var(--panel-bottom-inset,0px))]',
          layout === 'lg' && 'lg:hidden',
          layout === 'xl' && 'xl:hidden',
          pillOffPhone && 'max-lg:hidden',
        )}
      >
        <ProgressRing percent={percent} />
        <span className="text-body2 font-semibold text-gray-700">
          {ready ? t('ready.title') : t('pill')}
        </span>
        {!ready && (
          <span className="text-body2 text-gray-600">
            {done}/{total}
          </span>
        )}
      </button>

      {/* O pé da página cresce o que a pílula ocupa (a margem dela, os 44px
          dela e uma folga, menos o respiro que a coluna já tem): no fim da
          rolagem, a última linha — os controles de um item, "Salvar", o QR —
          fica acima da pílula, não embaixo. Some onde a pílula some. */}
      <div
        aria-hidden="true"
        className={cn(
          'h-[calc(3.25rem+var(--safe-bottom))] shrink-0 lg:h-11',
          layout === 'lg' && 'lg:hidden',
          layout === 'xl' && 'xl:hidden',
          pillOffPhone && 'max-lg:hidden',
        )}
      />

      <BottomSheet
        open={sheetOpen && lg === false}
        onClose={() => setSheetOpen(false)}
        title={ready ? t('ready.title') : t('title')}
        desktop="sheet"
        // `undefined`, e não `null`, sem ação: com qualquer outro valor a folha
        // desenha a faixa do rodapé vazia.
        footer={
          action ? (
            // O link muda de tela e a folha fecha junto; com uma alteração por
            // salvar, a pergunta de sair aparece por cima e a folha espera.
            <div onClick={() => setSheetOpen(false)}>
              <Button href={action.href} variant={action.variant} fullWidth after={<NavIcon />}>
                {action.label}
              </Button>
            </div>
          ) : undefined
        }
      >
        {ready ? (
          <p className="px-4 pb-4 text-body2 text-gray-600">{readyText}</p>
        ) : (
          <>
            <p className="px-4 text-caption text-gray-600">{t('progress', { done, total })}</p>
            <ProgressBar percent={percent} className="mx-4 mt-3" />
            <div className="px-2 py-2">{stepList(() => setSheetOpen(false))}</div>
          </>
        )}
      </BottomSheet>
    </>
  );
}

/** Os passos, cada um com o que ficou gravado ou com o que falta. */
function StepList({
  steps,
  next,
  pathname,
  t,
  locale,
  onNavigate,
}: {
  steps: SetupStepState[];
  next: SetupStepState | null;
  pathname: string;
  t: Translate;
  locale: string;
  /** Na folha do celular: fecha a folha ao tocar num passo. */
  onNavigate?: () => void;
}) {
  return (
    <ol>
      {steps.map((step) => {
        const current = step.step === next?.step;
        const here = step.href === pathname;
        const required = !step.done && step.required;
        const detail = step.done
          ? describeSummary(step.summary, t, locale)
          : step.pending
            ? t(`pending.${step.pending}`)
            : '';
        return (
          <li key={step.step}>
            <Link
              href={step.href}
              onClick={onNavigate}
              aria-current={here ? 'page' : undefined}
              className={cn(
                'press flex items-center gap-3 rounded-sm px-2 py-2.5 hover:bg-gray-50',
                // A tela aberta agora: com o "Continuar" escondido, é o que diz
                // "você está aqui".
                here && 'bg-gray-50',
              )}
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
                {/* O título tem a largura inteira: com o selo na mesma linha,
                    "Primeiro item no cardápio" e "Horário de funcionamento"
                    quebravam em duas no guia de 22rem. */}
                <span
                  className={cn(
                    'block text-body2',
                    step.done ? 'text-gray-600' : 'font-semibold text-gray-700',
                  )}
                >
                  {t(`steps.${step.step}`)}
                  <span className="sr-only">{step.done ? t('stepDone') : t('stepPending')}</span>
                </span>
                {(detail || required) && (
                  <span
                    className={cn(
                      'mt-0.5 block text-caption text-gray-600',
                      // O resumo do que foi gravado cabe numa linha; o que falta
                      // é instrução e não pode perder o fim.
                      step.done && 'truncate',
                    )}
                  >
                    {/* O selo abre a linha do motivo, no fluxo do texto: alinha
                        pela linha de base e a frase quebra por baixo dele. O
                        espaço de verdade depois dele é para o leitor de tela,
                        que sem ele lia "ObrigatórioFalta…" numa palavra só. */}
                    {required && (
                      <>
                        <Tag tone="dark" className="mr-1">
                          {t('required')}
                        </Tag>{' '}
                      </>
                    )}
                    {detail}
                  </span>
                )}
              </span>

              <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-gray-400" />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/** O resumo de um passo concluído, em uma linha, no idioma da tela. */
function describeSummary(summary: SetupSummary | null, t: Translate, locale: string): string {
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
        const { zones, radiusKm, toArrange } = summary.delivery;
        // Sem bairro nem raio (e sem cobrar por km, onde raio zero é "sem
        // limite") a entrega continua valendo, com a taxa combinada na conversa:
        // o resumo diz como ficou em vez de "Entrega em 0 km". Quem decide é
        // `setup-steps.ts` (`toArrange`), para as duas telas não divergirem.
        if (toArrange) {
          parts.push(t('summary.deliveryToArrange'));
        } else {
          const area =
            zones > 0 ? t('summary.zones', { count: zones }) : formatRadius(radiusKm, locale);
          parts.push(t('summary.delivery', { area }));
        }
      }
      if (summary.pickup) parts.push(t('summary.pickup'));
      return parts.join(' • ');
    }
  }
}

function ProgressBar({ percent, className }: { percent: number; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('h-1 overflow-hidden rounded-full bg-gray-200', className)}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300 ease-standard"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
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

/**
 * Alguma barra de "Salvar" grudada está registrada em `bottom-inset.ts`? Lá a
 * propriedade `--panel-bottom-inset` só existe no `<html>` enquanto houver uma.
 * `false` no servidor: a barra se registra num efeito, depois da hidratação.
 */
function useBottomBarRegistered(): boolean {
  return useSyncExternalStore(
    subscribeRootStyle,
    () => document.documentElement.style.getPropertyValue('--panel-bottom-inset') !== '',
    () => false,
  );
}

function subscribeRootStyle(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['style'],
  });
  return () => observer.disconnect();
}

/**
 * A janela bate com a media query? `null` no servidor e na hidratação — lá a
 * largura não existe, e quem chama decide pelo CSS até o primeiro render do
 * navegador.
 */
function useMediaQuery(query: string): boolean | null {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => null,
  );
}
