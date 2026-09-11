import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const monthKey = searchParams.get('monthKey'); // e.g. "2026-09"
    const status = searchParams.get('status');

    const where: any = {};
    if (monthKey && monthKey !== 'ALL') {
      where.monthKey = monthKey;
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }

    // Si es mentor, ver solo sus clases
    if (user.role === 'MENTOR') {
      where.mentorId = user.id;
    }

    // Si es estudiante, ver clases donde está inscrito
    if (user.role === 'STUDENT') {
      where.enrollments = {
        some: { studentId: user.id },
      };
    }

    const classes = await prisma.classSession.findMany({
      where,
      include: {
        mentor: {
          select: { id: true, name: true, email: true, phone: true },
        },
        enrollments: {
          include: {
            student: {
              select: { id: true, name: true, email: true, documentId: true },
            },
          },
        },
        attendances: {
          include: {
            student: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        assignments: {
          select: { id: true, title: true, dueDate: true },
        },
        resources: true,
      },
      orderBy: { dateStart: 'asc' },
    });

    return NextResponse.json({ classes });
  } catch (error) {
    console.error('Error al obtener clases:', error);
    return NextResponse.json({ error: 'Error al consultar clases.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado. Solo administradores pueden programar clases.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      description,
      dateStart,
      dateEnd,
      mentorId,
      studentIds,
      meetLink,
      youtubeUrl,
      recordingNotes,
      status,
    } = body;

    if (!title || !dateStart || !dateEnd || !mentorId) {
      return NextResponse.json({ error: 'Título, fecha inicio, fecha fin y mentor son obligatorios.' }, { status: 400 });
    }

    const startDate = new Date(dateStart);
    const monthKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;

    const newClass = await prisma.classSession.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        dateStart: startDate,
        dateEnd: new Date(dateEnd),
        mentorId,
        meetLink: meetLink?.trim() || null,
        youtubeUrl: youtubeUrl?.trim() || null,
        recordingNotes: recordingNotes?.trim() || null,
        status: status || 'PROGRAMADA',
        monthKey,
        enrollments: studentIds && studentIds.length > 0
          ? {
              create: studentIds.map((sId: string) => ({ studentId: sId })),
            }
          : undefined,
      },
      include: {
        mentor: true,
        enrollments: { include: { student: true } },
      },
    });

    return NextResponse.json({ success: true, classSession: newClass });
  } catch (error) {
    console.error('Error al programar clase:', error);
    return NextResponse.json({ error: 'Error al guardar la clase.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MENTOR')) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      id,
      title,
      description,
      dateStart,
      dateEnd,
      mentorId,
      studentIds,
      meetLink,
      youtubeUrl,
      recordingNotes,
      status,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de clase requerido.' }, { status: 400 });
    }

    const existingClass = await prisma.classSession.findUnique({ where: { id } });
    if (!existingClass) {
      return NextResponse.json({ error: 'Clase no encontrada.' }, { status: 404 });
    }

    // Si es mentor, solo puede editar sus clases y solo el meetLink o youtubeUrl o recordingNotes
    if (user.role === 'MENTOR') {
      if (existingClass.mentorId !== user.id) {
        return NextResponse.json({ error: 'No tienes permiso para modificar esta clase.' }, { status: 403 });
      }

      const updated = await prisma.classSession.update({
        where: { id },
        data: {
          meetLink: meetLink !== undefined ? meetLink?.trim() || null : existingClass.meetLink,
          youtubeUrl: youtubeUrl !== undefined ? youtubeUrl?.trim() || null : existingClass.youtubeUrl,
          recordingNotes: recordingNotes !== undefined ? recordingNotes?.trim() || null : existingClass.recordingNotes,
        },
      });

      return NextResponse.json({ success: true, classSession: updated });
    }

    // Administrador puede editar todo
    const startDate = dateStart ? new Date(dateStart) : existingClass.dateStart;
    const monthKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;

    // Actualizar inscripciones si studentIds fue proporcionado
    if (studentIds && Array.isArray(studentIds)) {
      await prisma.classEnrollment.deleteMany({ where: { classId: id } });
      await prisma.classEnrollment.createMany({
        data: studentIds.map((sId: string) => ({ classId: id, studentId: sId })),
      });
    }

    const updated = await prisma.classSession.update({
      where: { id },
      data: {
        title: title ? title.trim() : existingClass.title,
        description: description !== undefined ? description?.trim() || null : existingClass.description,
        dateStart: startDate,
        dateEnd: dateEnd ? new Date(dateEnd) : existingClass.dateEnd,
        mentorId: mentorId || existingClass.mentorId,
        meetLink: meetLink !== undefined ? meetLink?.trim() || null : existingClass.meetLink,
        youtubeUrl: youtubeUrl !== undefined ? youtubeUrl?.trim() || null : existingClass.youtubeUrl,
        recordingNotes: recordingNotes !== undefined ? recordingNotes?.trim() || null : existingClass.recordingNotes,
        status: status || existingClass.status,
        monthKey,
      },
      include: {
        mentor: true,
        enrollments: { include: { student: true } },
      },
    });

    return NextResponse.json({ success: true, classSession: updated });
  } catch (error) {
    console.error('Error al actualizar clase:', error);
    return NextResponse.json({ error: 'Error al actualizar clase.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de clase requerido.' }, { status: 400 });
    }

    await prisma.classSession.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Clase eliminada con éxito.' });
  } catch (error) {
    console.error('Error al eliminar clase:', error);
    return NextResponse.json({ error: 'Error al eliminar clase.' }, { status: 500 });
  }
}
