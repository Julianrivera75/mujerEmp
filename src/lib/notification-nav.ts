import type { Role } from './roles';

/** Rol con el que se ve la ruta de una notificación (las rutas por rol empiezan por su segmento). */
export function roleForHref(href: string): Role | null {
  if (href.startsWith('/estudiante')) return 'STUDENT';
  if (href.startsWith('/mentor')) return 'MENTOR';
  if (href.startsWith('/admin')) return 'ADMIN';
  return null;
}

/** Solo se permiten rutas internas: una notificación nunca lleva fuera de la plataforma. */
export const isInternalHref = (href: string) => href.startsWith('/') && !href.startsWith('//');
