'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FieldFrame, fieldDescription, framedFieldClass } from '@/components/painel/business-form/field-frame';
import { ImageField } from '@/components/painel/image-field';
import { DEFAULT_LOGO } from '@/components/painel/setup-steps';
import { TextArea, TextField } from '@/components/ui/text-field';
import { normalizeHexColor } from '@/lib/colors';
import { slugify, slugifyTyping } from '@/lib/slug';
import type { Business } from '@/lib/types';

/**
 * A aba Identidade: como o restaurante aparece no topo do cardápio. A cor da
 * marca mora num "Avançado" recolhido — ela não muda nada no cardápio, só o
 * ícone do app instalado e a imagem de compartilhamento.
 */
export function IdentitySection({
  business,
  siteUrl,
  error,
  markEdited,
  onLogoBusy,
  onCoverBusy,
}: {
  business: Business;
  siteUrl: string;
  error: (field: string) => string | undefined;
  markEdited: (field?: string) => void;
  onLogoBusy: (busy: boolean) => void;
  onCoverBusy: (busy: boolean) => void;
}) {
  const t = useTranslations('painel.businessForm.identity');
  /*
   * O link é formatado enquanto o lojista digita, como no cadastro: minúsculas,
   * sem acento, espaço vira hífen. O hífen do fim fica até ele sair do campo —
   * senão "cantina da nona" virava "cantinadanona".
   */
  const [slug, setSlug] = useState(business.slug);
  const [brandColor, setBrandColor] = useState(business.brandColor);

  const slugError = error('slug');
  // Link publicado já está impresso em mesa e compartilhado: mudar derruba os dois.
  const slugHint = business.published ? t('slugPublishedHint') : undefined;
  const colorError = error('brandColor');

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="name"
          name="name"
          label={t('name')}
          defaultValue={business.name}
          placeholder={t('namePlaceholder')}
          maxLength={80}
          error={error('name')}
        />
        <TextField
          id="tagline"
          name="tagline"
          label={t('tagline')}
          defaultValue={business.tagline}
          placeholder={t('taglinePlaceholder')}
          maxLength={120}
          error={error('tagline')}
        />
      </div>

      <FieldFrame id="slug" label={t('slug')} hint={slugHint} error={slugError}>
        <div className={framedFieldClass(Boolean(slugError), 'gap-1')}>
          <span className="shrink-0 text-body2 text-gray-600">{siteUrl}/r/</span>
          <input
            id="slug"
            name="slug"
            value={slug}
            onChange={(event) => setSlug(slugifyTyping(event.target.value))}
            onBlur={() => setSlug((current) => slugify(current))}
            placeholder="cantina-da-nona"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={slugError ? true : undefined}
            aria-describedby={fieldDescription('slug', slugHint, slugError)}
            className="h-full w-full min-w-0 bg-transparent text-body1 text-gray-700 outline-none placeholder:text-gray-400"
          />
        </div>
      </FieldFrame>

      <TextArea
        id="description"
        name="description"
        label={t('about')}
        hint={t('aboutHint')}
        rows={4}
        defaultValue={business.description}
        placeholder={t('aboutPlaceholder')}
        maxLength={1200}
        error={error('description')}
      />

      {/* O 🍽️ que o banco grava sozinho não é uma logo escolhida: o quadro
          nasce vazio, sem lápis nem lixeira. Salvar vazio grava o padrão de novo. */}
      <ImageField
        id="logo"
        name="logo"
        label={t('logo')}
        showLabel
        businessId={business.id}
        defaultValue={business.logo === DEFAULT_LOGO ? '' : business.logo}
        error={error('logo')}
        kind="logo"
        onBusyChange={onLogoBusy}
        onValueChange={() => markEdited('logo')}
      />

      <div>
        <ImageField
          id="cover"
          name="cover"
          label={t('cover')}
          showLabel
          businessId={business.id}
          defaultValue={business.cover ?? ''}
          error={error('cover')}
          kind="capa"
          onBusyChange={onCoverBusy}
          onValueChange={() => markEdited('cover')}
        />
        <p className="mt-1 text-caption text-gray-600">{t('coverHint')}</p>
      </div>

      {/* Recolhido e fora do caminho. Aberto quando o servidor recusou a cor,
          para o erro não ficar escondido. */}
      <details open={colorError ? true : undefined} className="group rounded-sm border border-gray-200">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-body2 font-semibold text-gray-700 [&::-webkit-details-marker]:hidden">
          <ChevronDown
            aria-hidden="true"
            className="size-[18px] shrink-0 text-gray-600 transition-transform duration-150 ease-standard group-open:rotate-180"
          />
          {t('advanced')}
        </summary>
        <div className="border-t border-gray-200 p-4">
          <FieldFrame id="brandColor" label={t('brandColor')} hint={t('brandColorHint')} error={colorError}>
            <div className="flex flex-wrap items-center gap-3">
              <input
                id="brandColor"
                name="brandColor"
                type="color"
                value={brandColor}
                onChange={(event) => setBrandColor(event.target.value)}
                aria-invalid={colorError ? true : undefined}
                aria-describedby={fieldDescription('brandColor', t('brandColorHint'), colorError)}
                className="h-12 w-16 cursor-pointer rounded-sm border border-gray-300 bg-white p-1"
              />
              <span className="font-mono text-body2 text-gray-600">{normalizeHexColor(brandColor)}</span>
            </div>
          </FieldFrame>
        </div>
      </details>
    </>
  );
}
