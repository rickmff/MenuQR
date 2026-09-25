import { NextResponse } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { localeFromRequest } from '@/i18n/locale';
import { demoMode } from '@/lib/demo/config';
import { assertOwnership } from '@/server/auth/guards';
import { getCurrentUser } from '@/server/auth/current-user';
import { rateLimit } from '@/server/rate-limit';
import { deleteOrphanImages, detectImageType, getImageUsage, insertImage } from '@/server/repositories/images';

/**
 * A foto chega já reduzida pelo navegador (`image-field.tsx` mira ~400 KB). A
 * folga até 600 KB cobre foto muito detalhada e navegador que só sabe gerar
 * JPEG; acima disso é arquivo que não passou pelo painel.
 */
const MAX_IMAGE_BYTES = 600 * 1024;
/** O multipart acrescenta cabeçalhos e o campo `businessId` em volta do arquivo. */
const MAX_BODY_BYTES = MAX_IMAGE_BYTES + 16 * 1024;

const UPLOADS_PER_HOUR = 60;

/**
 * Teto por restaurante. Um cardápio típico tem 30 fotos de ~150 KB (4,5 MB);
 * 300 fotos de ~200 KB dão 60 MB, e o plano gratuito do Turso (5 GB) comporta
 * ~80 lojas nesse teto. Sem isto, uma conta enchia o banco de todo mundo.
 */
const MAX_IMAGES_PER_BUSINESS = 300;
const MAX_BYTES_PER_BUSINESS = 60 * 1024 * 1024;

/** Toda resposta é JSON e a mensagem de erro já sai pronta para o lojista ler. */
function fail(status: number, error: string, headers?: Record<string, string>) {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

/**
 * Server Actions conferem a origem sozinhas; rota não. O cookie de sessão é
 * SameSite=Lax, o que já barra o POST vindo de outro site — esta conferência é
 * a segunda tranca. Atrás de proxy o host original vem em `x-forwarded-host`
 * (o mesmo critério das Server Actions). Sem `Origin` a requisição não veio de
 * um navegador atual, e o painel é o único cliente desta rota.
 */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const host =
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Lê o corpo até o limite e desiste. `request.formData()` colocaria o envio
 * inteiro na memória antes de qualquer conferência, e `Content-Length` some
 * num envio em pedaços (chunked).
 */
async function readBody(request: Request, limit: number): Promise<Uint8Array<ArrayBuffer> | null> {
  if (Number(request.headers.get('content-length') ?? 0) > limit) return null;
  if (!request.body) return new Uint8Array(0);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

/** Recebe uma foto do painel, guarda no banco e devolve o caminho público dela. */
export async function POST(request: Request) {
  const t = await getTranslations({ locale: await localeFromRequest(), namespace: 'api' });
  // Sem banco não há onde guardar; o painel nem mostra o botão neste modo.
  if (demoMode) return fail(503, t('images.demo'));

  if (!isSameOrigin(request)) {
    return fail(403, t('images.badOrigin'));
  }

  try {
    // A sessão é conferida antes de ler o corpo: visitante sem login não faz o
    // servidor guardar nada na memória. É também o que separa o 401 do 403 —
    // `assertOwnership` lança o mesmo tipo de erro para os dois casos.
    if (!(await getCurrentUser())) {
      return fail(401, t('images.sessionExpired'));
    }

    const body = await readBody(request, MAX_BODY_BYTES);
    if (!body) return fail(413, t('images.tooLarge'));

    const form = await new Response(body, {
      headers: { 'Content-Type': request.headers.get('content-type') ?? '' },
    })
      .formData()
      .catch(() => null);
    const file = form?.get('file');
    const businessId = form?.get('businessId');
    if (!(file instanceof File) || typeof businessId !== 'string' || !businessId) {
      return fail(400, t('images.missingFile'));
    }

    let business;
    try {
      ({ business } = await assertOwnership(businessId));
    } catch {
      return fail(403, t('images.notOwner'));
    }

    // Por negócio, e não por IP: o banco que enche é o do negócio, e o lojista
    // pode alternar entre o celular e o computador. 60 por hora sobra para
    // montar um cardápio inteiro de uma vez.
    const limit = await rateLimit(`upload:${business.id}`, UPLOADS_PER_HOUR, 60 * 60 * 1000);
    if (!limit.allowed) {
      const minutes = Math.ceil(limit.retryInSeconds / 60);
      return fail(
        429,
        t('images.rateLimited', { minutes }),
        { 'Retry-After': String(limit.retryInSeconds) },
      );
    }

    if (file.size === 0) return fail(400, t('images.missingFile'));
    if (file.size > MAX_IMAGE_BYTES) return fail(413, t('images.tooLarge'));

    const bytes = new Uint8Array(await file.arrayBuffer());
    // O tipo gravado (e devolvido depois como Content-Type) sai dos bytes, nunca
    // do `file.type` nem da extensão, que são escolhidos por quem envia.
    const contentType = detectImageType(bytes);
    if (!contentType) return fail(415, t('images.badFormat'));

    // Carona no envio: é quando o lojista troca fotos que as antigas ficam sem
    // uso. Antes de contar o teto, para órfã não ocupar vaga; e sem derrubar o
    // envio se a limpeza falhar.
    await deleteOrphanImages(business.id).catch((error) => {
      console.error('[imagens] limpeza de órfãs falhou:', error);
    });

    const usage = await getImageUsage(business.id);
    if (usage.count >= MAX_IMAGES_PER_BUSINESS) {
      return fail(
        409,
        t('images.countLimit', { max: MAX_IMAGES_PER_BUSINESS }),
      );
    }
    if (usage.bytes + bytes.byteLength > MAX_BYTES_PER_BUSINESS) {
      return fail(
        409,
        t('images.bytesLimit'),
      );
    }

    const id = await insertImage(business.id, contentType, bytes);

    return NextResponse.json({ url: `/img/${id}` }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[imagens] envio falhou:', error);
    return fail(500, t('images.saveFailed'));
  }
}
