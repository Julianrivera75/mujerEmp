import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { HttpError, MAX_ROWS, parseBody, withAuth } from '@/lib/api';
import prisma from '@/lib/prisma';
import { createAssignmentSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

export const GET = withAuth('assignments GET', 'any', async (req, user) => {
  const classId = new URL(req.url).searchParams.get('classId');

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
    take: MAX_ROWS,
  });

  return NextResponse.json({ assignments });
});

export const POST = withAuth('assignments POST', ['MENTOR', 'ADMIN'], async (req, user) => {
  const { classId, title, description, dueDate } = await parseBody(req, createAssignmentSchema);

  const classSession = await prisma.classSession.findUnique({ where: { id: classId }, select: { mentorId: true } });
  if (!classSession) throw new HttpError(404, 'Clase no encontrada.');
  if (user.role === 'MENTOR' && classSession.mentorId !== user.id) {
    throw new HttpError(403, 'No puedes crear tareas en clases que no dictas.');
  }

  const assignment = await prisma.assignment.create({
    data: { classId, creatorId: user.id, title, description, dueDate },
    include: { classSession: { select: { id: true, title: true } } },
  });

  return NextResponse.json({ success: true, assignment });
});
