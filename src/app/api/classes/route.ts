import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  CLASS_STATUSES,
  MEET_HOSTS,
  YOUTUBE_HOSTS,
  cleanText,
  isOneOf,
  parseDate,
  parseHttpsUrl,
} from '@/lib/validators';
import { extractYouTubeId } from '@/lib/youtube';
import { logError } from '@/lib/log';

export const dynamic = 'force-dynamic';

type LinkResult = { ok: true; value: string | null } | { ok: false; error: string };

function readMeetLink(value: unknown): LinkResult {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === ''))
    return { ok: true, value: null };
  const url = parseHttpsUrl(value, MEET_HOSTS);
  return url
    ? { ok: true, value: url }
    : { ok: false, error: 'El enlace de Meet debe ser una URL https de meet.google.com.' };
}

function readYoutubeLink(value: unknown): LinkResult {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === ''))
    return { ok: true, value: null };
  const url = parseHttpsUrl(value, YOUTUBE_HOSTS);
  return url && extractYouTubeId(url)
    ? { ok: true, value: url }
    : { ok: false, error: 'El enlace de YouTube no es válido. Usa una URL https de un video de YouTube.' };
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const monthKey = searchParams.get('monthKey'); // e.g. "2026-09"
    const status = searchParams.get('status');

    const where: Prisma.ClassSessionWhereInput = {};
    if (monthKey && monthKey !== 'ALL' && /^\d{4}-\d{2}$/.test(monthKey)) where.monthKey = monthKey;
    if (status && status !== 'ALL' && isOneOf(CLASS_STATUSES, status)) where.status = status;

    if (user.role === 'MENTOR') where.mentorId = user.id;
    if (user.role === 'STUDENT') where.enrollments = { some: { studentId: user.id } };

    // Cada rol recibe solo los datos personales que necesita (minimización de datos).
    const mentorSelect: Prisma.UserSelect =
      user.role === 'ADMIN' ? { id: true, name: true, email: true, phone: true } : { id: true, name: true };
    const studentSelect: Prisma.UserSelect =
      user.role === 'ADMIN'
        ? { id: true, name: true, email: true, documentId: true }
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
    });

    return NextResponse.json({ classes });
  } catch (error) {
    logError('classes GET', error);
    return NextResponse.json({ error: 'Error al consultar clases.' }, { status: 500 });
  }
}

