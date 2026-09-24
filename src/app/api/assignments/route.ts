import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { cleanText, parseDate } from '@/lib/validators';
import { logError } from '@/lib/log';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');

    const where: Prisma.AssignmentWhereInput = {};
    if (classId) where.classId = classId;

    // Cada rol ve únicamente las tareas de sus propias clases.
    if (user.role === 'MENTOR') {
      where.classSession = { mentorId: user.id };
    } else if (user.role === 'STUDENT') {
      where.classSession = { enrollments: { some: { studentId: user.id } } };
    }

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        classSession: { select: { id: true, title: true, dateStart: true } },
        creator: { select: { id: true, name: true } },
        submissions: {
          where: user.role === 'STUDENT' ? { studentId: user.id } : undefined,
          include: { student: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    logError('assignments GET', error);
    return NextResponse.json({ error: 'Error al consultar tareas.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'MENTOR' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Solo mentores o administradores pueden crear tareas.' }, { status: 403 });
    }

    const body = await req.json();
    const { classId, title, description, dueDate } = body;

    const cleanTitle = cleanText(title, 200);
    const cleanDescription = cleanText(description, 4000);
    const due = parseDate(dueDate);
    if (typeof classId !== 'string' || !classId || !cleanTitle || !cleanDescription || !due) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios y deben ser válidos.' }, { status: 400 });
    }

    const classSession = await prisma.classSession.findUnique({ where: { id: classId }, select: { mentorId: true } });
    if (!classSession) {
      return NextResponse.json({ error: 'Clase no encontrada.' }, { status: 404 });
    }
    if (user.role === 'MENTOR' && classSession.mentorId !== user.id) {
      return NextResponse.json({ error: 'No puedes crear tareas en clases que no dictas.' }, { status: 403 });
    }

    const assignment = await prisma.assignment.create({
      data: { classId, creatorId: user.id, title: cleanTitle, description: cleanDescription, dueDate: due },
      include: { classSession: { select: { id: true, title: true } } },
    });

    return NextResponse.json({ success: true, assignment });
  } catch (error) {
    logError('assignments POST', error);
    return NextResponse.json({ error: 'Error al crear tarea.' }, { status: 500 });
  }
}
