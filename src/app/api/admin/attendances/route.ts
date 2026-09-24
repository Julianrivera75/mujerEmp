import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logError } from '@/lib/log';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const studentIdParam = searchParams.get('studentId');

    const where: Prisma.AttendanceWhereInput = {};
    if (classId) where.classId = classId;

    if (user.role === 'STUDENT') {
      // Una estudiante solo puede ver su propia asistencia.
      where.studentId = user.id;
    } else if (user.role === 'MENTOR') {
      // Una mentora solo ve asistencia de sus propias clases.
      where.classSession = { mentorId: user.id };
      if (studentIdParam) where.studentId = studentIdParam;
    } else if (user.role === 'ADMIN') {
      if (studentIdParam) where.studentId = studentIdParam;
    } else {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        student: {
          select: { id: true, name: true, email: true, documentId: true },
        },
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
    });

    // Resumen por estudiante: solo ADMIN ve el de todas; MENTOR ve solo las de sus clases; STUDENT no recibe este bloque.
    let studentSummary: Array<{
      id: string;
      name: string;
      email: string;
      status: string;
      totalEnrolled: number;
      totalAttended: number;
      percentage: number;
    }> = [];

    if (user.role === 'ADMIN' || user.role === 'MENTOR') {
      const studentWhere =
        user.role === 'MENTOR'
          ? { role: 'STUDENT' as const, enrolledClasses: { some: { classSession: { mentorId: user.id } } } }
          : { role: 'STUDENT' as const };

      const students = await prisma.user.findMany({
        where: studentWhere,
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          attendances:
            user.role === 'MENTOR'
              ? { where: { classSession: { mentorId: user.id } }, select: { classId: true, joinedAt: true } }
              : { select: { classId: true, joinedAt: true } },
          enrolledClasses:
            user.role === 'MENTOR'
              ? { where: { classSession: { mentorId: user.id } }, select: { classId: true } }
              : { select: { classId: true } },
        },
      });

      studentSummary = students.map((s) => {
        const totalEnrolled = s.enrolledClasses.length;
        const totalAttended = s.attendances.length;
        const percentage = totalEnrolled > 0 ? Math.round((totalAttended / totalEnrolled) * 100) : 0;
        return {
          id: s.id,
          name: s.name,
          email: s.email,
          status: s.status,
          totalEnrolled,
          totalAttended,
          percentage,
        };
      });
    }

    return NextResponse.json({ attendances, studentSummary });
  } catch (error) {
    logError('admin/attendances', error);
    return NextResponse.json({ error: 'Error al consultar asistencias.' }, { status: 500 });
  }
}
