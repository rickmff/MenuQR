'use client';

import { useInView } from 'motion/react';
import { useRef, useState, type RefObject } from 'react';
import { Container } from '@/components/ui/container';
import { cn } from '@/lib/cn';
import { steps } from '@/lib/platform';
import { StepDemo, StepPanel, type StepIndex } from './step-panel';

/** A linha do meio da tela: o passo "ativo" é o que está sobre ela. */
const CENTER_LINE = '-50% 0px -50% 0px';

/**
 * Como funciona, do lado do lojista: um painel só, fixo na tela enquanto os três
 * passos rolam ao lado, que muda de estado em vez de trocar de imagem — o prato
 * sendo cadastrado, o link com o QR code, o pedido chegando no WhatsApp.
 * No celular os passos vêm um abaixo do outro, cada um com o seu estado.
 *
 * O painel em si mora em `step-panel.tsx`: as telas de conta mostram os mesmos
 * três estados, lá em laço, porque não há rolagem para comandá-los.
 */
export function HowItWorks({ qrSvg, storeUrl }: { qrSvg: string; storeUrl: string }) {
  // Três refs nomeados, não um array: o lint do React Compiler trata índice em
  // array de refs como leitura de ref durante o render.
  const first = useRef<HTMLLIElement>(null);
  const second = useRef<HTMLLIElement>(null);
  const third = useRef<HTMLLIElement>(null);
  // O passo ativo é o que cruza o meio da tela, não o "mais visível": assim a
  // troca acontece no ponto exato entre um texto e o outro, em qualquer altura
  // de tela, e nunca cedo demais.
  const firstOn = useInView(first, { margin: CENTER_LINE });
  const secondOn = useInView(second, { margin: CENTER_LINE });
  const thirdOn = useInView(third, { margin: CENTER_LINE });
  const current: StepIndex | null = thirdOn ? 2 : secondOn ? 1 : firstOn ? 0 : null;

  // Trava no último passo visto. Sem ela, ao sair da seção por baixo o painel —
  // ainda na tela por um instante — voltaria ao cadastro.
  const [active, setActive] = useState<StepIndex>(0);
  if (current !== null && current !== active) setActive(current);

  return (
    <StepDemo>
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
        <ol className="space-y-16 lg:space-y-0">
          <Step ref={first} index={0} active={active} qrSvg={qrSvg} storeUrl={storeUrl} />
          <Step ref={second} index={1} active={active} qrSvg={qrSvg} storeUrl={storeUrl} />
          <Step ref={third} index={2} active={active} qrSvg={qrSvg} storeUrl={storeUrl} />
        </ol>

        {/* Faixa de 70vh centrada na tela, a mesma altura de cada passo: o
          * painel fica na vertical exata do texto que está sendo lido. */}
        <div className="hidden lg:block">
          <div className="sticky top-[15vh] flex h-[70vh] items-center">
            <StepPanel state={active} active qrSvg={qrSvg} storeUrl={storeUrl} />
          </div>
        </div>
      </Container>
    </StepDemo>
  );
}

function Step({
  ref,
  index,
  active,
  qrSvg,
  storeUrl,
}: {
  ref: RefObject<HTMLLIElement | null>;
  index: StepIndex;
  active: StepIndex;
  qrSvg: string;
  storeUrl: string;
}) {
  const step = steps[index];
  const isActive = active === index;
  // No celular cada passo tem o próprio painel, que anima uma vez, quando
  // entra na tela — e fica assim: subir e descer não apaga o que já apareceu.
  const panel = useRef<HTMLDivElement>(null);
  const seen = useInView(panel, { once: true, amount: 0.4 });

  return (
    <li
      ref={ref}
      className={cn(
        'transition-opacity duration-300 ease-standard lg:flex lg:min-h-[70vh] lg:flex-col lg:justify-center',
        !isActive && 'lg:opacity-40',
      )}
    >
      <p
        className={cn(
          'font-mono text-caption uppercase tracking-widest transition-colors duration-300 ease-standard',
          isActive ? 'text-primary' : 'text-gray-600',
        )}
      >
        {step.number} / {step.label}
      </p>
      <h3 className="mt-3 text-h5 font-bold tracking-tight text-gray-700 lg:text-h4">{step.title}</h3>
      <p className="mt-2 max-w-md text-body1 text-gray-600">{step.text}</p>
      <div ref={panel} className="mt-6 lg:hidden">
        <StepPanel state={index} active={seen} qrSvg={qrSvg} storeUrl={storeUrl} />
      </div>
    </li>
  );
}
