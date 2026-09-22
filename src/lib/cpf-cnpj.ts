/**
 * CPF e CNPJ: o documento que o lojista informa para a cobrança. O Asaas exige
 * um válido para criar o cliente, e é ele que sai no comprovante.
 *
 * O CNPJ alfanumérico (letras nas oito primeiras posições, dígitos
 * verificadores numéricos) vale desde julho de 2026: o cálculo usa o código
 * ASCII menos 48, que para dígitos é o próprio valor.
 */

export function normalizeCpfCnpj(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidCpf(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  const check = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) sum += Number(digits[index]) * (length + 1 - index);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(digits[9]) && check(10) === Number(digits[10]);
}

const CNPJ_WEIGHTS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_WEIGHTS_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export function isValidCnpj(value: string): boolean {
  const clean = normalizeCpfCnpj(value);
  if (!/^[A-Z0-9]{12}\d{2}$/.test(clean) || /^(.)\1{13}$/.test(clean)) return false;
  const values = [...clean.slice(0, 12)].map((char) => char.charCodeAt(0) - 48);
  const check = (entries: number[], weights: number[]) => {
    const sum = entries.reduce((total, entry, index) => total + entry * (weights[index] ?? 0), 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const first = check(values, CNPJ_WEIGHTS_1);
  const second = check([...values, first], CNPJ_WEIGHTS_2);
  return first === Number(clean[12]) && second === Number(clean[13]);
}

export function isValidCpfCnpj(value: string): boolean {
  const clean = normalizeCpfCnpj(value);
  if (clean.length === 11) return isValidCpf(clean);
  if (clean.length === 14) return isValidCnpj(clean);
  return false;
}

/** Máscara de exibição; devolve o valor como veio se não for CPF nem CNPJ completo. */
export function formatCpfCnpj(value: string): string {
  const clean = normalizeCpfCnpj(value);
  if (clean.length === 11) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
  if (clean.length === 14) {
    return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12)}`;
  }
  return value;
}
