import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { HttpError, parseBody, withAuth } from '@/lib/api';
import prisma from '@/lib/prisma';
import { deleteObject } from '@/lib/s3';
import { anonymizeSchema } from '@/lib/schemas';

/**
 * Supresión de datos personales (Ley 1581 de 2012, art. 8): la cuenta se anonimiza en lugar de borrarse,
 * para conservar el registro académico agregado (asistencias, calificaciones) sin datos que identifiquen a la persona.
 */
export const POST = withAuth('admin/users anonymize', ['ADMIN'], async (req, currentUser) => {
  const { id } = await parseBody(req, anonymizeSchema);
  if (id === currentUser.id) throw new HttpError(400, 'No puedes anonimizar tu propia cuenta.');

  const target = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      avatar: true,
      anonymizedAt: true,
      submissions: { select: { id: true, fileUrl: true, fileType: true } },
    },
  });
  if (!target) throw new HttpError(404, 'Usuario no encontrado.');
  if (target.anonymizedAt) throw new HttpError(409, 'Esta cuenta ya fue anonimizada.');

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
        studentNumber: null,
        phone: null,
        avatar: null,
        status: 'INACTIVO',
        guardianName: null,
        guardianContact: null,
        anonymizedAt: new Date(),
        tokenVersion: { increment: 1 },
      },
    }),
  ]);

  return NextResponse.json({ success: true, filesFailed });
});
