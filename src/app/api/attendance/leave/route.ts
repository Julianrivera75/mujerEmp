import { NextResponse } from 'next/server';
import { HttpError, parseBody, withAuth } from '@/lib/api';
import prisma from '@/lib/prisma';
import { chainOf } from '@/lib/rooms';
import { loadRoomClasses } from '@/lib/rooms-db';
import { leaveRoomSchema } from '@/lib/schemas';

/**
 * La estudiante avisa que salió de la sala: deja de recibir la asistencia por permanencia de las clases que siguen.
 * Conserva la asistencia que ya tiene.
 */
export const POST = withAuth('attendance/leave', ['STUDENT'], async (req, user) => {
  const { classId } = await parseBody(req, leaveRoomSchema);

  const classSession = await prisma.classSession.findUnique({ where: { id: classId }, select: { dateStart: true } });
  if (!classSession) throw new HttpError(404, 'Clase no encontrada.');

  const chain = chainOf(classId, await loadRoomClasses(classSession.dateStart)) ?? [{ id: classId }];
  const result = await prisma.attendance.updateMany({
    where: { studentId: user.id, classId: { in: chain.map((c) => c.id) }, leftAt: null },
    data: { leftAt: new Date() },
  });

  return NextResponse.json({ success: true, updated: result.count });
});
