import { HttpError } from './api';
import { MAX_CLASS_IMAGES } from './class-images';
import prisma from './prisma';
import { rolesOf } from './roles';
import { keyBelongsTo, verifyUploadedObject } from './s3';

/**
 * Validaciones de clase compartidas entre `/api/classes` (una sola clase) y `/api/classes/group`
 * (de 1 a 3 clases bajo un mismo link). Viven aparte para que ninguna de las dos rutas las duplique.
 */

/** Valida una foto nueva: debe ser propia, existir en el almacenamiento y ser una imagen permitida (JPG, PNG o WebP). */
async function assertValidImage(imageKey: string, ownerId: string) {
  if (!keyBelongsTo(imageKey, 'classImage', ownerId) || !(await verifyUploadedObject(imageKey, 'classImage'))) {
    throw new HttpError(400, 'La imagen no es válida. Sube una foto JPG, PNG o WebP de hasta 5 MB.');
  }
}

const cleanKeys = (keys: readonly string[]) => Array.from(new Set(keys.map((key) => key.trim()).filter(Boolean)));

/** Fotos que dejará una edición: la lista nueva o, con el campo anterior de una sola foto, solo se cambia la primera. */
export function resolveImageKeys(
  existing: string[],
  requested: { imageKeys?: string[]; imageKey?: string | null },
): string[] {
  if (requested.imageKeys !== undefined) return cleanKeys(requested.imageKeys);
  if (requested.imageKey === undefined) return existing;
  const legacy = requested.imageKey?.trim() || null;
  return legacy ? cleanKeys([legacy, ...existing.slice(1)]) : existing.slice(1);
}

export async function assertValidImages(keys: readonly string[], ownerId: string) {
  if (keys.length > MAX_CLASS_IMAGES) throw new HttpError(400, `Puedes subir hasta ${MAX_CLASS_IMAGES} fotos.`);
  for (const key of keys) await assertValidImage(key, ownerId);
}

export async function resolveStudentIds(ids: readonly string[] | null | undefined): Promise<string[]> {
  const unique = Array.from(new Set(ids ?? []));
  if (unique.length === 0) return [];
  const found = await prisma.user.findMany({
    where: { id: { in: unique }, OR: [{ role: 'STUDENT' }, { extraRoles: { has: 'STUDENT' } }] },
    select: { id: true },
  });
  return found.map((u) => u.id);
}

export async function assertValidMentor(mentorId: string) {
  const mentor = await prisma.user.findUnique({ where: { id: mentorId }, select: { role: true, extraRoles: true } });
  if (!mentor || !(rolesOf(mentor).includes('MENTOR') || mentor.role === 'ADMIN')) {
    throw new HttpError(400, 'La mentora seleccionada no es válida.');
  }
}
