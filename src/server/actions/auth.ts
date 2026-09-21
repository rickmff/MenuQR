'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { z } from 'zod';
import { platform } from '@/lib/platform';
import { absoluteUrl } from '@/lib/site';
import { sendVerificationEmail } from '../auth/email-verification';
import { hashPassword, verifyPassword } from '../auth/password';
import { endSession, getCurrentUser, startSession } from '../auth/session';
import { createToken, hashToken } from '../auth/tokens';
import { isUniqueViolation } from '../db/client';
import { emailAvailable, passwordResetEmail, sendEmail } from '../email';
import { clientIp, rateLimit, resetRateLimit } from '../rate-limit';
import { isEmailVerified, markEmailVerified } from '../repositories/email-verifications';
import {
  consumePasswordReset,
  createPasswordReset,
  getValidPasswordReset,
} from '../repositories/password-resets';
import { deleteUserSessions } from '../repositories/sessions';
import {
  createUser,
  getUserByEmail,
  normalizeEmail,
  updateUserPassword,
} from '../repositories/users';

export interface AuthFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: { name?: string; email?: string };
}

export interface ForgotPasswordState {
  /** Pedido aceito: a tela troca o formulário por `message`, igual para todo e-mail. */
  done?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export interface ResetPasswordState {
  /** O link deixou de valer entre a página abrir e o formulário ser enviado. */
  invalidToken?: boolean;
  fieldErrors?: Record<string, string>;
}

export interface ResendVerificationState {
  status?: 'sent' | 'verified' | 'error';
  message?: string;
}

const HOUR = 60 * 60 * 1000;

// A mesma regra no cadastro e na redefinição: senha que passa num tem de passar no outro.
const passwordRule = z
  .string()
  .min(8, 'A senha precisa de pelo menos 8 caracteres.')
  .max(200, 'Senha muito longa.');

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome.').max(80, 'Nome muito longo.'),
  email: z.string().trim().email('Informe um e-mail válido.').max(160),
  password: passwordRule,
});

const loginSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.').max(160),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1).max(200),
  password: passwordRule,
});

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    result[key] ??= issue.message;
  }
  return result;
}

/** Destino seguro após o login: só caminhos internos são aceitos. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === 'string' ? value : '';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/painel';
}

export async function signupAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = {
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  };
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error), values: { name: raw.name, email: raw.email } };
  }

  const ip = await clientIp();
  const limits = await Promise.all([
    rateLimit(`signup:${normalizeEmail(parsed.data.email)}`, 5, 15 * 60 * 1000),
    rateLimit(`signup-ip:${ip}`, 10, 60 * 60 * 1000),
  ]);
  if (limits.some((limit) => !limit.allowed)) {
    return { error: 'Muitas tentativas seguidas. Tente novamente em alguns minutos.' };
  }

  const emailTaken: AuthFormState = {
    fieldErrors: { email: 'Já existe uma conta com este e-mail. Faça login.' },
    values: { name: raw.name, email: raw.email },
  };
  if (await getUserByEmail(parsed.data.email)) return emailTaken;

  let user;
  try {
    user = await createUser({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
    });
  } catch (error) {
    // Clique duplo no botão: o segundo envio chega depois da checagem acima.
    if (isUniqueViolation(error)) return emailTaken;
    throw error;
  }

  await startSession(user.id);

  // Depois da resposta: o provedor de e-mail pode demorar, e o lojista não
  // precisa esperar por ele para cair no painel. `sendVerificationEmail` nunca
  // lança, então nem uma falha no envio alcança o cadastro.
  if (emailAvailable()) {
    const created = user;
    after(() => sendVerificationEmail(created));
  }

  redirect('/painel/comecar');
}

export async function loginAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = {
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  };
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error), values: { email: raw.email } };
  }

  // Três contadores. O par e-mail+IP é o que barra quem erra a senha; o de IP
  // segura quem varre e-mails; o de e-mail sozinho é folgado de propósito — se
  // fosse apertado, qualquer pessoa travava o login de um lojista só por saber
  // o e-mail dele.
  const email = normalizeEmail(parsed.data.email);
  const ip = await clientIp();
  const key = `login:${email}:${ip}`;
  const limits = await Promise.all([
    rateLimit(key, 8, 15 * 60 * 1000),
    rateLimit(`login-ip:${ip}`, 40, 15 * 60 * 1000),
    rateLimit(`login-email:${email}`, 60, 15 * 60 * 1000),
  ]);
  if (limits.some((limit) => !limit.allowed)) {
    return { error: 'Muitas tentativas de acesso. Aguarde alguns minutos e tente de novo.' };
  }

  const user = await getUserByEmail(parsed.data.email);
  // Mensagem única para e-mail inexistente e senha errada: não revela quem tem conta.
  const genericError = { error: 'E-mail ou senha incorretos.', values: { email: raw.email } };
  if (!user) return genericError;

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) return genericError;

  await resetRateLimit(key);
  await startSession(user.id);
  redirect(safeNext(formData.get('proximo')));
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect('/');
}

/* ------------------------------------------------------- recuperar a senha */

