import { Plus } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';

/**
 * O botão de acrescentar do painel — e o único desenho que essa ação tem.
 *
 * Antes de 2026-09-23 a mesma ação aparecia de quatro jeitos na mesma tela:
 * linha fantasma verde no fim do card ("Adicionar item"), caixa tracejada
 * ("Nova categoria"), `Button secondary` ("Grupo de complementos") e
 * `Button text` ("Opção") — com o "+" ora em 20px, ora em 16px. Decisão do
 * dono (D23): acrescentar é sempre um `Button secondary size="sm"` com o "+"
 * à esquerda, esteja ele dentro de um card, dentro de um fieldset ou solto na
 * página. O que muda entre os casos é só onde ele fica, nunca a aparência.
 *
 * O componente existe para que isso não precise ser lembrado: quem escrever a
 * próxima lista do painel importa o `AddButton` e não decide nada.
 *
 * O rótulo começa com o verbo, como todo botão do produto (`copy.md`):
 * "Adicionar item", não "Item" nem "Novo item".
 */
export type AddButtonProps = Omit<
  ButtonProps,
  'variant' | 'size' | 'leading' | 'trailing' | 'after' | 'pill' | 'fullWidth'
>;

export function AddButton({ children, ...rest }: AddButtonProps) {
  return (
    <Button
      {...rest}
      variant="secondary"
      size="sm"
      leading={<Plus aria-hidden="true" className="size-4" />}
    >
      {children}
    </Button>
  );
}
