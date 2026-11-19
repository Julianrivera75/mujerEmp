import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { HttpError, parseBody, withAuth } from '@/lib/api';
import { dayKeyOf } from '@/lib/attendance-days';
import {
  assertValidImages,
  assertValidMentor,
  resolveImageKeys,
  resolveStudentIds,
} from '@/lib/class-validation';
import { classImageKeys } from '@/lib/class-images';
import { monthKeyOf } from '@/lib/months';
import { deleteObject } from '@/lib/s3';
import prisma from '@/lib/prisma';
import { bogotaDayRangeUtc, findMentorOverlaps, type OverlapWarning } from '@/lib/schedule-overlap';
import { createClassGroupSchema, updateClassGroupSchema } from '@/lib/schemas';
import { cleanText } from '@/lib/validators';

export const dynamic = 'force-dynamic';

interface SlotInput {
  id?: string;
  title: string;
  description?: string | null;
  dateStart: Date;
  dateEnd: Date;
  mentorId: string;
  imageKey?: string | null;
  imageKeys?: string[];
}

/** Todas las clases de una misma programación deben caer en el mismo día (zona de Bogotá). */
function assertSameDay(slots: readonly { dateStart: Date }[]) {
  const days = new Set(slots.map((s) => dayKeyOf(s.dateStart)));
  if (days.size > 1) throw new HttpError(400, 'Las clases de una misma programación deben ser del mismo día.');
}

/**
 * Avisos (no bloqueo) de mentora cruzada: entre las clases que se están guardando y, además, contra
 * las demás clases de esas mismas mentoras ese día (excluyendo las que son parte de esta misma edición).
 */
async function mentorOverlapWarnings(
  slots: readonly SlotInput[],
  excludeClassIds: readonly string[],
): Promise<OverlapWarning[]> {
  const mentorIds = Array.from(new Set(slots.map((s) => s.mentorId)));
  const mentors = await prisma.user.findMany({ where: { id: { in: mentorIds } }, select: { id: true, name: true } });
  const nameOf = new Map(mentors.map((m) => [m.id, m.name]));

  const dayKey = dayKeyOf(slots[0].dateStart);
  const [dayStart, dayEnd] = bogotaDayRangeUtc(dayKey);
  const others = await prisma.classSession.findMany({
    where: {
      mentorId: { in: mentorIds },
      status: { not: 'CANCELADA' },
      id: { notIn: [...excludeClassIds] },
      dateStart: { gte: dayStart, lt: dayEnd },
    },
    select: { id: true, title: true, mentorId: true, dateStart: true, dateEnd: true },
  });

  const candidates = [
    ...slots.map((s) => ({
      mentorId: s.mentorId,
      mentorName: nameOf.get(s.mentorId) ?? '',
      title: s.title,
      dateStart: s.dateStart,
      dateEnd: s.dateEnd,
    })),
    ...others.map((o) => ({
      mentorId: o.mentorId,
      mentorName: nameOf.get(o.mentorId) ?? '',
      title: o.title,
      dateStart: o.dateStart,
      dateEnd: o.dateEnd,
    })),
  ];
  return findMentorOverlaps(candidates);
}

/** Crea de 1 a 3 clases bajo un mismo link de día; con 2 o 3, comparten un `groupId` nuevo. */
export const POST = withAuth('classes/group POST', ['ADMIN'], async (req, user) => {
  const body = await parseBody(req, createClassGroupSchema);

  for (const slot of body.slots) {
    if (slot.dateEnd <= slot.dateStart) throw new HttpError(400, 'La fecha de fin debe ser posterior a la de inicio.');
  }
  assertSameDay(body.slots);
  for (const slot of body.slots) await assertValidMentor(slot.mentorId);

  const slotImages = body.slots.map((slot) =>
    resolveImageKeys([], { imageKeys: slot.imageKeys, imageKey: slot.imageKey }),
  );
  await Promise.all(slotImages.map((keys) => assertValidImages(keys, user.id)));

  const studentIds = await resolveStudentIds(body.studentIds);
  const warnings = await mentorOverlapWarnings(body.slots, []);
  const groupId = body.slots.length > 1 ? randomUUID() : null;

  const created = await prisma.$transaction(async (tx) => {
    const rows = await Promise.all(
      body.slots.map((slot, i) =>
        tx.classSession.create({
          data: {
            title: slot.title,
            description: cleanText(slot.description ?? '', 2000),
            dateStart: slot.dateStart,
            dateEnd: slot.dateEnd,
            mentorId: slot.mentorId,
            meetLink: body.meetLink,
            youtubeUrl: body.youtubeUrl,
            recordingNotes: cleanText(body.recordingNotes ?? '', 1000),
            status: body.status ?? 'PROGRAMADA',
            imageKey: slotImages[i][0] ?? null,
            imageKeys: slotImages[i],
            monthKey: monthKeyOf(slot.dateStart),
            groupId,
          },
        }),
      ),
    );
    if (studentIds.length > 0) {
      await tx.classEnrollment.createMany({
        data: rows.flatMap((r) => studentIds.map((studentId) => ({ classId: r.id, studentId }))),
      });
    }
    return rows;
  });

  const withMentor = await prisma.classSession.findMany({
    where: { id: { in: created.map((c) => c.id) } },
    include: { mentor: { select: { id: true, name: true, email: true } } },
    orderBy: { dateStart: 'asc' },
  });

  return NextResponse.json({ success: true, classSessions: withMentor, groupId, warnings });
});

