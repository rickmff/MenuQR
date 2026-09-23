'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageUpload, type ImageUploadNoun, type ImageUploadShape } from '@/components/ui/image-upload';
import { demoMode } from '@/lib/demo/config';
import { isUploadedImage } from '@/lib/format';

/**
 * Foto de celular passa fácil de 5 MB; acima de 12 MB costuma ser panorama ou
 * arquivo de câmera profissional, que derruba a aba de um celular modesto na
 * hora de abrir no canvas.
 */
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
/** Alvo da redução. O servidor aceita até 600 KB (`api/imagens/route.ts`), para sobrar folga. */
const TARGET_BYTES = 400 * 1024;
const MAX_UPLOAD_BYTES = 600 * 1024;
/**
 * 1200 px cobre a foto da página do item em tela de alta densidade. O segundo
 * tamanho só entra se nem a menor qualidade couber no alvo.
 */
const SIDES = [1200, 900];
const QUALITIES = [0.82, 0.72, 0.62, 0.5];

/** Erro cuja mensagem já está pronta para o lojista ler. */
class PhotoError extends Error {}

type Status = 'idle' | 'reducing' | 'uploading';

/** A foto do prato é um quadrado; a logo, um círculo — o mesmo que a loja mostra. */
export type ImageFieldKind = 'foto' | 'logo';

const KINDS: Record<ImageFieldKind, { shape: ImageUploadShape; noun: ImageUploadNoun }> = {
  foto: { shape: 'square', noun: 'foto' },
  logo: { shape: 'circle', noun: 'imagem' },
};

/**
 * Campo de imagem do painel: um quadro com a imagem atual e, sobre ela, os
 * botões de trocar e remover. Sem botão ao lado — a foto entra clicando no
 * quadro vazio, no lápis, soltando o arquivo em cima ou colando. O rótulo só
 * aparece com `showLabel`, quando o campo divide a linha com campos de texto
 * rotulados e ficaria torto sem ele.
 * Ela é reduzida aqui no navegador e guardada no banco (`/img/<id>`). O valor
 * sempre vai num <input type="hidden" name=…>, porque os formulários enviam
 * `new FormData(form)`.
 *
 * Emoji cadastrado antes continua aparecendo no quadro (é o que a loja
 * mostra); remover deixa o campo vazio e o servidor grava o emoji padrão ao
 * salvar. No modo demonstração não há servidor para receber a foto: o quadro
 * mostra a imagem atual e nada mais.
 */
