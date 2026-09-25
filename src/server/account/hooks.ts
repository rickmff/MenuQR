import 'server-only';

export interface AccountDeletionContext {
  userId: string;
  businessIds: string[];
  slugs: string[];
}

/** Roda antes de os dados da conta serem apagados. Lançar `AccountDeletionBlocked` impede a exclusão. */
export type BeforeAccountDeleted = (context: AccountDeletionContext) => Promise<void>;

/**
 * Erro com mensagem para o lojista: a exclusão não pôde acontecer e ele
 * precisa saber o que fazer (tentar de novo, falar com o suporte). Qualquer
 * outro erro é tratado como falha interna, com mensagem genérica na tela.
 *
 * `code` é a chave em `account.delete.errors`: a tela traduz no idioma de
 * quem pediu; `message` (em português) fica para o log do webhook.
 */
export class AccountDeletionBlocked extends Error {
  constructor(
    readonly code: 'subscriptionCancelFailed',
    message?: string,
  ) {
    super(message ?? code);
  }
}

