import 'server-only';
import { randomUUID } from 'node:crypto';
import { db } from '../db/client';
import { ensureSchema } from '../db/migrate';

/**
 * Fotos enviadas pelo lojista, guardadas no próprio banco.
 *
 * O dono de restaurante não tem onde hospedar imagem, e o projeto não depende
 * de serviço externo: a foto chega já reduzida pelo navegador (poucas centenas
 * de KB) e cabe numa coluna BLOB, tanto no SQLite em arquivo quanto no Turso.
 * O valor guardado em `items.image` e `businesses.logo` é o caminho público
 * `/img/<id>`, servido por `src/app/img/[id]/route.ts`.
 */

export type ImageContentType = 'image/jpeg' | 'image/png' | 'image/webp';

export interface StoredImage {
  contentType: string;
  bytes: Uint8Array<ArrayBuffer>;
}

/**
 * Tipo da imagem lido dos primeiros bytes do arquivo.
 *
 * O `type` do upload e a extensão são informados por quem envia: um HTML ou um
 * SVG com script renomeado para .jpg passaria, e seria servido pelo nosso
 * domínio. A assinatura do arquivo não mente — e SVG, que é texto, não tem
 * como bater com nenhuma das três.
 */
export function detectImageType(bytes: Uint8Array): ImageContentType | null {
  const startsWith = (signature: number[], offset = 0) =>
    bytes.length >= offset + signature.length &&
    signature.every((byte, index) => bytes[offset + index] === byte);

  if (startsWith([0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  // WebP é um contêiner RIFF: "RIFF" + 4 bytes de tamanho + "WEBP". Só "RIFF"
  // não basta, porque WAV e AVI começam igual.
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) {
    return 'image/webp';
  }
  return null;
}

export async function insertImage(
  businessId: string,
  contentType: ImageContentType,
  bytes: Uint8Array,
): Promise<string> {
  await ensureSchema();
  const id = randomUUID();
  await db.execute({
    sql: 'INSERT INTO images (id, business_id, content_type, bytes, size) VALUES (?, ?, ?, ?, ?)',
    args: [id, businessId, contentType, bytes, bytes.byteLength],
  });
  return id;
}

export async function getImage(id: string): Promise<StoredImage | null> {
  await ensureSchema();
  const result = await db.execute({
    sql: 'SELECT content_type, bytes, size FROM images WHERE id = ? LIMIT 1',
    args: [id],
  });
  const row = result.rows[0];
  if (!row) return null;

  const bytes = toBytes(row.bytes);
  // O tamanho gravado junto serve de conferência: a resposta sai com cache de
  // um ano, então é melhor um 404 do que servir bytes a mais ou a menos.
  if (!bytes || bytes.byteLength !== Number(row.size)) return null;
  return { contentType: String(row.content_type), bytes };
}

/**
 * O libSQL devolve BLOB como ArrayBuffer nos dois modos (arquivo e remoto),
 * mas outros drivers da família devolvem Buffer/Uint8Array, que podem ser uma
 * janela dentro de um buffer maior. A cópia respeita offset e tamanho.
 */
function toBytes(value: unknown): Uint8Array<ArrayBuffer> | null {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    const copy = new Uint8Array(value.byteLength);
    copy.set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
    return copy;
  }
  return null;
}

/**
 * Apaga as fotos do negócio que ninguém usa mais.
 *
 * Trocar a foto de um prato, apagar o item ou desistir do formulário depois de
 * enviar deixa a imagem antiga sem dono — e cada uma ocupa centenas de KB do
 * banco. A folga de um dia existe porque a foto é enviada ANTES de o formulário
 * ser salvo: sem ela, a limpeza disparada pelo envio seguinte apagaria a foto
 * que o lojista acabou de escolher e ainda não salvou.
 *
 * A referência é procurada só dentro do próprio negócio: é o que os índices
 * por `business_id` cobrem, e o painel só grava `/img/<id>` de fotos que o
 * próprio negócio enviou.
 */
export async function deleteOrphanImages(businessId: string): Promise<number> {
  await ensureSchema();
  const result = await db.execute({
    sql: `DELETE FROM images
          WHERE business_id = ?
            AND created_at < datetime('now', '-1 day')
            AND NOT EXISTS (
              SELECT 1 FROM items
              WHERE items.business_id = images.business_id AND items.image = '/img/' || images.id
            )
            AND NOT EXISTS (
              SELECT 1 FROM businesses
              WHERE businesses.id = images.business_id AND businesses.logo = '/img/' || images.id
            )`,
    args: [businessId],
  });
  return result.rowsAffected;
}
