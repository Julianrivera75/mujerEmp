import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { HttpError, MAX_ROWS, parseBody, withAuth } from '@/lib/api';
import prisma from '@/lib/prisma';
import { isTestAccountEmail } from '@/lib/account-types';
import { loadDaySummaries, loadModuleDayRange } from '@/lib/attendance-days-db';
import { summarizeByMonth } from '@/lib/attendance-days';
import { CERTIFICATE_MODULES } from '@/lib/modules';
import { syncCertificatesAvailable } from '@/lib/notifications';
import { adminMarkAttendanceSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

export const GET = withAuth('admin/attendances', 'any', async (req, user) => {
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get('classId');
  const studentIdParam = searchParams.get('studentId');
  const moduleNumber = Number(searchParams.get('moduleNumber')) || null;
  const includeTest = searchParams.get('includeTest') === 'true';

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
      student: { select: { id: true, name: true, email: true, memberNumber: true } },
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

  // Asistencia por día: una estudiante está presente un día si entró al menos a una de sus charlas. La administración ve
  // el resumen de todas, la mentora solo el de sus clases y la estudiante no lo recibe. "Todos los módulos" (sin
  // moduleNumber) es el acumulado global; con moduleNumber se usa la misma base (summarizeByMonth) que certificados,
  // para que los dos paneles nunca puedan divergir.
  type StudentSummaryRow = {
    id: string;
    name: string;
    email: string;
    status: string;
    totalDays: number;
    attendedDays: number;
    percentage: number;
  };
  let studentSummary: StudentSummaryRow[] = [];
  let inactiveStudentSummary: StudentSummaryRow[] = [];
  let days: {
    studentId: string;
    name: string;
    email: string;
    memberNumber: string | null;
    day: string;
    firstJoinedAt: string | null;
    classesAttended: number;
    classesInDay: number;
    classTitles: string[];
  }[] = [];
  let moduleInfo: {
    number: number;
    title: string;
    monthKey: string;
    totalDays: number;
    firstDay: string | null;
    lastDay: string | null;
  } | null = null;

  if (user.role === 'ADMIN' || user.role === 'MENTOR') {
    const ownClasses = user.role === 'MENTOR' ? { classSession: { mentorId: user.id } } : undefined;
    const now = new Date();
    const certModule = moduleNumber ? CERTIFICATE_MODULES.find((m) => m.number === moduleNumber) : undefined;

    const allStudents = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        ...(ownClasses ? { enrolledClasses: { some: ownClasses } } : {}),
      },
      select: { id: true, name: true, email: true, memberNumber: true, status: true },
      take: MAX_ROWS,
    });
    // Las cuentas de prueba (@empoderas.org) no cuentan en el panel ni en los porcentajes, salvo que se pidan.
    const students = includeTest ? allStudents : allStudents.filter((s) => !isTestAccountEmail(s.email));

    const summaries = await loadDaySummaries(
      students.map((s) => s.id),
      { mentorId: user.role === 'MENTOR' ? user.id : undefined, now },
    );

    const rowFor = (s: (typeof students)[number]): StudentSummaryRow => {
      if (certModule) {
        const month = summarizeByMonth(summaries.get(s.id)?.days ?? []).get(certModule.monthKey);
        return {
          id: s.id,
          name: s.name,
          email: s.email,
          status: s.status,
          totalDays: month?.totalDays ?? 0,
          attendedDays: month?.attendedDays ?? 0,
          percentage: month?.percentage ?? 0,
        };
      }
      const summary = summaries.get(s.id);
      return {
        id: s.id,
        name: s.name,
        email: s.email,
        status: s.status,
        totalDays: summary?.totalDays ?? 0,
        attendedDays: summary?.attendedDays ?? 0,
        percentage: summary?.percentage ?? 0,
      };
    };

    studentSummary = students.filter((s) => s.status === 'ACTIVO').map(rowFor);
    inactiveStudentSummary = students.filter((s) => s.status !== 'ACTIVO').map(rowFor);

    if (certModule) {
      const range = await loadModuleDayRange(certModule.monthKey, now);
      moduleInfo = { number: certModule.number, title: certModule.title, monthKey: certModule.monthKey, ...range };
    }

    days = students
      .flatMap((s) =>
        (summaries.get(s.id)?.days ?? [])
          .filter((d) => d.present && (!certModule || d.day.startsWith(certModule.monthKey)))
          .map((d) => ({
            studentId: s.id,
            name: s.name,
            email: s.email,
            memberNumber: s.memberNumber,
            day: d.day,
            firstJoinedAt: d.firstJoinedAt,
            classesAttended: d.classesAttended,
            classesInDay: d.classesInDay,
            classTitles: d.classTitles,
          })),
      )
      .sort((x, y) => y.day.localeCompare(x.day) || x.name.localeCompare(y.name));
  }

  return NextResponse.json({ attendances, studentSummary, inactiveStudentSummary, days, module: moduleInfo });
});

/** Marca a una estudiante como presente en una clase a mano (p. ej. tuvo problemas técnicos para ingresar). */
export const POST = withAuth('admin/attendances POST', ['ADMIN'], async (req) => {
  const { classId, studentId } = await parseBody(req, adminMarkAttendanceSchema);

  const enrollment = await prisma.classEnrollment.findUnique({
    where: { classId_studentId: { classId, studentId } },
    select: { id: true },
  });
  if (!enrollment) throw new HttpError(400, 'La estudiante no está inscrita en esa clase.');

  const attendance = await prisma.attendance.upsert({
    where: { classId_studentId: { classId, studentId } },
    update: {},
    create: { classId, studentId, joinedAt: new Date(), source: 'CARRY' },
  });

  // Avisa de inmediato si esto volvió disponible algún certificado, sin esperar al heartbeat.
  await syncCertificatesAvailable(studentId, new Date(), true);

  return NextResponse.json({ success: true, attendance });
});
