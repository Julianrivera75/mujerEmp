import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MENTOR')) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const studentId = searchParams.get('studentId');

    const where: any = {};
    if (classId) where.classId = classId;
    if (studentId) where.studentId = studentId;

    if (user.role === 'MENTOR') {
      where.classSession = { mentorId: user.id };
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

    // Resumen por estudiante
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        attendances: {
          select: { classId: true, joinedAt: true },
        },
        enrolledClasses: {
          select: { classId: true },
        },
      },
    });

    const studentSummary = students.map((s) => {
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

    return NextResponse.json({ attendances, studentSummary });
  } catch (error) {
    console.error('Error al obtener asistencias:', error);
    return NextResponse.json({ error: 'Error al consultar asistencias.' }, { status: 500 });
  }
}
