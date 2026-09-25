import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { MAX_ROWS, withAuth } from '@/lib/api';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const GET = withAuth('admin/attendances', 'any', async (req, user) => {
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get('classId');
  const studentIdParam = searchParams.get('studentId');

  const where: Prisma.AttendanceWhereInput = {};
  if (classId) where.classId = classId;

  if (user.role === 'STUDENT') {
    // Una estudiante solo puede ver su propia asistencia.
    where.studentId = user.id;
  } else {
    // Una mentora solo ve la asistencia de sus propias clases; la administradora ve todo.
    if (user.role === 'MENTOR') where.classSession = { mentorId: user.id };
    if (studentIdParam) where.studentId = studentIdParam;
  }

  const attendances = await prisma.attendance.findMany({
    where,
    include: {
      student: { select: { id: true, name: true, email: true, documentId: true } },
      classSession: {
        select: {
          id: true,
          title: true,
          dateStart: true,
          meetLink: true,
          mentor: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
    take: MAX_ROWS,
  });

  // Resumen por estudiante: la administradora ve el de todas, la mentora solo el de sus clases y la estudiante no lo recibe.
  let studentSummary: {
    id: string;
    name: string;
    email: string;
    status: string;
    totalEnrolled: number;
    totalAttended: number;
    percentage: number;
  }[] = [];

  if (user.role === 'ADMIN' || user.role === 'MENTOR') {
    const ownClasses = user.role === 'MENTOR' ? { classSession: { mentorId: user.id } } : undefined;

    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        ...(ownClasses ? { enrolledClasses: { some: ownClasses } } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        attendances: { where: ownClasses, select: { classId: true, joinedAt: true } },
        enrolledClasses: { where: ownClasses, select: { classId: true } },
      },
      take: MAX_ROWS,
    });

    studentSummary = students.map((s) => {
      const totalEnrolled = s.enrolledClasses.length;
      const totalAttended = s.attendances.length;
      return {
        id: s.id,
        name: s.name,
        email: s.email,
        status: s.status,
        totalEnrolled,
        totalAttended,
        percentage: totalEnrolled > 0 ? Math.round((totalAttended / totalEnrolled) * 100) : 0,
      };
    });
  }

  return NextResponse.json({ attendances, studentSummary });
});
