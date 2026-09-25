import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AboutButton } from '@/components/store/about-button';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { formatWhatsapp } from '@/lib/format';
import { platform } from '@/lib/platform';
import type { Business } from '@/lib/types';

const currentYear = new Date().getFullYear();

/**
 * Rodapé do cardápio: nome, endereço e contato visíveis (NAP, base do SEO
 * local) e o atalho para o "Sobre a loja", que concentra horários e entrega —
 * o que antes eram três colunas aqui. Os horários continuam no JSON-LD.
 */
export function StoreFooter({ business }: { business: Business }) {
  const t = useTranslations('store');
  const hasAddress = Boolean(business.address.street || business.address.city);

  return (
    <footer className="mt-12 border-t border-gray-200 bg-white">
      <div className="mx-auto w-full max-w-page px-4 py-8 md:px-6 lg:px-8">
        <p className="text-body1 font-semibold text-gray-900">{business.name}</p>
        {hasAddress && (
          <address className="mt-2 space-y-0.5 text-body2 not-italic text-gray-600">
            <p>{business.address.street}</p>
            <p>
              {[business.address.district, business.address.city].filter(Boolean).join(' — ')}
              {business.address.state ? `/${business.address.state}` : ''}
              {business.address.postalCode ? ` · ${t('postalCode', { value: business.address.postalCode })}` : ''}
            </p>
          </address>
        )}
        {(business.whatsapp || business.instagram) && (
          <ul className="mt-2 space-y-0.5 text-body2 text-gray-600">
            {/* Só WhatsApp e Instagram: o pedido chega pelo WhatsApp. */}
            {business.whatsapp && (
              <li>
                <a
                  className="hover:text-gray-900"
                  href={`https://wa.me/${business.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp: {formatWhatsapp(business.whatsapp)}
                </a>
              </li>
            )}
            {business.instagram && <li>{business.instagram}</li>}
          </ul>
        )}
        <div className="mt-3">
          <AboutButton />
        </div>

        <div className="mt-6 flex flex-col gap-1 border-t border-gray-200 pt-4 text-caption text-gray-600 sm:flex-row sm:justify-between">
          <p>
            © {currentYear} {business.name}
          </p>
          <p>
            {t.rich('footer.poweredBy', {
              brand: () => (
                <Link href="/" className="font-semibold hover:text-gray-900">
                  {platform.name}
                </Link>
              ),
              signup: (chunks) => (
                <Link href="/criar-conta" className="underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
        {/* O idioma é da interface: nome, pratos e descrições seguem como o lojista escreveu. */}
        <LocaleSwitcher className="mt-4 text-caption" />
      </div>
    </footer>
  );
}
