'use client';

import { ImageIcon, ImagePlus, Loader2, Pencil, Trash2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import { IconButton } from '@/components/ui/icon-button';
import { cn } from '@/lib/cn';

export type ImageUploadShape = 'square' | 'circle' | 'wide';
/**
 * Como a imagem é chamada nos rótulos: a do prato é "foto", a logo é "imagem".
 * O valor é só um identificador; o texto sai de `ui.imageUpload` (photo/image).
 */
export type ImageUploadNoun = 'foto' | 'imagem';

/**
 * Tamanho e raio de cada formato: a logo em 128px, a capa larga como a da
 * loja. A foto do prato tem 96px no celular, ao lado do Nome, e 128px do sm
 * em diante — os dois círculos de 40px do lápis e da lixeira cabem nos 96.
 */
const SHAPES: Record<ImageUploadShape, string> = {
  square: 'size-24 shrink-0 rounded-md sm:size-32',
  circle: 'size-32 shrink-0 rounded-full',
  wide: 'aspect-[2/1] w-full max-w-sm rounded-md',
};

/**
 * O valor aponta para uma imagem — enviada (`/img/…`), do projeto (`/…`),
 * hospedada fora (`https://…`) ou a prévia local (`blob:`) — e não é um emoji?
 */
function isImageRef(value: string): boolean {
  return /^(https?:\/\/|blob:|data:|\/)/i.test(value);
}

/** O arrasto carrega arquivos? Texto ou link arrastado de outra aba não interessa. */
function carriesFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes('Files');
}

export interface ImageUploadProps {
  /** Nome acessível do campo. Só aparece na tela se `labelledBy` apontar para um rótulo visível. */
  label: string;
  /** Id do rótulo visível que nomeia o campo; com ele, `label` não vira `aria-label` (seria lido duas vezes). */
  labelledBy?: string;
  /** Imagem atual: `/img/…`, `https://…`, emoji ou vazio. */
  value: string;
  /**
   * Prévia local (object URL) que vence `value` enquanto existir: a foto
   * recém-escolhida, antes de o servidor responder.
   */
  preview?: string | null;
  /** Reduzindo ou enviando: véu com spinner; clique, soltar e colar são ignorados. */
  busy?: boolean;
  /** Sem controle nenhum (modo demonstração). A imagem atual continua aparecendo. */
  disabled?: boolean;
  /** Borda vermelha: o servidor recusou o valor. */
  invalid?: boolean;
  shape?: ImageUploadShape;
  noun?: ImageUploadNoun;
  /** Id da mensagem de andamento ou erro que descreve o campo (`aria-describedby`). */
  describedBy?: string;
  onFile: (file: File) => void;
  onRemove: () => void;
  /** O que foi solto ou colado não é uma imagem. A mensagem já vem pronta para o lojista. */
  onReject?: (message: string) => void;
}

/**
 * Quadro de imagem no padrão da página do item: a foto ocupa o quadro inteiro
 * e as ações ficam em círculos brancos sobre ela, sempre visíveis (no celular
 * não existe hover). Sem botão ao lado, e sem rótulo próprio: quem chama
 * decide se mostra um e aponta `labelledBy` para ele.
 *
 * Quatro jeitos de escolher a imagem: clicar no quadro vazio, clicar no
 * lápis, soltar um arquivo em cima (o quadro fica verde) ou colar com Ctrl+V
 * com o foco em um dos botões. A lixeira remove. O componente não envia nada:
 * entrega o `File` e mostra o que quem chama mandar.
 */
