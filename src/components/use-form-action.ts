'use client';

import { startTransition, useActionState, type FormEvent } from 'react';

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

export function useFormAction<State>(
  action: (state: Awaited<State>, formData: FormData) => State | Promise<State>,
  initialState: Awaited<State>,
) {
  const [state, dispatch, pending] = useActionState(action, initialState);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };

  return { state, formProps: { action: dispatch, onSubmit }, pending };
}
