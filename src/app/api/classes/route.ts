import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { HttpError, MAX_ROWS, parseBody, parseValue, withAuth } from '@/lib/api';
import { monthKeyOf } from '@/lib/months';
import { rolesOf } from '@/lib/roles';
import { createPresignedDownloadUrl, deleteObject, keyBelongsTo, verifyUploadedObject } from '@/lib/s3';
import prisma from '@/lib/prisma';
import { createClassSchema, meetLink, updateClassSchema, youtubeLink } from '@/lib/schemas';
import { CLASS_STATUSES, cleanText, isOneOf, parseDate } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export const GET = withAuth('classes GET', 'any', async (req, user) => {
  const { searchParams } = new URL(req.url);
  const monthKey = searchParams.get('monthKey'); // p. ej. "2026-09"
  const status = searchParams.get('status');

  const where: Prisma.ClassSessionWhereInput = {};
  if (monthKey && /^\d{4}-\d{2}$/.test(monthKey)) where.monthKey = monthKey;
  if (status && isOneOf(CLASS_STATUSES, status)) where.status = status;

  if (user.role === 'MENTOR') where.mentorId = user.id;
  if (user.role === 'STUDENT') where.enrollments = { some: { studentId: user.id } };

  // Cada rol recibe solo los datos personales que necesita (minimización de datos).
  const mentorSelect: Prisma.UserSelect =
    user.role === 'ADMIN' ? { id: true, name: true, email: true, phone: true } : { id: true, name: true };
  const studentSelect: Prisma.UserSelect =
    user.role === 'ADMIN'
      ? { id: true, name: true, email: true, memberNumber: true }
      : user.role === 'MENTOR'
        ? { id: true, name: true, email: true }
        : { id: true, name: true };
  const ownOnly = user.role === 'STUDENT' ? { studentId: user.id } : undefined;

  const classes = await prisma.classSession.findMany({
    where,
    include: {
      mentor: { select: mentorSelect },
      enrollments: { where: ownOnly, include: { student: { select: studentSelect } } },
      attendances: { where: ownOnly, include: { student: { select: studentSelect } } },
      assignments: { select: { id: true, title: true, dueDate: true } },
      resources: true,
    },
    orderBy: { dateStart: 'asc' },
    take: MAX_ROWS,
  });

  // El afiche se entrega con una URL firmada de lectura (se calcula localmente, sin viaje de red).
  const withImages = await Promise.all(
    classes.map(async (cls) => ({
      ...cls,
      imageUrl: cls.imageKey ? await createPresignedDownloadUrl(cls.imageKey).catch(() => null) : null,
    })),
  );

  return NextResponse.json({ classes: withImages });
});

/** Valida un afiche nuevo: debe ser propio, existir en el almacenamiento y ser una imagen permitida. */
async function assertValidImage(imageKey: string, ownerId: string) {
  if (!keyBelongsTo(imageKey, 'classImage', ownerId) || !(await verifyUploadedObject(imageKey, 'classImage'))) {
    throw new HttpError(400, 'La imagen no es válida. Sube una foto JPG, PNG o WebP de hasta 5 MB.');
  }
}

async function resolveStudentIds(ids: readonly string[] | null | undefined): Promise<string[]> {
  const unique = Array.from(new Set(ids ?? []));
  if (unique.length === 0) return [];
  const found = await prisma.user.findMany({
    where: { id: { in: unique }, OR: [{ role: 'STUDENT' }, { extraRoles: { has: 'STUDENT' } }] },
    select: { id: true },
  });
  return found.map((u) => u.id);
}

async function assertValidMentor(mentorId: string) {
  const mentor = await prisma.user.findUnique({ where: { id: mentorId }, select: { role: true, extraRoles: true } });
  if (!mentor || !(rolesOf(mentor).includes('MENTOR') || mentor.role === 'ADMIN')) {
    throw new HttpError(400, 'La mentora seleccionada no es válida.');
  }
}

export const POST = withAuth('classes POST', ['ADMIN'], async (req, user) => {
  const body = await parseBody(req, createClassSchema);
  const imageKey = body.imageKey?.trim() || null;
  if (imageKey) await assertValidImage(imageKey, user.id);
  if (body.dateEnd <= body.dateStart) {
    throw new HttpError(400, 'La fecha de fin debe ser posterior a la de inicio.');
  }
  await assertValidMentor(body.mentorId);

  const studentIds = await resolveStudentIds(body.studentIds);

  const newClass = await prisma.classSession.create({
    data: {
      title: body.title,
      description: cleanText(body.description ?? '', 2000),
      dateStart: body.dateStart,
      dateEnd: body.dateEnd,
      mentorId: body.mentorId,
      meetLink: body.meetLink,
      youtubeUrl: body.youtubeUrl,
      recordingNotes: cleanText(body.recordingNotes ?? '', 1000),
      status: body.status ?? 'PROGRAMADA',
      imageKey,
      monthKey: monthKeyOf(body.dateStart),
      enrollments: studentIds.length > 0 ? { create: studentIds.map((studentId) => ({ studentId })) } : undefined,
    },
    include: {
      mentor: { select: { id: true, name: true, email: true } },
      enrollments: { include: { student: { select: { id: true, name: true, email: true } } } },
    },
  });

  return NextResponse.json({ success: true, classSession: newClass });
});

