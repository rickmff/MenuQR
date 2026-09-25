import { notFound } from 'next/navigation';

/** Endereço que não existe: cai no `not-found` do idioma, com a casca do site. */
export default function CatchAll() {
  notFound();
}
