'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { StepDemo, StepPanel, type StepIndex } from '@/components/platform/landing/step-panel';
import { cn } from '@/lib/cn';
import { platform, steps } from '@/lib/platform';

/**
 * A tela de conta mostra o produto funcionando, não um artefato parado: é o
 * mesmo painel dos três passos da landing — cadastrar o prato, compartilhar o
 * link com o QR code, receber o pedido no WhatsApp — em laço, porque aqui não
 * há rolagem para comandar a troca.
 *
 * Só aparece a partir de `lg`, e só em `/entrar` e `/criar-conta`: no celular a
 * tela é o formulário e mais nada (ver `auth-shell.tsx`).
 */

/** Quanto cada passo fica na tela. O primeiro é mais longo: ali um formulário se digita sozinho. */
const DURATION: Record<StepIndex, number> = { 0: 7000, 1: 5000, 2: 5000 };

const ORDER: StepIndex[] = [0, 1, 2];

export function AuthAside({ qrSvg, storeUrl }: { qrSvg: string; storeUrl: string }) {
  const t = useTranslations('platform');
  const [state, setState] = useState<StepIndex>(0);
  // Conteúdo que se troca sozinho precisa ter como parar: o laço congela
  // enquanto o cursor está sobre ele ou algo ali dentro tem o foco, e as
  // bolinhas passam o comando para quem quiser ver um passo de novo.
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(
      () => setState((current) => ORDER[(current + 1) % ORDER.length]!),
      DURATION[state],
    );
    return () => window.clearTimeout(timer);
  }, [paused, state]);

  const step = steps[state];

  return (
    <aside
      aria-label={t('authAside.label', { name: platform.name })}
      className="wallpaper relative hidden items-center justify-center overflow-hidden border-l border-gray-200 p-10 lg:flex"
    >
      <StepDemo>
        <div
          className="w-full max-w-[28rem]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          {/* `green-700`: esta coluna é `wallpaper`, e sobre o bege o `primary`
            * dá 3,91:1 — reprova na WCAG AA em 12px. */}
          <p className="font-display text-caption font-semibold text-green-700">
            {step.number} / {t(`steps.${step.key}.label`)}
          </p>
          {/* Duas linhas reservadas: o título mais longo quebra em telas `lg`
            * estreitas, e o painel abaixo não pode subir e descer com ele. */}
          <p className="mb-5 mt-2 min-h-[3.75rem] font-display text-h5 font-bold text-gray-900">
            {t(`steps.${step.key}.title`)}
          </p>

          {/* Altura do passo mais alto reservada: os três têm tamanhos
            * diferentes, e sem isso a coluna inteira se recentraria a cada
            * troca — o texto ao lado ficaria pulando de lugar. */}
          <div className="flex min-h-[26rem] flex-col">
            <StepPanel state={state} active qrSvg={qrSvg} storeUrl={storeUrl} />
          </div>

          <div className="mt-5 flex justify-center gap-2">
            {ORDER.map((index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setState(index);
                  setPaused(true);
                }}
                aria-label={t(`steps.${steps[index].key}.title`)}
                aria-current={index === state ? 'true' : undefined}
                className="press grid h-8 place-items-center px-1"
              >
                <span
                  className={cn(
                    'block h-1.5 rounded-full transition-all duration-300 ease-standard',
                    index === state ? 'w-6 bg-primary' : 'w-1.5 bg-gray-300',
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </StepDemo>
    </aside>
  );
}