export const PUT = withAuth('classes PUT', ['ADMIN', 'MENTOR'], async (req, user) => {
  const body = await parseBody(req, updateClassSchema);

  const existing = await prisma.classSession.findUnique({ where: { id: body.id } });
  if (!existing) throw new HttpError(404, 'Clase no encontrada.');

  // Si el campo no viene se conserva el valor actual; si viene, se valida.
  const newMeetLink = body.meetLink === undefined ? existing.meetLink : parseValue(meetLink, body.meetLink);
  const newYoutubeUrl = body.youtubeUrl === undefined ? existing.youtubeUrl : parseValue(youtubeLink, body.youtubeUrl);
  const newNotes =
    body.recordingNotes === undefined ? existing.recordingNotes : cleanText(body.recordingNotes ?? '', 1000);

  // Afiche: si no viene se conserva; si viene vacío se quita; si es nuevo se valida y se borra el anterior.
  let newImageKey = existing.imageKey;
  if (body.imageKey !== undefined) {
    newImageKey = body.imageKey?.trim() || null;
    if (newImageKey && newImageKey !== existing.imageKey) await assertValidImage(newImageKey, user.id);
  }
  const replacedImage = existing.imageKey && existing.imageKey !== newImageKey ? existing.imageKey : null;

  // Una mentora solo puede editar sus propias clases y únicamente los enlaces y las notas de la grabación.
  if (user.role === 'MENTOR') {
    if (existing.mentorId !== user.id) throw new HttpError(403, 'No tienes permiso para modificar esta clase.');

    const updated = await prisma.classSession.update({
      where: { id: body.id },
      data: { meetLink: newMeetLink, youtubeUrl: newYoutubeUrl, recordingNotes: newNotes, imageKey: newImageKey },
    });
    if (replacedImage) await deleteObject(replacedImage).catch(() => undefined);
    return NextResponse.json({ success: true, classSession: updated });
  }

  const start = body.dateStart ? parseDate(body.dateStart) : existing.dateStart;
  const end = body.dateEnd ? parseDate(body.dateEnd) : existing.dateEnd;
  if (!start || !end || end <= start) throw new HttpError(400, 'Las fechas de la clase no son válidas.');

  if (body.mentorId && body.mentorId !== existing.mentorId) await assertValidMentor(body.mentorId);

  if (body.studentIds) {
    const studentIds = await resolveStudentIds(body.studentIds);
    await prisma.classEnrollment.deleteMany({ where: { classId: body.id } });
    if (studentIds.length > 0) {
      await prisma.classEnrollment.createMany({
        data: studentIds.map((studentId) => ({ classId: body.id, studentId })),
      });
    }
  }

  const updated = await prisma.classSession.update({
    where: { id: body.id },
    data: {
      title: cleanText(body.title ?? '', 200) ?? existing.title,
      description: body.description === undefined ? existing.description : cleanText(body.description ?? '', 2000),
      dateStart: start,
      dateEnd: end,
      mentorId: body.mentorId || existing.mentorId,
      meetLink: newMeetLink,
      youtubeUrl: newYoutubeUrl,
      recordingNotes: newNotes,
      imageKey: newImageKey,
      status: body.status ?? existing.status,
      monthKey: monthKeyOf(start),
    },
    include: {
      mentor: { select: { id: true, name: true, email: true } },
      enrollments: { include: { student: { select: { id: true, name: true, email: true } } } },
    },
  });

  if (replacedImage) await deleteObject(replacedImage).catch(() => undefined);
  return NextResponse.json({ success: true, classSession: updated });
});

export const DELETE = withAuth('classes DELETE', ['ADMIN'], async (req) => {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) throw new HttpError(400, 'ID de clase requerido.');

  const existing = await prisma.classSession.findUnique({ where: { id }, select: { imageKey: true } });
  await prisma.classSession.delete({ where: { id } });
  if (existing?.imageKey) await deleteObject(existing.imageKey).catch(() => undefined);
  return NextResponse.json({ success: true, message: 'Clase eliminada con éxito.' });
});
