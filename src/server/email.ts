import 'server-only';
import { platform } from '@/lib/platform';
import { siteUrl } from '@/lib/site';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  /** Versão sem HTML: leitores de tela, clientes antigos e filtros de spam olham para ela. */
  text: string;
}

export type EmailContent = Omit<EmailMessage, 'to'>;

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/** Há provedor configurado: o e-mail sai de verdade. */
export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/**
 * Fora de produção e sem provedor, o e-mail vai para o console do servidor.
 * É o que deixa testar recuperação de senha e confirmação sem criar conta em
 * provedor nenhum: o link aparece no terminal do `npm run dev`.
 */
export function emailGoesToConsole(): boolean {
  return !emailConfigured() && process.env.NODE_ENV !== 'production';
}

/**
 * Existe algum caminho para a mensagem chegar a alguém — o provedor ou, em
 * desenvolvimento, o console. Em produção equivale a `emailConfigured()`. As
 * telas perguntam isto para decidir se oferecem o que depende de e-mail.
 */
export function emailAvailable(): boolean {
  return emailConfigured() || emailGoesToConsole();
}

/**
 * Envia pelo Resend com um `fetch` simples (sem SDK: é um POST só).
 *
 * Nunca lança. Quem chama está no meio de um cadastro ou de um pedido de senha,
 * e um provedor fora do ar não pode virar tela de erro: o retorno diz se saiu.
 * `sent` também é verdadeiro quando a mensagem foi para o console em
 * desenvolvimento — para quem está testando, foi ali que ela "chegou".
 */
export async function sendEmail(message: EmailMessage): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV === 'production') {
      // Sem destinatário nem conteúdo: log de produção não é lugar para link de senha.
      console.warn('[email] RESEND_API_KEY e EMAIL_FROM não configurados: o e-mail não foi enviado.');
      return { sent: false };
    }
    logToConsole(message);
    return { sent: true };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      // Provedor pendurado não pode segurar a resposta de quem está esperando.
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      // O corpo do erro do Resend diz o motivo (domínio não verificado, chave inválida…).
      const detail = await response.text().catch(() => '');
      console.error(`[email] O Resend recusou o envio (${response.status}): ${detail.slice(0, 300)}`);
      return { sent: false };
    }
    return { sent: true };
  } catch (error) {
    console.error('[email] Falha ao falar com o Resend:', error instanceof Error ? error.message : error);
    return { sent: false };
  }
}

function logToConsole(message: EmailMessage): void {
  const lines = [
    '',
    '──────── [email] modo desenvolvimento: nada foi enviado ────────',
    `Para: ${message.to}`,
    `Assunto: ${message.subject}`,
    '',
    message.text,
  ];
  // Os links saem com a URL pública, que sem NEXT_PUBLIC_SITE_URL é a de
  // produção. Para quem está testando, o que serve é o mesmo caminho no servidor local.
  if (!/\/\/(localhost|127\.0\.0\.1)/.test(siteUrl)) {
    const localOrigin = `http://localhost:${process.env.PORT ?? 3000}`;
    const localLinks = message.text
      .split(/\s+/)
      .filter((word) => word.startsWith(`${siteUrl}/`))
      .map((link) => localOrigin + link.slice(siteUrl.length));
    if (localLinks.length > 0) {
      lines.push('', `No servidor local (o link acima usa NEXT_PUBLIC_SITE_URL = ${siteUrl}):`, ...localLinks);
    }
  }
  lines.push('────────────────────────────────────────────────────────────────', '');
  console.info(lines.join('\n'));
}

/* ------------------------------------------------------------------ mensagens */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

/**
 * Um layout só para todas as mensagens. Estilo inline e uma coluna estreita:
 * cliente de e-mail ignora <style>, e o Outlook ignora quase todo o resto.
 * O link aparece também por extenso, para quem tem o botão bloqueado.
 */
function renderEmail(params: {
  name: string;
  heading: string;
  intro: string;
  actionLabel: string;
  actionUrl: string;
  footnote: string;
}): { html: string; text: string } {
  const greeting = firstName(params.name) ? `Olá, ${firstName(params.name)}.` : 'Olá.';
  const url = escapeHtml(params.actionUrl);

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px 16px;background:#f7f7f7;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#3e3e3e;">
    <div style="max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;border:1px solid #e8e8e8;border-radius:12px;">
      <p style="margin:0 0 24px;font-size:18px;font-weight:700;color:#ea1d2c;">${escapeHtml(platform.name)}</p>
      <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#3e3e3e;">${escapeHtml(params.heading)}</h1>
      <p style="margin:0 0 8px;font-size:16px;line-height:1.5;">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.5;">${escapeHtml(params.intro)}</p>
      <p style="margin:0 0 24px;">
        <a href="${url}" style="display:inline-block;padding:14px 24px;background:#ea1d2c;border-radius:8px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;">${escapeHtml(params.actionLabel)}</a>
      </p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#6f6f6f;">Se o botão não abrir, copie e cole este endereço no navegador:</p>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.5;word-break:break-all;"><a href="${url}" style="color:#ea1d2c;">${url}</a></p>
      <p style="margin:0;padding-top:16px;border-top:1px solid #e8e8e8;font-size:14px;line-height:1.5;color:#6f6f6f;">${escapeHtml(params.footnote)}</p>
    </div>
    <p style="max-width:480px;margin:16px auto 0;font-size:12px;line-height:1.4;color:#6f6f6f;text-align:center;">${escapeHtml(platform.name)} · ${escapeHtml(platform.tagline)}</p>
  </body>
</html>`;

  const text = [
    greeting,
    '',
    params.intro,
    '',
    `${params.actionLabel}:`,
    params.actionUrl,
    '',
    params.footnote,
    '',
    `${platform.name} · ${platform.tagline}`,
  ].join('\n');

  return { html, text };
}

export function passwordResetEmail(params: { name: string; url: string }): EmailContent {
  return {
    subject: `Redefinir sua senha do ${platform.name}`,
    ...renderEmail({
      name: params.name,
      heading: 'Redefinir sua senha',
      intro: `Recebemos um pedido para redefinir a senha da sua conta no ${platform.name}. Abra o link abaixo para criar uma senha nova.`,
      actionLabel: 'Criar nova senha',
      actionUrl: params.url,
      footnote:
        'O link vale por 1 hora e só funciona uma vez. Se não foi você quem pediu, ignore este e-mail: sua senha continua a mesma.',
    }),
  };
}

export function emailVerificationEmail(params: { name: string; url: string }): EmailContent {
  return {
    subject: `Confirme seu e-mail no ${platform.name}`,
    ...renderEmail({
      name: params.name,
      heading: 'Confirme seu e-mail',
      intro: `Falta só confirmar que este e-mail é seu. É por ele que você recupera o acesso ao painel do ${platform.name} se esquecer a senha.`,
      actionLabel: 'Confirmar e-mail',
      actionUrl: params.url,
      footnote: `O link vale por 7 dias. Se você não criou uma conta no ${platform.name}, ignore este e-mail.`,
    }),
  };
}