export function ImageField({
  id,
  name,
  label,
  showLabel = false,
  businessId,
  defaultValue,
  error,
  kind = 'foto',
  onBusyChange,
  onValueChange,
}: {
  id: string;
  name: string;
  /** Nome do campo. Só aparece na tela com `showLabel`; sem ele, é só o nome acessível. */
  label: string;
  /** Mostra o rótulo acima do quadro, como nos campos de texto ao lado. */
  showLabel?: boolean;
  businessId: string;
  defaultValue: string;
  /** Erro de validação devolvido pelo servidor ao salvar o formulário. */
  error?: string;
  kind?: ImageFieldKind;
  /** Avisa o formulário para segurar o "Salvar" enquanto a foto sobe. */
  onBusyChange?: (busy: boolean) => void;
  /**
   * Avisa que a foto entrou ou saiu. O valor mora num campo oculto, que não
   * emite evento: sem isto, o formulário não saberia que já tem algo dentro.
   */
  onValueChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  /** Toda troca do valor passa por aqui: o campo oculto e o formulário juntos. */
  const applyValue = (next: string) => {
    setValue(next);
    onValueChange?.(next);
  };
  // Object URL da foto reduzida: aparece no quadro antes de o servidor
  // responder e continua depois, poupando baixar de volta o que acabou de subir.
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const previewRef = useRef<string | null>(null);

  // Sair da tela no meio do envio cancela a requisição e solta a prévia.
  useEffect(() => {
    return () => {
      requestRef.current?.abort();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const { shape, noun } = KINDS[kind];
  const busy = status !== 'idle';
  const messageId = `${id}-message`;
  const labelId = `${id}-label`;

  /** Troca a prévia liberando a anterior: object URL não se solta sozinho. */
  function showPreview(url: string | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = url;
    setPreview(url);
  }

  async function handleFile(file: File) {
    const request = new AbortController();
    requestRef.current = request;
    setUploadError(null);
    setStatus('reducing');
    onBusyChange?.(true);
    try {
      const reduced = await reducePhoto(file);
      // A foto já aparece no quadro, embaixo do spinner, enquanto sobe.
      showPreview(URL.createObjectURL(reduced));
      setStatus('uploading');
      applyValue(await uploadPhoto(reduced, businessId, request.signal));
    } catch (failure) {
      if (request.signal.aborted) return;
      // Sem a prévia: uma foto que não subiu não pode parecer pronta.
      showPreview(null);
      setUploadError(
        failure instanceof PhotoError ? failure.message : `Não foi possível enviar a ${noun}. Tente novamente.`,
      );
    } finally {
      setStatus('idle');
      onBusyChange?.(false);
    }
  }

  function removeImage() {
    showPreview(null);
    applyValue('');
    setUploadError(null);
  }

  // Andamento e lembrete dividem a mesma linha, e somem enquanto houver erro na tela.
  const Noun = noun === 'foto' ? 'Foto' : 'Imagem';
  let note = '';
  if (status === 'reducing') note = `Reduzindo a ${noun}…`;
  else if (status === 'uploading') note = `Enviando a ${noun}…`;
  else if (demoMode) {
    note =
      kind === 'logo'
        ? 'A demonstração não envia imagens: a logo fica como está.'
        : 'A demonstração não envia fotos: a imagem fica como está.';
  }
  // O envio não salva o formulário: sem este lembrete a foto nova parece pronta.
  else if (value !== defaultValue) note = value ? `${Noun} enviada. Salve para aplicar.` : `${Noun} removida. Salve para aplicar.`;

  return (
    <div>
      {/* <p>, não <label>: o quadro é um grupo de botões, e não há input para o `for` apontar. */}
      {showLabel && (
        <p id={labelId} className="mb-1.5 text-body2 font-medium text-gray-700">
          {label}
        </p>
      )}
      <ImageUpload
        label={label}
        labelledBy={showLabel ? labelId : undefined}
        value={value}
        preview={preview}
        busy={busy}
        disabled={demoMode}
        invalid={Boolean(error)}
        shape={shape}
        noun={noun}
        describedBy={messageId}
        onFile={(file) => void handleFile(file)}
        onRemove={removeImage}
        onReject={setUploadError}
      />
      <input type="hidden" name={name} value={value} />

      <div id={messageId}>
        {/* Sempre montada, mesmo vazia: leitor de tela só anuncia o que muda
            dentro de uma região viva que já existia. */}
        <p role="status" className="mt-1 text-caption text-gray-600 empty:mt-0">
          {uploadError || error ? null : note}
        </p>
        {uploadError && (
          <p role="alert" className="mt-1 text-caption font-medium text-error">
            {uploadError}
          </p>
        )}
        {error && (
          // Só o erro de validação leva `data-field-error`: é o que o formulário
          // do negócio procura para rolar a tela até o campo recusado ao salvar.
          <p role="alert" data-field-error className="mt-1 text-caption font-medium text-error">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ redução */

function isHeic(file: File): boolean {
  return /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

/**
 * Abre o arquivo como o navegador abriria numa página. O <img> já aplica a
 * rotação do EXIF (foto de celular em pé), coisa que nem todo navegador faz
 * em `createImageBitmap`.
 */
async function openPhoto(file: File): Promise<{ image: HTMLImageElement; release: () => void }> {
  const url = URL.createObjectURL(file);
  const release = () => URL.revokeObjectURL(url);
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  try {
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('sem dimensões');
    return { image, release };
  } catch {
    release();
    // HEIC é o padrão da câmera do iPhone e só o Safari sabe abrir. É o caso
    // mais comum de "a foto não abre", e merece uma saída concreta.
    throw new PhotoError(
      isHeic(file)
        ? 'Este navegador não abre fotos HEIC (o formato do iPhone). Envie a foto em JPG ou PNG — um print dela resolve.'
        : 'Não foi possível abrir este arquivo. Envie uma foto em JPG, PNG ou WebP.',
    );
  }
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new PhotoError('Não foi possível preparar a foto neste navegador. Tente em outro.');
  context.imageSmoothingQuality = 'high';
  return { canvas, context };
}

/** O Safari devolve memória de canvas com atraso; zerar o tamanho libera na hora. */
function discard(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

/**
 * Desenha a foto com o lado maior em `maxSide` (nunca amplia).
 *
 * A redução vai de metade em metade até chegar perto: de uma vez só, 4000 →
 * 1200 px sai serrilhado em navegador que só faz interpolação bilinear. De
 * quebra, nenhum canvas nasce do tamanho da foto original — o iOS recusa
 * canvas acima de ~16 megapixels.
 */
function drawScaled(
  source: HTMLImageElement | HTMLCanvasElement,
  sourceWidth: number,
  sourceHeight: number,
  maxSide: number,
  opaque: boolean,
): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  let current = source;
  let currentWidth = sourceWidth;
  let currentHeight = sourceHeight;
  while (currentWidth / 2 > width) {
    const half = createCanvas(Math.round(currentWidth / 2), Math.round(currentHeight / 2));
    half.context.drawImage(current, 0, 0, half.canvas.width, half.canvas.height);
    if (current instanceof HTMLCanvasElement && current !== source) discard(current);
    current = half.canvas;
    currentWidth = half.canvas.width;
    currentHeight = half.canvas.height;
  }

  const output = createCanvas(width, height);
  if (opaque) {
    // JPEG não tem transparência: sem o fundo, o vazio de um logo PNG sai preto.
    output.context.fillStyle = '#ffffff';
    output.context.fillRect(0, 0, width, height);
  }
  output.context.drawImage(current, 0, 0, width, height);
  if (current instanceof HTMLCanvasElement && current !== source) discard(current);
  return output.canvas;
}

/** Navegador que não sabe gerar WebP devolve PNG calado; o teste é perguntar antes. */
function canEncodeWebp(): boolean {
  const probe = document.createElement('canvas');
  probe.width = 1;
  probe.height = 1;
  return probe.toDataURL('image/webp').startsWith('data:image/webp');
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Reduz a foto até caber no alvo. Toda foto passa por aqui, mesmo a que já é
 * pequena: redesenhar no canvas também apaga o EXIF, que em foto de celular
 * costuma trazer a localização de onde ela foi tirada.
 */
async function reducePhoto(file: File): Promise<Blob> {
  if (file.size > MAX_SOURCE_BYTES) {
    throw new PhotoError('Esta foto tem mais de 12 MB. Escolha uma foto menor ou tire outra em resolução mais baixa.');
  }
  if (file.type && !file.type.startsWith('image/')) {
    throw new PhotoError('Este arquivo não é uma foto. Envie uma imagem em JPG, PNG ou WebP.');
  }

  const { image, release } = await openPhoto(file);
  try {
    const type = canEncodeWebp() ? 'image/webp' : 'image/jpeg';
    let source: HTMLImageElement | HTMLCanvasElement = image;
    let sourceWidth = image.naturalWidth;
    let sourceHeight = image.naturalHeight;
    let smallest: Blob | null = null;

    for (const side of SIDES) {
      const canvas = drawScaled(source, sourceWidth, sourceHeight, side, type === 'image/jpeg');
      for (const quality of QUALITIES) {
        const blob = await encode(canvas, type, quality);
        if (!blob) break;
        if (!smallest || blob.size < smallest.size) smallest = blob;
        if (blob.size <= TARGET_BYTES) return blob;
      }
      // A próxima tentativa parte do que já foi reduzido, não da foto original.
      source = canvas;
      sourceWidth = canvas.width;
      sourceHeight = canvas.height;
    }

    if (smallest && smallest.size <= MAX_UPLOAD_BYTES) return smallest;
    throw new PhotoError('Não foi possível reduzir esta foto o bastante. Tente outra foto.');
  } finally {
    release();
  }
}

/* -------------------------------------------------------------------- envio */

async function uploadPhoto(photo: Blob, businessId: string, signal: AbortSignal): Promise<string> {
  const body = new FormData();
  body.set('businessId', businessId);
  body.set('file', photo, photo.type === 'image/webp' ? 'foto.webp' : 'foto.jpg');

  let response: Response;
  try {
    response = await fetch('/api/imagens', { method: 'POST', body, signal });
  } catch {
    throw new PhotoError('Não foi possível enviar a foto. Confira sua conexão e tente novamente.');
  }

  // As mensagens de erro da rota já vêm escritas para o lojista.
  const data: unknown = await response.json().catch(() => null);
  const field = (key: string) =>
    data && typeof data === 'object' && key in data ? (data as Record<string, unknown>)[key] : undefined;

  const url = field('url');
  if (response.ok && typeof url === 'string' && isUploadedImage(url)) return url;

  const message = field('error');
  throw new PhotoError(
    typeof message === 'string' && message ? message : 'Não foi possível enviar a foto. Tente novamente.',
  );
}
