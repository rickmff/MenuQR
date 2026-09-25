'use client';

import { useTranslations } from 'next-intl';
import { FieldFrame, fieldDescription } from '@/components/painel/business-form/field-frame';
import { PhoneInput } from '@/components/ui/phone-input';
import { TextField } from '@/components/ui/text-field';
import type { Business } from '@/lib/types';

/** A aba Contato: o WhatsApp que recebe os pedidos e o Instagram. */
export function ContactSection({
  business,
  error,
  markEdited,
}: {
  business: Business;
  error: (field: string) => string | undefined;
  markEdited: (field?: string) => void;
}) {
  const t = useTranslations('painel.businessForm.contact');
  const whatsappError = error('whatsapp');
  const whatsappDescription = fieldDescription('whatsapp', undefined, whatsappError);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FieldFrame id="whatsapp" label={t('whatsapp')} error={whatsappError}>
        {/* O número mora num campo oculto: a mudança (digitada ou de país)
            chega por `onValueChange`, com o nome que o servidor usa no erro. */}
        <PhoneInput
          id="whatsapp"
          name="whatsapp"
          defaultValue={business.whatsapp}
          invalid={Boolean(whatsappError)}
          describedBy={whatsappDescription}
          onValueChange={() => markEdited('whatsapp')}
        />
      </FieldFrame>

      <TextField
        id="instagram"
        name="instagram"
        label={t('instagram')}
        defaultValue={business.instagram}
        placeholder={t('instagramPlaceholder')}
        maxLength={120}
        error={error('instagram')}
      />
    </div>
  );
}
