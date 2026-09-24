/**
 * Conta um erro de renderização para o servidor (`/api/erros`), que o registra
 * no log — sem isso o dono da plataforma só ficava sabendo quando o lojista
 * reclamava. É melhor esforço: `sendBeacon` não espera resposta nem segura a
 * tela, e falhar aqui não muda nada para quem está vendo a página. Com Sentry
 * ou similar, o `captureException` entra no lugar desta função.
 *
 * Compartilhado pelas barreiras de erro (a raiz e a da loja), que chamam num
 * `useEffect`.
 */
export type BoundaryError = Error & { digest?: string };

// Um relato por erro: o efeito roda duas vezes no modo estrito e de novo a cada
// render com o mesmo objeto. Erro novo depois de "Tentar novamente" é outro objeto.
const reported = new WeakSet<BoundaryError>();

export function reportError(error: BoundaryError): void {
  if (reported.has(error)) return;
  reported.add(error);

  // Só o caminho: a query pode levar dado de quem navega e, no modo demonstração,
  // o fragmento leva o cardápio inteiro.
  const body = JSON.stringify({
    message: String(error.message).slice(0, 500),
    digest: error.digest,
    path: window.location.pathname,
  });

  try {
    if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon('/api/erros', body)) return;
    void fetch('/api/erros', { method: 'POST', body, keepalive: true }).catch(() => {});
  } catch {
    /* relato é melhor esforço */
  }
}
