'use client';

import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type RefObject,
} from 'react';

/**
 * `useActionState` para formulários longos.
 *
 * Quando a ação roda pelo `action` do <form>, o React 19 limpa todos os campos
 * não controlados assim que ela termina — inclusive quando o retorno é um erro
 * de validação. Num formulário de 25 campos isso significa perder tudo por
 * causa de um WhatsApp digitado errado. Disparando a ação pelo `onSubmit`, o
 * que o lojista digitou fica onde está.
 *
 * O `action` continua no <form> para o envio funcionar antes da hidratação.
 * Como o envio não passa mais pelo <form>, `useFormStatus` não enxerga o
 * andamento: use o `pending` devolvido aqui.
 */
/**
 * Tem alguma coisa dentro do formulário?
 *
 * Conta só o que a pessoa preenche: os campos ocultos de contexto (o negócio, o
 * item, a categoria quando só existe uma) vêm sempre preenchidos e diriam "sim"
 * com o formulário em branco — daí `ignored`. É o que segura "Salvar" e
 * "Limpar" apagados enquanto não há o que salvar nem o que limpar.
 */
export function formHasContent(form: HTMLFormElement | null, ignored: string[] = []): boolean {
  if (!form) return false;
  for (const [field, value] of new FormData(form)) {
    if (ignored.includes(field)) continue;
    if (typeof value === 'string' ? value.trim() !== '' : value.size > 0) return true;
  }
  return false;
}

/** Nome do campo que disparou o evento; `*` para o que não tem nome. */
function fieldNameOf(target: EventTarget | null): string {
  const name = (target as { name?: unknown } | null)?.name;
  return typeof name === 'string' && name ? name : '*';
}

/**
 * O formulário em texto, para comparar "como está" com "como foi gravado". Um
 * arquivo entra pelo nome, tamanho e data — o conteúdo não importa aqui. O
 * campo de arquivo vazio entra vazio: o `File` que o navegador põe no lugar
 * dele leva a hora de AGORA em `lastModified`, e duas leituras nunca bateriam.
 */
function serializeForm(form: HTMLFormElement | null): string {
  if (!form) return '';
  const parts: string[] = [];
  for (const [field, value] of new FormData(form)) {
    if (typeof value === 'string') parts.push(`${field}=${value}`);
    else parts.push(`${field}=${value.size ? `${value.name}:${value.size}:${value.lastModified}` : ''}`);
  }
  return JSON.stringify(parts);
}

function hasSuccess(state: unknown): boolean {
  return Boolean(state && typeof state === 'object' && (state as { success?: unknown }).success);
}

interface EditTrack<State> {
  /** A resposta a que estas edições se referem. Resposta nova zera a lista. */
  state: State;
  /** Campos mexidos desde a última resposta do servidor. */
  names: ReadonlySet<string>;
  /** O formulário está diferente do último salvar que deu certo (ou da abertura). */
  dirty: boolean;
}

const EMPTY: ReadonlySet<string> = new Set();

/**
 * O formulário depois de uma resposta:
 *
 * - `isEdited(nome)`: o lojista mexeu neste campo depois da última resposta. O
 *   erro que o servidor devolveu para ele já não vale — esconda-o (o lojista
 *   corrigia a data e o "Preencha a abertura" continuava na tela).
 * - `edited`: mexeu em qualquer campo depois da última resposta. A faixa
 *   "Não foi salvo…" e o "Alterações salvas." do envio anterior saem de cena.
 * - `dirty`: o formulário está DIFERENTE do que foi gravado — da abertura ou
 *   do último salvar que deu certo. Um erro de validação NÃO limpa: o que foi
 *   digitado continua sem salvar. É o que alimenta `useLeaveGuard`.
 *
 * O rastreio vem do `onInput` em `formProps`. Formulário que tem o próprio
 * `onInput` precisa chamar `formProps.onInput(event)` também. Mudança que não
 * passa por um campo (interruptor, foto, lista montada em estado) avisa por
 * `markEdited(nome)`.
 *
 * **"Diferente", não "mexeu".** Antes `dirty` virava verdadeiro no primeiro
 * evento e só voltava com um salvar: trocar 18:00 por 19:00 e voltar para
 * 18:00, ou ligar e desligar um dia, já fazia a aba perguntar "Descartar
 * alterações?" em cima de uma tela idêntica à gravada. Agora cada aviso de
 * mudança compara o envio inteiro (`FormData`, campos ocultos inclusos — é
 * neles que mora o que vive em estado) com um instantâneo tirado ao montar e
 * depois de cada salvar que deu certo. A comparação roda num efeito, depois do
 * desenho que o aviso provoca: quem avisa por `markEdited` acabou de pedir um
 * `setState`, e o campo oculto só tem o valor novo depois que o React desenhar
 * — o aviso e esse `setState` saem juntos no mesmo desenho. (Um `setTimeout`
 * logo no aviso não garante isso: a foto avisa depois de um `await`, fora de
 * evento, e o timer podia ler o formulário antes do React desenhar o endereço
 * novo — a foto "enviada, salve para aplicar" saía sem pergunta.) E nada roda
 * sem um aviso —
 * o que a tela faz sozinha ao montar (o mapa se ajeitando, efeitos) nunca
 * conta como alteração. `formProps` leva o `ref` do formulário (`formRef`,
 * devolvido também para quem precisa dele).
 */
