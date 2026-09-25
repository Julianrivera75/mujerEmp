import { NextResponse } from 'next/server';
import { HttpError, parseBody, withAuth } from '@/lib/api';
import prisma from '@/lib/prisma';
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
  if (user.role === 'STUDENT') {
    const enrollment = await prisma.classEnrollment.findUnique({
      where: { classId_studentId: { classId, studentId: user.id } },
      select: { id: true },
    });
    if (!enrollment) throw new HttpError(403, 'No estás inscrita en esta clase.');

    attendance = await prisma.attendance.upsert({
      where: { classId_studentId: { classId, studentId: user.id } },
      update: {},
      create: { classId, studentId: user.id, joinedAt: new Date() },
    });
  }

  return NextResponse.json({
    success: true,
    message: 'Asistencia registrada exitosamente al ingresar a la clase.',
    meetLink: classSession.meetLink,
    attendance,
  });
});
