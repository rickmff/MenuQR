/**
 * Substituto de `next/cache` para os scripts: fora do Next não há cache para
 * invalidar, e o código do servidor chama `revalidatePath` depois de escrever.
 */
export function revalidatePath() {}
export function revalidateTag() {}
export function unstable_cache(fn) {
  return fn;
}
