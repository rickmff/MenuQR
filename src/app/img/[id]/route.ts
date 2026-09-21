import { demoMode } from '@/lib/demo/config';
import { isUploadedImage } from '@/lib/format';
import { getImage } from '@/server/repositories/images';

function notFound() {
  return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
}

/**
 * Serve as fotos guardadas no banco (`/img/<uuid>`).
 *
 * Não confere se o cardápio está publicado: a prévia do painel precisa da foto
 * do rascunho, e o endereço é um UUID aleatório — quem não recebeu o link não
 * tem como chegar nele. Uma foto nunca muda de conteúdo (trocar a foto gera
 * outro id), por isso o cache pode ser de um ano e `immutable`.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // No modo demonstração não existe banco para consultar. O formato é conferido
  // antes da consulta para que lixo na URL nem chegue ao banco.
  if (demoMode || !isUploadedImage(`/img/${id}`)) return notFound();

  let image;
  try {
    image = await getImage(id);
  } catch (error) {
    // Banco fora do ar não é "foto não existe": 503 sem cache, para o navegador
    // tentar de novo em vez de guardar a falha.
    console.error('[img] banco indisponível:', error);
    return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!image) return notFound();

  return new Response(image.bytes, {
    headers: {
      'Content-Type': image.contentType,
      'Content-Length': String(image.bytes.byteLength),
      'Cache-Control': 'public, max-age=31536000, immutable',
      // O tipo foi conferido pelos bytes no envio; isto impede o navegador de
      // reinterpretar o arquivo como outra coisa mesmo assim.
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
