import { DemoAccount } from '@/components/demo/demo-account';
import { DeleteAccountForm, PasswordForm, ProfileForm } from '@/components/painel/account-forms';
import { demoMode } from '@/lib/demo/config';
import { siteUrl } from '@/lib/site';
import { requireUser } from '@/server/auth/guards';
import { getBusinessByOwner } from '@/server/repositories/businesses';

export const metadata = { title: 'Conta', robots: { index: false } };

export default async function AccountPage() {
  if (demoMode) return <DemoAccount />;

  // `requireUser`, não `requireBusiness`: quem desistiu antes de cadastrar o
  // restaurante também precisa conseguir trocar a senha e excluir a conta.
  const user = await requireUser('/painel/conta');
  const business = await getBusinessByOwner(user.id);
  const displayUrl = siteUrl.replace(/^https?:\/\//, '');

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-h4 font-semibold">Conta</h1>
      <p className="mt-2 text-gray-600">Seus dados de acesso ao painel. Nada daqui aparece no cardápio.</p>

      <div className="mt-8 space-y-8">
        <ProfileForm name={user.name} email={user.email} />
        <PasswordForm email={user.email} />
        <DeleteAccountForm
          store={business ? { name: business.name, address: `${displayUrl}/r/${business.slug}` } : null}
        />
      </div>
    </div>
  );
}
