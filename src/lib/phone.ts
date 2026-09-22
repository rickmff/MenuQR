/**
 * WhatsApp do lojista, de qualquer país.
 *
 * O número é guardado como E.164 sem o "+" (`5511987654321`) — é esse formato
 * que o `wa.me` espera e é o que já está no banco. Quem faz as contas de país,
 * comprimento e formatação é a `libphonenumber-js`: são 245 países com regras
 * que mudam sozinhas, e manter essa tabela à mão seria errar em silêncio.
 *
 * O telefone do cliente no checkout NÃO passa por aqui: ele continua em
 * `format.ts` (`maskPhone`, `isValidPhone`), sem a biblioteca, para não pesar
 * o bundle da loja.
 */

import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  parsePhoneNumberFromString,
  type CountryCode,
  type Examples,
} from 'libphonenumber-js';
import examplesJson from 'libphonenumber-js/examples.mobile.json';
import { onlyDigits } from './format';

export type { CountryCode };

const examples = examplesJson as Examples;

/** País sugerido: é de onde vem quase toda loja do MenuQR. */
export const DEFAULT_COUNTRY: CountryCode = 'BR';

export interface CountryOption {
  code: CountryCode;
  /** Nome em pt-BR vindo do `Intl` do próprio ambiente — não de uma lista nossa. */
  name: string;
  /** Código do país sem o "+": "55", "351". */
  callingCode: string;
  /** Texto de busca: nome sem acento, sigla e código. */
  search: string;
}

const deburr = (value: string) =>
  value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

let cachedOptions: CountryOption[] | null = null;

/** Lista do seletor: Brasil primeiro, o resto em ordem alfabética de pt-BR. */
export function countryOptions(): CountryOption[] {
  if (cachedOptions) return cachedOptions;

  const names = new Intl.DisplayNames(['pt-BR'], { type: 'region' });
  const options = getCountries().map((code) => {
    const name = names.of(code) ?? code;
    const callingCode = getCountryCallingCode(code);
    return {
      code,
      name,
      callingCode,
      search: `${deburr(name)} ${code.toLowerCase()} +${callingCode}`,
    };
  });
  options.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  cachedOptions = [
    ...options.filter((option) => option.code === DEFAULT_COUNTRY),
    ...options.filter((option) => option.code !== DEFAULT_COUNTRY),
  ];
  return cachedOptions;
}

export function callingCodeOf(country: CountryCode): string {
  return getCountryCallingCode(country);
}

export function countryName(country: CountryCode): string {
  return countryOptions().find((option) => option.code === country)?.name ?? country;
}

/** Máscara do país enquanto se digita: 11987654321 vira (11) 98765-4321. */
export function formatNational(value: string, country: CountryCode): string {
  return new AsYouType(country).input(onlyDigits(value));
}

/** Número de exemplo do país, para o placeholder do campo. */
export function exampleNumber(country: CountryCode): string {
  return getExampleNumber(country, examples)?.formatNational() ?? '';
}

/**
 * Número guardado de volta em país + número nacional, para editar no campo.
 * Cadastro antigo que não dá para reconhecer volta como número do Brasil: é
 * melhor mostrar algo corrigível do que um campo vazio.
 */
export function splitWhatsapp(stored: string): { country: CountryCode; national: string } {
  const digits = onlyDigits(stored);
  if (!digits) return { country: DEFAULT_COUNTRY, national: '' };

  const parsed = parsePhoneNumberFromString(`+${digits}`);
  const country =
    parsed?.country ??
    (parsed && countryOptions().find((option) => option.callingCode === parsed.countryCallingCode)?.code);

  // `formatNational` da biblioteca, e não a máscara em cima dos dígitos: em
  // países com prefixo de tronco (o "011" da Argentina) é ele que mostra o
  // número como a pessoa de lá o escreve.
  if (parsed && country) {
    return { country, national: parsed.formatNational() };
  }

  const national = digits.startsWith('55') ? digits.slice(2) : digits;
  return { country: DEFAULT_COUNTRY, national: formatNational(national, DEFAULT_COUNTRY) };
}

/**
 * País + número nacional no formato guardado. Passa pela biblioteca porque
 * vários países têm prefixo de tronco que não entra no E.164 — o 0 de "011"
 * na Argentina, por exemplo. Enquanto o número está incompleto não há o que
 * interpretar: vale a emenda simples, e a validação barra na hora de salvar.
 */
export function joinWhatsapp(country: CountryCode, national: string): string {
  const digits = onlyDigits(national);
  if (!digits) return '';
  const parsed = parsePhoneNumberFromString(digits, country);
  return parsed ? onlyDigits(parsed.number) : `${getCountryCallingCode(country)}${digits}`;
}

/**
 * Número internacional colado no campo ("+351 912 345 678"). Devolve `null`
 * enquanto os dígitos não bastam para saber o país — aí o campo deixa o texto
 * como está e tenta de novo na próxima tecla.
 */
export function readInternational(
  value: string,
): { country: CountryCode; national: string } | null {
  const typed = new AsYouType();
  typed.input(value);
  const country = typed.getCountry();
  if (!country) return null;

  const callingCode = getCountryCallingCode(country);
  const digits = onlyDigits(value);
  const national = digits.startsWith(callingCode) ? digits.slice(callingCode.length) : digits;
  return { country, national: formatNational(national, country) };
}

/**
 * O que veio do formulário vira o formato guardado. O campo novo manda sempre
 * "+55…"; texto sem "+" com 10 ou 11 dígitos é de quem digitou só DDD + número
 * (cadastro antigo, semente, modo demo) e continua ganhando o 55 do Brasil.
 */
export function normalizeWhatsapp(value: string): string {
  const raw = (value ?? '').trim();
  const digits = onlyDigits(raw).replace(/^0+/, '');
  if (raw.startsWith('+')) return digits;
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
}

/** O número guardado é um telefone possível no país dele? */
export function isValidWhatsapp(stored: string): boolean {
  const digits = onlyDigits(stored);
  // E.164 vai de 8 (código do país + assinante curto) a 15 dígitos.
  if (digits.length < 8 || digits.length > 15) return false;
  return parsePhoneNumberFromString(`+${digits}`)?.isValid() ?? false;
}

/**
 * Exibição do WhatsApp do restaurante no painel. Número do Brasil aparece como
 * o brasileiro lê — (11) 98765-4321; fora daqui o código do país faz parte do
 * número e precisa estar à vista: +351 912 345 678.
 *
 * A loja usa a versão leve (`formatWhatsapp`, em `format.ts`) — ver o comentário
 * de lá.
 */
export function displayWhatsapp(stored: string): string {
  const digits = onlyDigits(stored);
  if (!digits) return '';
  const parsed = parsePhoneNumberFromString(`+${digits}`);
  if (!parsed) return `+${digits}`;
  return parsed.country === DEFAULT_COUNTRY ? parsed.formatNational() : parsed.formatInternational();
}
