import { NextResponse } from 'next/server';
import { HttpError, parseBody, withAuth } from '@/lib/api';
import prisma from '@/lib/prisma';
import { resolveTargetClass } from '@/lib/rooms';
import { loadRoomClasses } from '@/lib/rooms-db';
import { markAttendanceSchema } from '@/lib/schemas';

export const POST = withAuth('attendance/mark', 'any', async (req, user) => {
  const { classId } = await parseBody(req, markAttendanceSchema);

  const classSession = await prisma.classSession.findUnique({ where: { id: classId } });
  if (!classSession) throw new HttpError(404, 'Clase no encontrada.');

  // El enlace de la sala y la asistencia solo se habilitan para quien pertenece a la clase.
  if (user.role === 'MENTOR' && classSession.mentorId !== user.id) {
    throw new HttpError(403, 'No tienes acceso a esta clase.');
  }

  let attendance = null;
  let attendedClass: { id: string; title: string } | null = null;

  if (user.role === 'STUDENT') {
    const isEnrolled = async (id: string) =>
      Boolean(
        await prisma.classEnrollment.findUnique({
          where: { classId_studentId: { classId: id, studentId: user.id } },
          select: { id: true },
        }),
      );
    if (!(await isEnrolled(classId))) throw new HttpError(403, 'No estás inscrita en esta clase.');

    // Varias clases seguidas pueden compartir el enlace: la asistencia se cuenta a la que está en curso en la sala,
    // aunque se haya pulsado el botón de otra.
    const nearby = await loadRoomClasses(classSession.dateStart);
    let targetId = resolveTargetClass(classId, nearby, new Date());
    if (targetId !== classId && !(await isEnrolled(targetId))) targetId = classId;

    attendance = await prisma.attendance.upsert({
      where: { classId_studentId: { classId: targetId, studentId: user.id } },
      update: {},
      create: { classId: targetId, studentId: user.id, joinedAt: new Date() },
    });

    const target = nearby.find((c) => c.id === targetId) ?? classSession;
    attendedClass = { id: target.id, title: target.title };
  }

  return NextResponse.json({
    success: true,
    message: 'Asistencia registrada exitosamente al ingresar a la clase.',
    meetLink: classSession.meetLink,
    attendance,
    attendedClass,
  });
});