async function resolveStudentIds(ids: unknown): Promise<string[]> {
  if (!Array.isArray(ids)) return [];
  const unique = Array.from(new Set(ids.filter((id): id is string => typeof id === 'string')));
  if (unique.length === 0) return [];
  const found = await prisma.user.findMany({ where: { id: { in: unique }, role: 'STUDENT' }, select: { id: true } });
  return found.map((u) => u.id);
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo administradores pueden programar clases.' },
        { status: 403 },
      );
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

    const cleanTitle = cleanText(title, 200);
    const start = parseDate(dateStart);
    const end = parseDate(dateEnd);
    if (!cleanTitle || !start || !end || typeof mentorId !== 'string' || !mentorId) {
      return NextResponse.json(
        { error: 'Título, fecha inicio, fecha fin y mentor son obligatorios.' },
        { status: 400 },
      );
    }
    if (end <= start) {
      return NextResponse.json({ error: 'La fecha de fin debe ser posterior a la de inicio.' }, { status: 400 });
    }
    if (status !== undefined && !isOneOf(CLASS_STATUSES, status)) {
      return NextResponse.json({ error: 'Estado de clase inválido.' }, { status: 400 });
    }

    const meet = readMeetLink(meetLink);
    if (!meet.ok) return NextResponse.json({ error: meet.error }, { status: 400 });
    const yt = readYoutubeLink(youtubeUrl);
    if (!yt.ok) return NextResponse.json({ error: yt.error }, { status: 400 });

    const mentor = await prisma.user.findUnique({ where: { id: mentorId }, select: { role: true } });
    if (!mentor || (mentor.role !== 'MENTOR' && mentor.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'La mentora seleccionada no es válida.' }, { status: 400 });
    }

    const monthKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    const validStudentIds = await resolveStudentIds(studentIds);

    const newClass = await prisma.classSession.create({
      data: {
        title: cleanTitle,
        description: cleanText(description, 2000),
        dateStart: start,
        dateEnd: end,
        mentorId,
        meetLink: meet.value,
        youtubeUrl: yt.value,
        recordingNotes: cleanText(recordingNotes, 1000),
        status: status || 'PROGRAMADA',
        monthKey,
        enrollments:
          validStudentIds.length > 0 ? { create: validStudentIds.map((studentId) => ({ studentId })) } : undefined,
      },
      include: {
        mentor: { select: { id: true, name: true, email: true } },
        enrollments: { include: { student: { select: { id: true, name: true, email: true } } } },
      },
    });

    return NextResponse.json({ success: true, classSession: newClass });
  } catch (error) {
    logError('classes POST', error);
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

    if (typeof id !== 'string' || !id) {
      return NextResponse.json({ error: 'ID de clase requerido.' }, { status: 400 });
    }

    const existingClass = await prisma.classSession.findUnique({ where: { id } });
    if (!existingClass) {
      return NextResponse.json({ error: 'Clase no encontrada.' }, { status: 404 });
    }

    const meet =
      meetLink === undefined ? ({ ok: true, value: existingClass.meetLink } as LinkResult) : readMeetLink(meetLink);
    if (!meet.ok) return NextResponse.json({ error: meet.error }, { status: 400 });
    const yt =
      youtubeUrl === undefined
        ? ({ ok: true, value: existingClass.youtubeUrl } as LinkResult)
        : readYoutubeLink(youtubeUrl);
    if (!yt.ok) return NextResponse.json({ error: yt.error }, { status: 400 });

    // Una mentora solo puede editar sus propias clases y únicamente los enlaces y las notas de la grabación.
    if (user.role === 'MENTOR') {
      if (existingClass.mentorId !== user.id) {
        return NextResponse.json({ error: 'No tienes permiso para modificar esta clase.' }, { status: 403 });
      }

      const updated = await prisma.classSession.update({
        where: { id },
        data: {
          meetLink: meet.value,
          youtubeUrl: yt.value,
          recordingNotes: recordingNotes !== undefined ? cleanText(recordingNotes, 1000) : existingClass.recordingNotes,
        },
      });

      return NextResponse.json({ success: true, classSession: updated });
    }

    if (status !== undefined && !isOneOf(CLASS_STATUSES, status)) {
      return NextResponse.json({ error: 'Estado de clase inválido.' }, { status: 400 });
    }

    const start = dateStart ? parseDate(dateStart) : existingClass.dateStart;
    const end = dateEnd ? parseDate(dateEnd) : existingClass.dateEnd;
    if (!start || !end || end <= start) {
      return NextResponse.json({ error: 'Las fechas de la clase no son válidas.' }, { status: 400 });
    }
    const monthKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;

    if (mentorId !== undefined && mentorId !== existingClass.mentorId) {
      const mentor =
        typeof mentorId === 'string'
          ? await prisma.user.findUnique({ where: { id: mentorId }, select: { role: true } })
          : null;
      if (!mentor || (mentor.role !== 'MENTOR' && mentor.role !== 'ADMIN')) {
        return NextResponse.json({ error: 'La mentora seleccionada no es válida.' }, { status: 400 });
      }
    }

    if (Array.isArray(studentIds)) {
      const validStudentIds = await resolveStudentIds(studentIds);
      await prisma.classEnrollment.deleteMany({ where: { classId: id } });
      if (validStudentIds.length > 0) {
        await prisma.classEnrollment.createMany({
          data: validStudentIds.map((studentId) => ({ classId: id, studentId })),
        });
      }
    }

    const updated = await prisma.classSession.update({
      where: { id },
      data: {
        title: cleanText(title, 200) ?? existingClass.title,
        description: description !== undefined ? cleanText(description, 2000) : existingClass.description,
        dateStart: start,
        dateEnd: end,
        mentorId: typeof mentorId === 'string' && mentorId ? mentorId : existingClass.mentorId,
        meetLink: meet.value,
        youtubeUrl: yt.value,
        recordingNotes: recordingNotes !== undefined ? cleanText(recordingNotes, 1000) : existingClass.recordingNotes,
        status: status || existingClass.status,
        monthKey,
      },
      include: {
        mentor: { select: { id: true, name: true, email: true } },
        enrollments: { include: { student: { select: { id: true, name: true, email: true } } } },
      },
    });

    return NextResponse.json({ success: true, classSession: updated });
  } catch (error) {
    logError('classes PUT', error);
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
    logError('classes DELETE', error);
    return NextResponse.json({ error: 'Error al eliminar clase.' }, { status: 500 });
  }
}