/** Edita una programación: agrega, quita o reordena sus clases. Si queda en 1, deja de ser un grupo. */
export const PUT = withAuth('classes/group PUT', ['ADMIN'], async (req, user) => {
  const body = await parseBody(req, updateClassGroupSchema);

  for (const slot of body.slots) {
    if (slot.dateEnd <= slot.dateStart) throw new HttpError(400, 'La fecha de fin debe ser posterior a la de inicio.');
  }
  assertSameDay(body.slots);
  for (const slot of body.slots) await assertValidMentor(slot.mentorId);

  const keptIds = body.slots.map((s) => s.id).filter((id): id is string => Boolean(id));
  const removedIds = body.removedIds ?? [];
  const existingRows =
    keptIds.length + removedIds.length > 0
      ? await prisma.classSession.findMany({ where: { id: { in: [...keptIds, ...removedIds] } } })
      : [];
  const existingById = new Map(existingRows.map((r) => [r.id, r]));

  const slotImages = body.slots.map((slot) => {
    const existing = slot.id ? existingById.get(slot.id) : undefined;
    return resolveImageKeys(existing ? classImageKeys(existing) : [], {
      imageKeys: slot.imageKeys,
      imageKey: slot.imageKey,
    });
  });
  await Promise.all(
    body.slots.map((slot, i) => {
      const existing = slot.id ? existingById.get(slot.id) : undefined;
      const existingKeys = existing ? classImageKeys(existing) : [];
      return assertValidImages(slotImages[i].filter((key) => !existingKeys.includes(key)), user.id);
    }),
  );

  const studentIds = body.studentIds !== undefined ? await resolveStudentIds(body.studentIds) : null;
  const warnings = await mentorOverlapWarnings(body.slots, [...keptIds, ...removedIds]);
  const groupId = body.slots.length > 1 ? body.groupId || randomUUID() : null;

  const saved = await prisma.$transaction(async (tx) => {
    await Promise.all(removedIds.map((id) => tx.classSession.delete({ where: { id } })));

    const rows = await Promise.all(
      body.slots.map((slot, i) => {
        const existing = slot.id ? existingById.get(slot.id) : undefined;
        const data = {
          title: slot.title,
          description: cleanText(slot.description ?? '', 2000),
          dateStart: slot.dateStart,
          dateEnd: slot.dateEnd,
          mentorId: slot.mentorId,
          meetLink: body.meetLink,
          youtubeUrl: body.youtubeUrl,
          recordingNotes: cleanText(body.recordingNotes ?? '', 1000),
          status: body.status ?? 'PROGRAMADA',
          imageKey: slotImages[i][0] ?? null,
          imageKeys: slotImages[i],
          monthKey: monthKeyOf(slot.dateStart),
          groupId,
        };
        return existing
          ? tx.classSession.update({ where: { id: existing.id }, data })
          : tx.classSession.create({ data });
      }),
    );

    if (studentIds !== null) {
      const classIds = rows.map((r) => r.id);
      await tx.classEnrollment.deleteMany({ where: { classId: { in: classIds } } });
      if (studentIds.length > 0) {
        await tx.classEnrollment.createMany({
          data: classIds.flatMap((classId) => studentIds.map((studentId) => ({ classId, studentId }))),
        });
      }
    }

    return rows;
  });

  const removedImages = removedIds.flatMap((id) => classImageKeys(existingById.get(id) ?? {}));
  await Promise.all(removedImages.map((key) => deleteObject(key).catch(() => undefined)));

  const withMentor = await prisma.classSession.findMany({
    where: { id: { in: saved.map((c) => c.id) } },
    include: { mentor: { select: { id: true, name: true, email: true } } },
    orderBy: { dateStart: 'asc' },
  });

  return NextResponse.json({ success: true, classSessions: withMentor, groupId, warnings });
});
