import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado. Inicia sesión.' }, { status: 401 });
    }

    const { classId } = await req.json();
    if (!classId) {
      return NextResponse.json({ error: 'ID de clase requerido.' }, { status: 400 });
    }

    const classSession = await prisma.classSession.findUnique({
      where: { id: classId },
    });

    if (!classSession) {
      return NextResponse.json({ error: 'Clase no encontrada.' }, { status: 404 });
    }

    // Si es estudiante, registrar su asistencia
    let attendance = null;
    if (user.role === 'STUDENT') {
      attendance = await prisma.attendance.upsert({
        where: {
          classId_studentId: {
            classId,
            studentId: user.id,
          },
        },
        update: {
          // Si ya existía, dejamos la primera o actualizamos el último acceso
        },
        create: {
          classId,
          studentId: user.id,
          joinedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Asistencia registrada exitosamente al ingresar a la clase.',
      meetLink: classSession.meetLink,
      attendance,
    });
  } catch (error) {
    console.error('Error al registrar asistencia:', error);
    return NextResponse.json({ error: 'Error interno al registrar asistencia.' }, { status: 500 });
  }
}
