import Link from 'next/link';
import { DemoDashboard } from '@/components/demo/demo-pages';
import { demoMode } from '@/lib/demo/config';
import { redirect } from 'next/navigation';
import { CopyLink } from '@/components/painel/copy-link';
import { PublishToggle } from '@/components/painel/publish-toggle';
import { QrCode } from '@/components/painel/qr-code';
import { countItems } from '@/lib/menu-utils';
import { absoluteUrl } from '@/lib/site';
import { requireUser } from '@/server/auth/guards';
import { getBusinessByOwner } from '@/server/repositories/businesses';
import { getMenu } from '@/server/repositories/menu';

export default async function DashboardHome() {
  if (demoMode) return <DemoDashboard />;

  const user = await requireUser();
  const business = await getBusinessByOwner(user.id);
  if (!business) redirect('/painel/comecar');

  const menu = await getMenu(business.id);
  const itemCount = countItems(menu);
  const publicUrl = absoluteUrl(`/r/${business.slug}`);

  const checklist = [
    {
      done: Boolean(business.whatsapp),
      label: 'WhatsApp que recebe os pedidos',
      href: '/painel/negocio',
    },
    { done: menu.length > 0, label: 'Pelo menos uma categoria', href: '/painel/cardapio' },
    { done: itemCount > 0, label: 'Pelo menos um item no cardápio', href: '/painel/cardapio' },
    {
      done: Boolean(business.address.street || business.address.city),
      label: 'Endereço do restaurante',
      href: '/painel/negocio',
    },
    {
      done: !business.delivery.enabled || business.delivery.zones.length > 0,
      label: 'Bairros atendidos com taxa e prazo',
      href: '/painel/negocio',
    },
    { done: business.published, label: 'Cardápio publicado', href: '/painel' },
  ];

  const pending = checklist.filter((entry) => !entry.done);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Olá, {user.name.split(' ')[0]} 👋</h1>
          <p className="mt-2 text-ink-500">
            {business.name} ·{' '}
            <span className={business.published ? 'text-whatsapp-600' : 'text-ink-700'}>
              {business.published ? 'cardápio publicado' : 'rascunho (ainda não publicado)'}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/painel/previa"
            className="btn btn-sm btn-outline"
          >
            Ver prévia
          </Link>
          <PublishToggle businessId={business.id} published={business.published} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="surface p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold">Seu cardápio na internet</h2>
          <p className="mt-1 text-sm text-ink-500">
            Compartilhe este link nas redes sociais, no perfil do Instagram e no Google.
          </p>

          <p className="mt-4 break-all rounded-xl bg-ink-100 px-4 py-3 font-mono text-sm">{publicUrl}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <CopyLink url={publicUrl} />
            {business.published ? (
              <Link
                href={`/r/${business.slug}`}
                target="_blank"
                rel="noopener"
                className="btn btn-sm btn-outline"
              >
                Abrir cardápio ↗
              </Link>
            ) : (
              <span className="rounded-xl bg-ink-100 px-4 py-2.5 text-sm text-ink-500">
                Publique para o link ficar acessível
              </span>
            )}
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-ink-200 pt-6 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-ink-500">Categorias</dt>
              <dd className="mt-1 font-display text-2xl font-semibold">{menu.length}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Itens</dt>
              <dd className="mt-1 font-display text-2xl font-semibold">{itemCount}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Bairros</dt>
              <dd className="mt-1 font-display text-2xl font-semibold">
                {business.delivery.zones.length}
              </dd>
            </div>
            <div>
              <dt className="text-ink-500">Formas de pagamento</dt>
              <dd className="mt-1 font-display text-2xl font-semibold">{business.payments.length}</dd>
            </div>
          </dl>
        </section>

        <section className="surface p-6">
          <h2 className="font-display text-lg font-semibold">QR code</h2>
          <p className="mt-1 text-sm text-ink-500">Leve o cardápio para as mesas e embalagens.</p>
          <div className="mt-6">
            <QrCode url={publicUrl} />
          </div>
        </section>
      </div>

      <section className="surface p-6">
        <h2 className="font-display text-lg font-semibold">
          {pending.length === 0 ? 'Tudo pronto 🎉' : `Faltam ${pending.length} itens para caprichar`}
        </h2>
        <ul className="mt-4 space-y-2 text-sm">
          {checklist.map((entry) => (
            <li key={entry.label} className="flex items-center gap-3">
              <span aria-hidden="true" className={entry.done ? 'text-whatsapp-600' : 'text-ink-500'}>
                {entry.done ? '✓' : '○'}
              </span>
              <span className={entry.done ? 'text-ink-500 line-through' : ''}>{entry.label}</span>
              {!entry.done && (
                <Link href={entry.href} className="ml-auto font-semibold text-flame-600 hover:text-flame-700">
                  Resolver →
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
