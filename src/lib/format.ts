/** Formatação de moeda, telefone e texto usada em todo o site. */

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatPrice(value: number): string {
  return currency.format(Number.isFinite(value) ? value : 0);
}

/** Formato exigido pelo schema.org (`priceCurrency` separado): "29.90". */
export function schemaPrice(value: number): string {
  return (Number.isFinite(value) ? value : 0).toFixed(2);
}

export function onlyDigits(value: string): string {
  return (value ?? "").replace(/\D/g, "");
}

/** Máscara progressiva: (11) 98765-4321 */
export function maskPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function isValidPhone(value: string): boolean {
  const digits = onlyDigits(value);
  return digits.length === 10 || digits.length === 11;
}

/** Lê valores digitados como "R$ 1.234,50" e devolve 1234.5. */
export function parseMoney(value: string): number {
  const raw = (value ?? "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number.parseFloat(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Preço digitado pelo lojista: aceita "29,90", "29.90", "R$ 1.234,50" e
 * "R$ 1.000". Campo vazio ou texto sem número devolve `null` — não pode virar
 * R$ 0,00 calado.
 */
export function parsePriceInput(value: string): number | null {
  const raw = (value ?? "").replace(/[^\d,.]/g, "");
  if (!/\d/.test(raw)) return null;
  // Com vírgula, o ponto é separador de milhar. Sem vírgula, o ponto é o
  // decimal ("9.5") — menos quando ele separa grupos de três ("1.000",
  // "12.500"): é assim que o brasileiro escreve mil, e ler 1 gravava a
  // "entrega grátis acima de R$ 1.000" como acima de R$ 1,00.
  const thousands = /^[1-9]\d{0,2}(\.\d{3})+$/.test(raw);
  const normalized = raw.includes(",") || thousands
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Número no formato em que o lojista digita e lê: "6,00", "1,5". É o par de
 * `parsePriceInput` para devolver ao campo o que foi gravado — sem ele, "9,50"
 * voltava como "9.5". Zero volta vazio: nos campos do painel, vazio quer dizer
 * "desligado" e o placeholder já mostra o formato.
 */
export function formatDecimalInput(value: number, fractionDigits = 2): string {
  if (!Number.isFinite(value) || value === 0) return "";
  return value.toFixed(fractionDigits).replace(".", ",");
}

/**
 * WhatsApp do restaurante na loja: número do Brasil como o brasileiro lê e
 * qualquer outro em E.164 ("+351912345678").
 *
 * A formatação que conhece os 245 países está em `phone.ts` (`displayWhatsapp`)
 * e é a do painel. Ela não entra aqui de propósito: `format.ts` é importado
 * pela loja, e a tabela da libphonenumber pesa 150 KB no aparelho de quem só
 * quer fazer um pedido.
 */
export function formatWhatsapp(digits: string): string {
  const clean = onlyDigits(digits);
  return clean.startsWith("55") && clean.length >= 12
    ? maskPhone(clean.slice(2))
    : `+${clean}`;
}

const UPLOADED_IMAGE =
  /^\/img\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Foto enviada pelo painel e guardada no banco: exatamente `/img/<uuid>`, em
 * minúsculas, como o servidor gera. É o único caminho local que o lojista pode
 * cadastrar — qualquer outro (`/painel`, `/img/../x`) apontaria uma <img> do
 * cardápio para uma rota do próprio app.
 */
export function isUploadedImage(value: string): boolean {
  return UPLOADED_IMAGE.test(value);
}

const EXAMPLE_IMAGE = /^\/exemplo\/[a-z0-9-]+\.jpg$/;

/**
 * Foto do restaurante de exemplo: arquivo em `public/exemplo`, gravado por
 * `npm run fotos:exemplo`. Aceita porque o dono do exemplo pode editar o prato
 * no painel e o formulário devolve o valor como está.
 */
export function isExampleImage(value: string): boolean {
  return EXAMPLE_IMAGE.test(value);
}

/** Foto servida pelo próprio site (enviada ou do exemplo): ganha o domínio quando sai dele. */
export function isLocalPhoto(value: string): boolean {
  return isUploadedImage(value) || isExampleImage(value);
}

/** A referência é uma foto (enviada, do exemplo ou hospedada fora), e não um emoji? */
export function isPhotoRef(value: string): boolean {
  return isLocalPhoto(value) || /^https?:\/\//i.test(value);
}

/** Imagem cadastrada pelo lojista: emoji, foto enviada pelo painel ou URL de foto já hospedada. */
export function isValidImageRef(value: string): boolean {
  if (!value) return true;
  if (isLocalPhoto(value)) return true;
  if (/^https?:\/\//i.test(value)) {
    try {
      return Boolean(new URL(value).hostname);
    } catch {
      return false;
    }
  }
  return !/[/\\.:]/.test(value) && [...value].length <= 8;
}

/** Formato E.164 para links tel: e schema.org. Ex.: +5511987654321 */
export function toE164(digits: string): string {
  return `+${onlyDigits(digits)}`;
}

/**
 * Como chamar o lojista na tela: quem não preencheu o nome é chamado pelo
 * começo do e-mail, antes do @ — "joao" em vez de "joao@padaria.com.br".
 */
export function nameOrEmail(name: string, email: string): string {
  return name.trim() || email.split("@")[0] || email;
}

const SMALL_WORDS = new Set(["e", "de", "da", "do", "das", "dos", "a", "o"]);

/**
 * "sabor-e-brasa" vira "Sabor e Brasa" — nome de recurso quando não há dados.
 * `fallback` é o que volta para um slug vazio (quem chama traduz).
 */
export function nameFromSlug(slug: string, fallback = ""): string {
  const words = slug.split("-").filter(Boolean);
  if (!words.length) return fallback;
  return words
    .map((word, index) =>
      index > 0 && SMALL_WORDS.has(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}