export function ImageUpload({
  label,
  labelledBy,
  value,
  preview = null,
  busy = false,
  disabled = false,
  invalid = false,
  shape = 'square',
  noun = 'foto',
  describedBy,
  onFile,
  onRemove,
  onReject,
}: ImageUploadProps) {
  const t = useTranslations('ui.imageUpload');
  const fileRef = useRef<HTMLInputElement>(null);
  // Entrar num filho dispara `dragleave` no pai: a contagem evita o piscar.
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);
  // Guarda QUAL endereço falhou, e não um booleano: ao trocar de imagem a
  // prévia tenta de novo sem precisar de efeito para limpar o estado.
  const [failed, setFailed] = useState<string | null>(null);

  const interactive = !disabled && !busy;
  const shown = preview ?? value;
  const empty = shown === '';
  const showsImage = isImageRef(shown) && failed !== shown;

  const pick = () => fileRef.current?.click();

  function accept(file: File | undefined) {
    if (!file) return;
    // Tipo vazio (HEIC em alguns sistemas) passa: quem abre a foto decide.
    if (file.type && !file.type.startsWith('image/')) {
      onReject?.(t('notAnImage', { noun }));
      return;
    }
    onFile(file);
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!carriesFiles(event)) return;
    event.preventDefault();
    depth.current += 1;
    if (interactive) setDragging(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!carriesFiles(event)) return;
    // Sempre: sem isto, soltar sobre o quadro ocupado faria o navegador abrir
    // a foto no lugar do painel, no meio de um envio.
    event.preventDefault();
    event.dataTransfer.dropEffect = interactive ? 'copy' : 'none';
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!carriesFiles(event)) return;
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!carriesFiles(event)) return;
    event.preventDefault();
    depth.current = 0;
    setDragging(false);
    if (interactive) accept(event.dataTransfer.files[0]);
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    if (!interactive) return;
    const file = Array.from(event.clipboardData.files).find((candidate) => candidate.type.startsWith('image/'));
    if (!file) return;
    event.preventDefault();
    accept(file);
  }

  return (
    <div
      role="group"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      aria-busy={busy || undefined}
      aria-describedby={describedBy}
      data-dragging={dragging || undefined}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      // Vazio, o quadro inteiro é o alvo do clique; o botão central bubbla até aqui.
      onClick={empty && interactive ? pick : undefined}
      className={cn(
        'relative grid place-items-center overflow-hidden border bg-gray-100 transition-[background-color,border-color] duration-150 ease-standard',
        SHAPES[shape],
        dragging ? 'border-primary bg-primary-tint' : invalid ? 'border-error' : 'border-gray-200',
        empty && interactive && 'cursor-pointer',
      )}
    >
      {/* Prévia: a foto, o emoji, ou um ícone neutro quando não há nada. */}
      <span aria-hidden="true" className="absolute inset-0 grid place-items-center">
        {showsImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt=""
            draggable={false}
            referrerPolicy="no-referrer"
            onError={() => setFailed(shown)}
            className="size-full object-cover"
          />
        ) : empty || isImageRef(shown) ? (
          <ImageIcon className="size-6 text-gray-400" />
        ) : (
          <span className="select-none text-display leading-none">{shown}</span>
        )}
      </span>

      {busy && (
        <span aria-hidden="true" className="absolute inset-0 grid animate-fade-in place-items-center bg-white/70">
          <Loader2 className="size-6 animate-spin text-gray-600" />
        </span>
      )}

      {interactive && (
        <span className="relative grid place-items-center">
          {dragging ? (
            <span
              aria-hidden="true"
              className="pointer-events-none grid size-10 animate-pop-in place-items-center rounded-full bg-white text-primary shadow-medium"
            >
              <Upload className="size-5" />
            </span>
          ) : empty ? (
            // Sem onClick: o clique sobe até o quadro, que é quem abre o seletor.
            <IconButton variant="raised" label={t('upload', { noun })} icon={<ImagePlus className="size-5" />} />
          ) : (
            <span className="flex gap-2">
              <IconButton
                variant="raised"
                label={t('replace', { noun })}
                icon={<Pencil className="size-5" />}
                onClick={pick}
              />
              <IconButton
                variant="raised"
                label={t('remove', { noun })}
                icon={<Trash2 className="size-5" />}
                onClick={onRemove}
              />
            </span>
          )}
        </span>
      )}

      {/* Sem `name`: o arquivo original não pode seguir junto com o formulário. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        tabIndex={-1}
        // O clique programático também sobe até o quadro; parar aqui evita abrir o seletor duas vezes.
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Limpar permite escolher o mesmo arquivo de novo depois de um erro.
          event.target.value = '';
          accept(file);
        }}
      />
    </div>
  );
}
