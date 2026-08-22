/**
 * Liga o modo demonstração (tudo no navegador, sem banco).
 * O valor é definido no build por next.config.ts: sem DATABASE_URL, liga sozinho.
 */
export const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === '1';