export function useFormAction<State>(
  action: (state: Awaited<State>, formData: FormData) => State | Promise<State>,
  initialState: Awaited<State>,
  /** O `ref` que o formulário já usa, quando quem chama precisa dele antes (senão, um próprio). */
  externalFormRef?: RefObject<HTMLFormElement | null>,
) {
  const [state, dispatch, pending] = useActionState(action, initialState);
  const [track, setTrack] = useState<EditTrack<Awaited<State>>>({ state, names: EMPTY, dirty: false });
  // Avisos de mudança: cada um pede uma comparação depois do desenho. Fica fora
  // de `track` para o aviso repetido não trocar o `isEdited` dos filhos.
  const [checks, setChecks] = useState(0);
  const ownFormRef = useRef<HTMLFormElement>(null);
  const formRef = externalFormRef ?? ownFormRef;
  // Como o formulário estava gravado. `null` até o primeiro efeito.
  const snapshot = useRef<string | null>(null);

  // Ao montar e depois de cada salvar que deu certo, a tela passa a ser "o
  // gravado". Roda depois dos efeitos dos filhos, com o formulário já desenhado
  // (inclusive o que volta em branco depois de acrescentar um item).
  useEffect(() => {
    if (snapshot.current === null || hasSuccess(state)) snapshot.current = serializeForm(formRef.current);
  }, [state, formRef]);

  // Depois do desenho de um aviso: a tela ainda é a gravada? O `setTrack` vai
  // num timer, e não no corpo do efeito (regra do React Compiler); aviso novo
  // antes dele cancela este e compara de novo.
  useEffect(() => {
    if (checks === 0) return;
    const form = formRef.current;
    if (!form || snapshot.current === null) return;
    const dirty = serializeForm(form) !== snapshot.current;
    const timer = setTimeout(() => {
      setTrack((previous) => (previous.dirty === dirty ? previous : { ...previous, dirty }));
    }, 0);
    return () => clearTimeout(timer);
  }, [checks, formRef]);

  // Resposta nova: ajusta durante o render, e não num efeito (regra do
  // React Compiler), como `bottom-sheet.tsx` e `tabs.tsx` fazem.
  let current = track;
  if (track.state !== state) {
    current = { state, names: EMPTY, dirty: hasSuccess(state) ? false : track.dirty };
    setTrack(current);
  }

  const markEdited = useCallback((name = '*') => {
    setTrack((previous) => {
      if (previous.names.has(name)) return previous;
      const names = new Set(previous.names);
      names.add(name);
      return { ...previous, names };
    });
    setChecks((count) => count + 1);
  }, []);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };

  const onInput = (event: FormEvent<HTMLFormElement>) => markEdited(fieldNameOf(event.target));

  return {
    state,
    formProps: { ref: formRef, action: dispatch, onSubmit, onInput },
    /** O <form> (o mesmo `ref` que vai em `formProps`). */
    formRef,
    pending,
    /** O lojista mexeu neste campo depois da última resposta. */
    isEdited: (name: string) => current.names.has(name),
    /** Mexeu em algum campo depois da última resposta. */
    edited: current.names.size > 0,
    /** Há alteração ainda não salva. */
    dirty: current.dirty,
    markEdited,
  };
}

const noopSubscribe = () => () => {};

/**
 * `true` depois que a página hidratou. Antes disso um clique em "Enviar" faz o
 * POST nativo do formulário, sem o estado dos campos controlados (o telefone,
 * por exemplo, mora num campo oculto espelhado do estado) — o botão principal
 * de um formulário assim nasce desabilitado e liga aqui.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
