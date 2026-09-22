import Link from 'next/link';
import { Logo } from '@/components/platform/logo';
import { platform } from '@/lib/platform';

/**
 * Telas de conta (entrar, criar conta e as etapas do Clerk abaixo delas): só o
 * formulário, com a marca em cima para voltar ao início. Sem cabeçalho, rodapé
 * ou texto de venda — quem chegou aqui já decidiu entrar.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="conteudo" className="flex flex-1 flex-col items-center px-4 pb-12 pt-safe">
      <Link href="/" aria-label={`${platform.name}, página inicial`} className="press mt-6 rounded-sm">
        <Logo />
      </Link>
      <div className="mt-10 w-full max-w-md">{children}</div>
    </main>
  );
}
