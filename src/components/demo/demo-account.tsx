'use client';

import { Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { AccountSection, Notice } from '@/components/painel/account-parts';
import { PanelHeader, PanelPage } from '@/components/painel/panel-page';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { currentUser, resetDemo, useDemoState } from '@/lib/demo/store';

/**
 * Tela "Conta" no modo demonstração. A conta aqui é um registro no localStorage:
 * não há senha guardada num servidor para trocar nem cadastro remoto para
 * excluir, e o store não tem edição de usuário. O que existe de verdade é
 * `resetDemo()`, que zera o que a demonstração guardou neste navegador — é o
 * equivalente honesto de "excluir a conta" quando nada saiu do aparelho.
 */
export function DemoAccount() {
  const t = useTranslations('demo.account');
  const tc = useTranslations('common');
  const state = useDemoState();
  const user = currentUser(state);
  const [confirming, setConfirming] = useState(false);

  // Sem sessão, a casca do demo já está mandando para o login.
  if (!state.ready || !user) return null;

  const wipe = () => {
    resetDemo();
    // Navegação completa, como no "Sair" do demo. Com `router.push`, a casca do
    // painel — que acabou de ficar sem sessão — redireciona para /entrar por cima.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/');
  };

  return (
    <>
      <PanelPage width="form">
        <PanelHeader
          title={t('title')}
          description={t('description')}
        />

        <AccountSection title={t('dataTitle')} description={t('dataDescription')}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-body2 font-medium text-gray-600">{t('name')}</dt>
              <dd className="mt-0.5 text-body1 text-gray-700">{user.name}</dd>
            </div>
            <div>
              <dt className="text-body2 font-medium text-gray-600">{t('email')}</dt>
              <dd className="mt-0.5 break-all text-body1 text-gray-700">{user.email}</dd>
            </div>
          </dl>

          <Notice tone="info">
            {t('notice')}
          </Notice>
        </AccountSection>

        <AccountSection
          title={t('wipeTitle')}
          description={t('wipeDescription')}
        >
          <p className="text-body2 text-gray-600">
            {t('wipeLinks')}
          </p>
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => setConfirming(true)}
              leading={<Trash2 className="size-5" />}
            >
              {t('wipeButton')}
            </Button>
          </div>
        </AccountSection>
      </PanelPage>

      <BottomSheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t('confirmTitle')}
        footer={
          // Grade, não flex: o `Button` é `shrink-0`, e dois `fullWidth` lado a lado num flex estouram a tela.
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="text"
              fullWidth
              onClick={() => setConfirming(false)}
              leading={<X className="size-5" />}
            >
              {tc('cancel')}
            </Button>
            <Button fullWidth onClick={wipe} leading={<Trash2 className="size-5" />}>
              {t('confirmButton')}
            </Button>
          </div>
        }
      >
        <p className="px-4 pb-4 text-body2 text-gray-600">
          {t('confirmText')}
        </p>
      </BottomSheet>
    </>
  );
}
