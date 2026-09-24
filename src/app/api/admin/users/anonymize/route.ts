import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { deleteObject } from '@/lib/s3';
import { logError } from '@/lib/log';

/**
 * Supresión de datos personales (Ley 1581 de 2012, art. 8): la cuenta se anonimiza en lugar de borrarse,
 * para conservar el registro académico agregado (asistencias, calificaciones) sin datos que identifiquen a la persona.
 */
export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const { id } = await req.json();
    if (typeof id !== 'string' || !id) {
      return NextResponse.json({ error: 'ID de usuario requerido.' }, { status: 400 });
    }
    if (id === currentUser.id) {
      return NextResponse.json({ error: 'No puedes anonimizar tu propia cuenta.' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, avatar: true, anonymizedAt: true, submissions: { select: { id: true, fileUrl: true, fileType: true } } },
    });
    if (!target) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }
    if (target.anonymizedAt) {
      return NextResponse.json({ error: 'Esta cuenta ya fue anonimizada.' }, { status: 409 });
    }

    // Archivos almacenados (avatar y entregas): se eliminan del almacenamiento.
    const keys: string[] = [];
    if (target.avatar) keys.push(target.avatar);
    for (const sub of target.submissions) {
      if (sub.fileUrl && (sub.fileType === 'PDF' || sub.fileType === 'IMAGE')) keys.push(sub.fileUrl);
    }
    let filesFailed = 0;
    for (const key of keys) {
      try {
        await deleteObject(key);
      } catch {
        filesFailed += 1;
      }
    }

    const randomPasswordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);

    await prisma.$transaction([
      prisma.submission.updateMany({ where: { studentId: id }, data: { notes: null, fileUrl: null } }),
      prisma.user.update({
        where: { id },
        data: {
          name: 'Usuaria anonimizada',
          email: `anonimizada-${id}@anonimizada.invalid`,
          passwordHash: randomPasswordHash,
          documentId: null,
          phone: null,
          avatar: null,
          status: 'INACTIVO',
          guardianName: null,
          guardianContact: null,
          anonymizedAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({ success: true, filesFailed });
  } catch (error) {
    logError('admin/users anonymize', error);
    return NextResponse.json({ error: 'No se pudo anonimizar la cuenta.' }, { status: 500 });
  }
}
