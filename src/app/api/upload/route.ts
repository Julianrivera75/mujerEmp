import { NextResponse } from 'next/server';
import { HttpError, parseBody, withAuth } from '@/lib/api';
import prisma from '@/lib/prisma';
import { createPresignedDownloadUrl, createPresignedUploadUrl, UPLOAD_CATEGORIES, type UploadCategory } from '@/lib/s3';
import { uploadRequestSchema } from '@/lib/schemas';

function isValidCategory(value: string): value is UploadCategory {
  return value in UPLOAD_CATEGORIES;
}

/** Quién puede SUBIR a cada categoría. */
function canUpload(category: UploadCategory, role: string): boolean {
  switch (category) {
    case 'submission':
      return role === 'STUDENT';
    case 'resource':
    case 'certificate':
      return role === 'MENTOR' || role === 'ADMIN';
    case 'avatar':
      return true; // cualquier usuaria con sesión sube su propia foto
  }
}

export const POST = withAuth('upload POST', 'any', async (req, user) => {
  const { category, fileName, contentType, sizeBytes } = await parseBody(req, uploadRequestSchema);

  if (!isValidCategory(category)) throw new HttpError(400, 'Categoría de archivo inválida.');
  if (!canUpload(category, user.role)) throw new HttpError(403, 'No tienes permiso para subir este tipo de archivo.');

  const config = UPLOAD_CATEGORIES[category];
  if (!(config.allowedTypes as readonly string[]).includes(contentType)) {
    throw new HttpError(400, `Tipo de archivo no permitido. Permitidos: ${config.allowedTypes.join(', ')}`);
  }
  if (sizeBytes > config.maxSizeBytes) {
    const maxMb = Math.round(config.maxSizeBytes / (1024 * 1024));
    throw new HttpError(400, `El archivo supera el tamaño máximo permitido (${maxMb} MB).`);
  }

  const { uploadUrl, key } = await createPresignedUploadUrl(category, user.id, fileName, contentType);
  return NextResponse.json({ uploadUrl, key });
});

/** Devuelve una URL firmada de lectura para un archivo ya subido, verificando permisos por categoría. */
export const GET = withAuth('upload GET', 'any', async (req, user) => {
  const key = new URL(req.url).searchParams.get('key');
  if (!key) throw new HttpError(400, 'Falta el parámetro key.');

  // La clave tiene forma "<categoría>/<idDueña>/<archivo>": se valida que sea un formato conocido.
  const [prefix, ownerId] = key.split('/');
  const category = (Object.entries(UPLOAD_CATEGORIES).find(([, c]) => c.prefix === prefix)?.[0] ??
    null) as UploadCategory | null;
  if (!category) throw new HttpError(404, 'Archivo no encontrado.');

  const isOwner = ownerId === user.id;
  const isAdmin = user.role === 'ADMIN';
  // Los materiales de clase los puede abrir cualquier usuaria con sesión; el resto es privado.
  const isSharedMaterial = category === 'resource';

  let allowed = isOwner || isAdmin || isSharedMaterial;

  // Una mentora solo accede a las entregas de las clases que dicta y a las fotos de sus estudiantes.
  if (!allowed && user.role === 'MENTOR') {
    if (category === 'submission') {
      const own = await prisma.submission.findFirst({
        where: { fileUrl: key, assignment: { classSession: { mentorId: user.id } } },
        select: { id: true },
      });
      allowed = Boolean(own);
    } else if (category === 'avatar') {
      const shared = await prisma.classEnrollment.findFirst({
        where: { studentId: ownerId, classSession: { mentorId: user.id } },
        select: { id: true },
      });
      allowed = Boolean(shared);
    }
  }

  if (!allowed) throw new HttpError(403, 'No tienes permiso para acceder a este archivo.');

  return NextResponse.json({ url: await createPresignedDownloadUrl(key) });
});
