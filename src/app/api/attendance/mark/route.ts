import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logError } from '@/lib/log';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado. Inicia sesión.' }, { status: 401 });
    }

    const { classId } = await req.json();
    if (typeof classId !== 'string' || !classId) {
      return NextResponse.json({ error: 'ID de clase requerido.' }, { status: 400 });
    }

    const classSession = await prisma.classSession.findUnique({ where: { id: classId } });
    if (!classSession) {
      return NextResponse.json({ error: 'Clase no encontrada.' }, { status: 404 });
    }

    // El enlace de la sala y la asistencia solo se habilitan para quien pertenece a la clase.
    if (user.role === 'MENTOR' && classSession.mentorId !== user.id) {
      return NextResponse.json({ error: 'No tienes acceso a esta clase.' }, { status: 403 });
    }

    let attendance = null;
    if (user.role === 'STUDENT') {
      const enrollment = await prisma.classEnrollment.findUnique({
        where: { classId_studentId: { classId, studentId: user.id } },
        select: { id: true },
      });
      if (!enrollment) {
        return NextResponse.json({ error: 'No estás inscrita en esta clase.' }, { status: 403 });
      }

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
  } catch (error) {
    logError('attendance/mark', error);
    return NextResponse.json({ error: 'Error interno al registrar asistencia.' }, { status: 500 });
  }
}
