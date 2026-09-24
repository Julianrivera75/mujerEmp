import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logError } from '@/lib/log';
import {
  createPresignedUploadUrl,
  createPresignedDownloadUrl,
  UPLOAD_CATEGORIES,
  type UploadCategory,
} from '@/lib/s3';

function isValidCategory(value: unknown): value is UploadCategory {
  return typeof value === 'string' && value in UPLOAD_CATEGORIES;
}

/** Quién puede SUBIR a cada categoría. */
function canUpload(category: UploadCategory, role: string): boolean {
  switch (category) {
    case 'submission':
      return role === 'STUDENT';
    case 'resource':
      return role === 'MENTOR' || role === 'ADMIN';
    case 'certificate':
      return role === 'MENTOR' || role === 'ADMIN';
    case 'avatar':
      return true; // cualquier usuario autenticado sube su propio avatar
    default:
      return false;
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const body = await req.json();
    const { category, fileName, contentType, sizeBytes } = body;

    if (!isValidCategory(category)) {
      return NextResponse.json({ error: 'Categoría de archivo inválida.' }, { status: 400 });
    }

    if (!canUpload(category, user.role)) {
      return NextResponse.json({ error: 'No tenés permiso para subir este tipo de archivo.' }, { status: 403 });
    }

    if (typeof fileName !== 'string' || !fileName || typeof contentType !== 'string' || !contentType) {
      return NextResponse.json({ error: 'Falta nombre de archivo o tipo de contenido.' }, { status: 400 });
    }

    const config = UPLOAD_CATEGORIES[category];

    if (!(config.allowedTypes as readonly string[]).includes(contentType)) {
      return NextResponse.json(
        { error: `Tipo de archivo no permitido. Permitidos: ${config.allowedTypes.join(', ')}` },
        { status: 400 },
      );
    }

    if (typeof sizeBytes !== 'number' || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      return NextResponse.json({ error: 'Falta el tamaño del archivo.' }, { status: 400 });
    }

    if (sizeBytes > config.maxSizeBytes) {
      const maxMb = Math.round(config.maxSizeBytes / (1024 * 1024));
      return NextResponse.json({ error: `El archivo supera el tamaño máximo permitido (${maxMb} MB).` }, { status: 400 });
    }

    const { uploadUrl, key } = await createPresignedUploadUrl(category, user.id, fileName, contentType);

    return NextResponse.json({ uploadUrl, key });
  } catch (error) {
    logError('upload POST', error);
    return NextResponse.json({ error: 'Error al preparar la subida del archivo.' }, { status: 500 });
  }
}

/** Devuelve una URL firmada de lectura para un archivo ya subido, verificando permisos por categoría. */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    if (!key) {
      return NextResponse.json({ error: 'Falta el parámetro key.' }, { status: 400 });
    }

    // El key tiene forma "<categoria>/<ownerId>/<archivo>" — validamos que sea un formato conocido.
    const [prefix, ownerId] = key.split('/');
    const category = (Object.entries(UPLOAD_CATEGORIES).find(([, c]) => c.prefix === prefix)?.[0] ??
      null) as UploadCategory | null;

    if (!category) {
      return NextResponse.json({ error: 'Archivo no encontrado.' }, { status: 404 });
    }

    const isOwner = ownerId === user.id;
    const isAdmin = user.role === 'ADMIN';
    // Los materiales de clase los puede abrir cualquier usuaria autenticada; el resto es privado.
    const isSharedMaterial = category === 'resource';

    let allowed = isOwner || isAdmin || isSharedMaterial;

    // Una mentora solo accede a las entregas de las clases que dicta y a los avatares de sus estudiantes.
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

    if (!allowed) {
      return NextResponse.json({ error: 'No tienes permiso para acceder a este archivo.' }, { status: 403 });
    }

    const url = await createPresignedDownloadUrl(key);
    return NextResponse.json({ url });
  } catch (error) {
    logError('upload GET', error);
    return NextResponse.json({ error: 'Error al acceder al archivo.' }, { status: 500 });
  }
}
