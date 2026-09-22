import { NextResponse } from 'next/server';
import { demoMode } from '@/lib/demo/config';
import { assertOwnership } from '@/server/auth/guards';
import { getCurrentUser } from '@/server/auth/current-user';
import { rateLimit } from '@/server/rate-limit';
import { deleteOrphanImages, detectImageType, insertImage } from '@/server/repositories/images';

/**
 * A foto chega já reduzida pelo navegador (`image-field.tsx` mira ~400 KB). A
 * folga até 600 KB cobre foto muito detalhada e navegador que só sabe gerar
 * JPEG; acima disso é arquivo que não passou pelo painel.
 */
const MAX_IMAGE_BYTES = 600 * 1024;
/** O multipart acrescenta cabeçalhos e o campo `businessId` em volta do arquivo. */
const MAX_BODY_BYTES = MAX_IMAGE_BYTES + 16 * 1024;

const UPLOADS_PER_HOUR = 60;

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

const TOO_LARGE = 'A foto passou de 600 KB mesmo depois de reduzida. Tente outra foto.';

/** Recebe uma foto do painel, guarda no banco e devolve o caminho público dela. */
export async function POST(request: Request) {
  // Sem banco não há onde guardar; o painel nem mostra o botão neste modo.
  if (demoMode) return fail(503, 'O envio de fotos não está disponível no modo demonstração.');

  if (!isSameOrigin(request)) {
    return fail(403, 'Não foi possível enviar a foto. Recarregue a página e tente novamente.');
  }

  try {
    // A sessão é conferida antes de ler o corpo: visitante sem login não faz o
    // servidor guardar nada na memória. É também o que separa o 401 do 403 —
    // `assertOwnership` lança o mesmo tipo de erro para os dois casos.
    if (!(await getCurrentUser())) {
      return fail(401, 'Sua sessão expirou. Entre novamente para enviar a foto.');
    }

    const body = await readBody(request, MAX_BODY_BYTES);
    if (!body) return fail(413, TOO_LARGE);

    const form = await new Response(body, {
      headers: { 'Content-Type': request.headers.get('content-type') ?? '' },
    })
      .formData()
      .catch(() => null);
    const file = form?.get('file');
    const businessId = form?.get('businessId');
    if (!(file instanceof File) || typeof businessId !== 'string' || !businessId) {
      return fail(400, 'Escolha uma foto para enviar.');
    }

    let business;
    try {
      ({ business } = await assertOwnership(businessId));
    } catch {
      return fail(403, 'Você não tem permissão para enviar fotos para este negócio.');
    }

    // Por negócio, e não por IP: o banco que enche é o do negócio, e o lojista
    // pode alternar entre o celular e o computador. 60 por hora sobra para
    // montar um cardápio inteiro de uma vez.
    const limit = await rateLimit(`upload:${business.id}`, UPLOADS_PER_HOUR, 60 * 60 * 1000);
    if (!limit.allowed) {
      const minutes = Math.ceil(limit.retryInSeconds / 60);
      return fail(
        429,
        `Muitas fotos enviadas em pouco tempo. Tente de novo em ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`,
        { 'Retry-After': String(limit.retryInSeconds) },
      );
    }

    if (file.size === 0) return fail(400, 'Escolha uma foto para enviar.');
    if (file.size > MAX_IMAGE_BYTES) return fail(413, TOO_LARGE);

    const bytes = new Uint8Array(await file.arrayBuffer());
    // O tipo gravado (e devolvido depois como Content-Type) sai dos bytes, nunca
    // do `file.type` nem da extensão, que são escolhidos por quem envia.
    const contentType = detectImageType(bytes);
    if (!contentType) return fail(415, 'Formato não aceito. Envie uma foto JPG, PNG ou WebP.');

    const id = await insertImage(business.id, contentType, bytes);

    // Carona no envio: é quando o lojista troca fotos que as antigas ficam sem
    // uso. Falhar aqui não pode derrubar um envio que já deu certo.
    await deleteOrphanImages(business.id).catch((error) => {
      console.error('[imagens] limpeza de órfãs falhou:', error);
    });

    return NextResponse.json({ url: `/img/${id}` }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[imagens] envio falhou:', error);
    return fail(500, 'Não foi possível salvar a foto. Tente novamente.');
  }
}
