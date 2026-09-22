import 'server-only';
import type { UserJSON } from '@clerk/nextjs/server';

/** O que espelhamos do Clerk na linha do dono. */
export interface ClerkProfile {
  name: string;
  email: string;
}

/**
 * Conta aberta sem e-mail (só telefone, por exemplo). `users.email` é UNIQUE e
 * NOT NULL, então algum valor precisa existir; este nunca colide com um
 * endereço real e é fácil de reconhecer no banco.
 */
function placeholderEmail(clerkUserId: string): string {
  return `${clerkUserId}@sem-email.menuqr`;
}

function nameOrEmail(name: string, email: string): string {
  return name.trim() || email.split('@')[0] || email;
}

/** A partir do objeto que `currentUser()` devolve no servidor. */
export function profileFromClerkUser(user: {
  id: string;
  primaryEmailAddress?: { emailAddress: string } | null;
  fullName: string | null;
  firstName: string | null;
}): ClerkProfile {
  const email = user.primaryEmailAddress?.emailAddress ?? placeholderEmail(user.id);
  return { name: nameOrEmail(user.fullName ?? user.firstName ?? '', email), email };
}

/** A partir do payload de `user.created`/`user.updated` do webhook. */
export function profileFromWebhookUser(data: UserJSON): ClerkProfile {
  const primary = data.email_addresses.find((entry) => entry.id === data.primary_email_address_id);
  const email = primary?.email_address ?? data.email_addresses[0]?.email_address ?? placeholderEmail(data.id);
  const name = [data.first_name, data.last_name].filter(Boolean).join(' ');
  return { name: nameOrEmail(name, email), email };
}
