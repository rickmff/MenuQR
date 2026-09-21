'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageIcon, ImageUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { demoMode } from '@/lib/demo/config';
import { isPhotoRef, isUploadedImage } from '@/lib/format';

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

/**
 * Campo de imagem do painel: emoji, endereço de uma foto já hospedada ou — a
 * novidade — uma foto enviada do aparelho, que é reduzida aqui no navegador e
 * guardada no banco (`/img/<id>`). O valor sempre vai num <input name=…>, porque
 * os formulários enviam `new FormData(form)`.
 *
 * No modo demonstração não há servidor para receber a foto: o botão some e o
 * campo funciona como sempre funcionou.
 */
export function ImageField({
  id,
  name,
  label,
  businessId,
  defaultValue,
  error,
  onBusyChange,
}: {
  id: string;
  name: string;
  label: string;
  businessId: string;
  defaultValue: string;
  /** Erro de validação devolvido pelo servidor ao salvar o formulário. */
  error?: string;
  /** Avisa o formulário para segurar o "Salvar" enquanto a foto sobe. */
  onBusyChange?: (busy: boolean) => void;
}) {
  // Dois estados porque são dois controles: remover a foto devolve o que estava
  // digitado antes (ou o campo vazio, e aí o servidor grava o emoji padrão ao
  // salvar), em vez de deixar o caminho `/img/…` num campo de texto.
  // No modo demonstração tudo é texto: não haveria botão para sair da foto.
  const startsWithPhoto = !demoMode && isUploadedImage(defaultValue);
  const [photo, setPhoto] = useState(() => (startsWithPhoto ? defaultValue : null));
  const [text, setText] = useState(() => (startsWithPhoto ? '' : defaultValue));
  const [status, setStatus] = useState<Status>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [focusText, setFocusText] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<AbortController | null>(null);

  // Sair da tela no meio do envio cancela a requisição.
  useEffect(() => {
    return () => requestRef.current?.abort();
  }, []);

  const busy = status !== 'idle';
  const value = photo ?? text;
  const labelId = `${id}-label`;
  const messageId = `${id}-message`;

  async function handleFile(file: File) {
    const request = new AbortController();
    requestRef.current = request;
    setUploadError(null);
    setStatus('reducing');
    onBusyChange?.(true);
    try {
      const reduced = await reducePhoto(file);
      setStatus('uploading');
      setPhoto(await uploadPhoto(reduced, businessId, request.signal));
    } catch (failure) {
      if (request.signal.aborted) return;
      setUploadError(
        failure instanceof PhotoError ? failure.message : 'Não foi possível enviar a foto. Tente novamente.',
      );
    } finally {
      setStatus('idle');
      onBusyChange?.(false);
    }
  }

  const removePhoto = () => {
    setPhoto(null);
    setUploadError(null);
    setFocusText(true);
  };

  // Andamento e dica dividem a mesma linha, e somem enquanto houver erro na tela.
  let note: string | undefined;
  if (status === 'reducing') note = 'Reduzindo a foto…';
  else if (status === 'uploading') note = 'Enviando a foto…';
  else if (demoMode) note = 'Emoji ou endereço (https://…) de uma foto.';
  else if (!photo) note = 'Envie uma foto do seu aparelho, ou use um emoji ou o endereço (https://…) de uma foto.';
  // O envio não salva o formulário: sem este lembrete a foto nova parece pronta.
  else if (photo !== defaultValue) note = 'Foto enviada. Salve para aplicar.';

  return (
    <div role="group" aria-labelledby={labelId}>
      <label id={labelId} htmlFor={photo ? undefined : id} className="mb-1.5 block text-body2 font-semibold">
        {label}
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Thumb value={value} busy={busy} large={Boolean(photo)} />

        {photo ? (
          <>
            <input type="hidden" name={name} value={photo} />
            <span className="sr-only">Foto enviada</span>
          </>
        ) : (
          <input
            id={id}
            name={name}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Emoji ou https://…"
            // Só depois de "Remover foto": o foco não pode sumir junto com o botão.
            autoFocus={focusText}
            aria-invalid={error ? true : undefined}
            aria-describedby={messageId}
            className={cn(
              'h-12 min-w-40 flex-1 rounded-sm border bg-white px-4 text-body1 outline-none transition-colors placeholder:text-gray-400 focus:border-primary',
              error ? 'border-error' : 'border-gray-300',
            )}
          />
        )}

        {!demoMode && (
          <div className="flex flex-wrap items-center gap-1">
            {/* Sem `name`: o arquivo original não pode seguir junto com o formulário. */}
            <input
              ref={fileRef}
              id={`${id}-file`}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                // Limpar permite escolher o mesmo arquivo de novo depois de um erro.
                event.target.value = '';
                if (file) void handleFile(file);
              }}
            />
            <Button
              variant="secondary"
              loading={busy}
              leading={<ImageUp aria-hidden="true" className="size-5" />}
              onClick={() => fileRef.current?.click()}
            >
              {status === 'reducing'
                ? 'Preparando…'
                : status === 'uploading'
                  ? 'Enviando…'
                  : photo
                    ? 'Trocar foto'
                    : 'Enviar foto'}
            </Button>
            {photo && !busy && (
              <Button variant="text" onClick={removePhoto}>
                Remover foto
              </Button>
            )}
          </div>
        )}
      </div>

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

/** Miniatura do valor atual: a foto, o emoji ou um ícone neutro quando não há nada. */
function Thumb({ value, busy, large }: { value: string; busy: boolean; large: boolean }) {
  // Guarda QUAL endereço falhou, e não um booleano: ao digitar outro endereço a
  // miniatura tenta de novo sem precisar de efeito para limpar o estado.
  const [failed, setFailed] = useState<string | null>(null);
  const showPhoto = isPhotoRef(value) && failed !== value;

  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden rounded-sm bg-gray-100 text-h5',
        large ? 'size-20' : 'size-12',
      )}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(value)}
          className="size-full object-cover"
        />
      ) : isPhotoRef(value) || !value ? (
        <ImageIcon className="size-5 text-gray-400" />
      ) : (
        <span className="select-none">{value}</span>
      )}
      {busy && (
        <span className="absolute inset-0 grid place-items-center bg-white/70">
          <Loader2 className="size-5 animate-spin text-gray-600" />
        </span>
      )}
    </span>
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