export async function requestPasswordResetAction(
  _state: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordSchema.safeParse({ email: String(formData.get('email') ?? '') });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  // A tela nem mostra o formulário nesse caso; isto cobre quem envia por fora.
  if (!emailAvailable()) {
    return {
      error: `A recuperação automática ainda não está ativa. Escreva para ${platform.email} que a gente ajuda.`,
    };
  }

  // Os dois limites valem para qualquer e-mail, com conta ou sem: estourar um
  // deles não conta nada a quem está sondando. O de e-mail também impede que
  // alguém encha a caixa de entrada de um lojista só por saber o endereço dele.
  const email = normalizeEmail(parsed.data.email);
  const ip = await clientIp();
  const limits = await Promise.all([
    rateLimit(`reset:${email}`, 3, HOUR),
    rateLimit(`reset-ip:${ip}`, 10, HOUR),
  ]);
  if (limits.some((limit) => !limit.allowed)) {
    return {
      error: 'Muitos pedidos seguidos. Confira sua caixa de entrada e o spam, ou tente de novo em 1 hora.',
    };
  }

  const user = await getUserByEmail(email);
  if (user) {
    const { token, tokenHash } = createToken();
    await createPasswordReset(user.id, tokenHash, new Date(Date.now() + HOUR));
    const content = passwordResetEmail({
      name: user.name,
      url: absoluteUrl(`/redefinir-senha/${token}`),
    });
    // Depois da resposta: a ida ao provedor leva centenas de milissegundos, e
    // essa demora só existiria para e-mail com conta — daria para descobrir
    // quem é cliente cronometrando o formulário.
    after(() => sendEmail({ to: user.email, ...content }));
  }

  // A mesma resposta com conta ou sem: não revela quem é cliente.
  return {
    done: true,
    message:
      'Se existir uma conta com este e-mail, enviamos um link para criar uma senha nova. Ele vale por 1 hora.',
  };
}

export async function resetPasswordAction(
  _state: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const raw = {
    token: String(formData.get('token') ?? ''),
    password: String(formData.get('password') ?? ''),
  };
  const parsed = resetPasswordSchema.safeParse(raw);
  const fieldErrors: Record<string, string> = parsed.success ? {} : fieldErrorsOf(parsed.error);

  const invalidToken: ResetPasswordState = { invalidToken: true };
  if (fieldErrors.token) return invalidToken;

  // Só reclama da confirmação quando a senha em si já está boa: um erro por vez.
  if (!fieldErrors.password && raw.password !== String(formData.get('confirmation') ?? '')) {
    fieldErrors.confirmation = 'As senhas não são iguais.';
  }
  if (!parsed.success || Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // Confere antes de calcular o hash da senha: o scrypt é caro de propósito, e
  // um link inventado não pode custar CPU ao servidor.
  const tokenHash = hashToken(parsed.data.token);
  if (!(await getValidPasswordReset(tokenHash))) return invalidToken;

  const passwordHash = await hashPassword(parsed.data.password);

  // Só agora o link é gasto, numa instrução atômica: dois envios simultâneos
  // não passam os dois, e uma falha no hash acima não queima o link à toa.
  const userId = await consumePasswordReset(tokenHash);
  if (!userId) return invalidToken;

  await updateUserPassword(userId, passwordHash);
  // Quem pediu a troca pode ter perdido o controle da conta: cai todo mundo.
  await deleteUserSessions(userId);
  // Abrir o link provou que a caixa de entrada é dele — vale como confirmação.
  await markEmailVerified(userId);

  await startSession(userId);
  redirect('/painel');
}

/* ------------------------------------------------------- confirmar o e-mail */

/** Sem parâmetros: o botão "Reenviar e-mail" não tem campos, e o estado anterior não importa. */
export async function resendVerificationAction(): Promise<ResendVerificationState> {
  const user = await getCurrentUser();
  if (!user) return { status: 'error', message: 'Sua sessão expirou. Entre novamente para continuar.' };

  if (await isEmailVerified(user.id)) {
    // Confirmou em outra aba: some com a faixa em vez de mandar mais um e-mail.
    revalidatePath('/painel', 'layout');
    return { status: 'verified', message: 'Seu e-mail já está confirmado.' };
  }

  if (!emailAvailable()) {
    return { status: 'error', message: 'O envio de e-mails ainda não está ativo.' };
  }

  const limit = await rateLimit(`verify-resend:${user.id}`, 3, HOUR);
  if (!limit.allowed) {
    return {
      status: 'error',
      message: 'Você já pediu esse e-mail algumas vezes. Confira o spam ou tente de novo em 1 hora.',
    };
  }

  const { sent } = await sendVerificationEmail(user);
  return sent
    ? { status: 'sent', message: `Enviamos um novo link para ${user.email}.` }
    : { status: 'error', message: 'Não foi possível enviar o e-mail. Tente novamente.' };
}
