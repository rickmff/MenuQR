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
