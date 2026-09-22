'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { demoMode } from '@/lib/demo/config';
import { businessOfUser, currentUser, useDemoState } from '@/lib/demo/store';
import { BUSINESS_SECTIONS, ONBOARDING_ORDER } from '@/components/painel/business-sections';
import { useOnboarding } from '@/components/painel/onboarding';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

/**
 * Guia de primeira visita: pede ao lojista para conferir cada aba de
 * configuração, uma por vez. Some sozinho quando todas foram vistas, e pode ser
 * dispensado a qualquer momento — quem já conhece o painel não é obrigado a
 * percorrer o roteiro.
 */
export function OnboardingGuide({ businessId }: { businessId?: string }) {
  // No modo demonstração o restaurante vive no navegador, então o servidor não
  // tem o id para passar: aqui ele vem do próprio store.
  const demoState = useDemoState();
  const demoBusiness = businessOfUser(demoState, currentUser(demoState)?.id ?? null);
  const id = businessId ?? (demoMode ? (demoBusiness?.id ?? '') : '');
  const onboarding = useOnboarding(id);
  /*
   * Se o lojista já está numa aba que falta conferir, o guia fala dela — mandá-lo
   * para outra seção enquanto ele olha esta seria trocar os pés pelas mãos.
   */
  const pathname = usePathname();
  const here = ONBOARDING_ORDER.find(
    (section) => BUSINESS_SECTIONS[section].href === pathname && !onboarding.done.includes(section),
  );

  if (!id) return null;
  if (!onboarding.active || !onboarding.next) return null;

  const target = here ?? onboarding.next;
  const step = onboarding.done.length + 1;
  const next = BUSINESS_SECTIONS[target];
  const onTarget = here !== undefined;

  return (
    <Card padding="md" className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-caption uppercase tracking-widest text-gray-600">
            Passo {step} de {onboarding.total}
          </p>
          <h2 className="mt-1 text-subtitle font-bold text-gray-700">
            Confira as configurações do restaurante
          </h2>
          <p className="mt-1 text-body2 text-gray-600">
            {onTarget ? (
              <>
                Confira <strong className="font-semibold text-gray-700">{next.label.toLowerCase()}</strong>{' '}
                abaixo e salve para seguir para a próxima.
              </>
            ) : (
              <>
                São as informações que o cliente vê no cardápio e as regras do pedido. Agora falta{' '}
                <strong className="font-semibold text-gray-700">{next.label}</strong>.
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!onTarget && (
            <Button href={next.href} size="sm">
              Conferir {next.label.toLowerCase()}
            </Button>
          )}
          <Button variant="text" size="sm" onClick={onboarding.dismiss}>
            Depois
          </Button>
        </div>
      </div>

      <ol className="mt-5 flex flex-wrap gap-2">
        {ONBOARDING_ORDER.map((section) => {
          const done = onboarding.done.includes(section);
          const current = section === target;
          return (
            <li key={section}>
              <Link
                href={BUSINESS_SECTIONS[section].href}
                aria-current={current ? 'step' : undefined}
                className={cn(
                  'press inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-caption font-semibold',
                  done && 'border-success-bg bg-success-bg text-success',
                  current && !done && 'border-primary text-primary',
                  !done && !current && 'border-gray-300 text-gray-600',
                )}
              >
                {done && <Check aria-hidden="true" className="size-3.5" />}
                {BUSINESS_SECTIONS[section].label}
              </Link>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
