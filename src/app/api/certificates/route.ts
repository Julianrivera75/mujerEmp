import { NextResponse } from 'next/server';
import { HttpError, withAuth } from '@/lib/api';
import { CERTIFICATE_MODULES, attendancePercentage, certificateOpensAt, moduleStatus } from '@/lib/modules';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** Estado de los certificados por módulo de la estudiante con sesión. */
export const GET = withAuth('certificates GET', ['STUDENT'], async (_req, user) => {
  const student = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, studentNumber: true },
  });
  if (!student) throw new HttpError(404, 'Usuario no encontrado.');

  const monthKeys = CERTIFICATE_MODULES.map((m) => m.monthKey);
  const [enrollments, attendances] = await Promise.all([
    prisma.classEnrollment.findMany({
      where: { studentId: user.id, classSession: { monthKey: { in: monthKeys } } },
      select: { classSession: { select: { monthKey: true } } },
    }),
    prisma.attendance.findMany({
      where: { studentId: user.id, classSession: { monthKey: { in: monthKeys } } },
      select: { classSession: { select: { monthKey: true } } },
    }),
  ]);

  const countBy = (rows: { classSession: { monthKey: string } }[], monthKey: string) =>
    rows.filter((r) => r.classSession.monthKey === monthKey).length;

  const now = new Date();
  const modules = CERTIFICATE_MODULES.map((module) => {
    const total = countBy(enrollments, module.monthKey);
    const attended = Math.min(countBy(attendances, module.monthKey), total);
    return {
      number: module.number,
      title: module.title,
      issuedOn: module.issuedOn,
      art: module.art,
      status: moduleStatus(module.monthKey, now, attended, total),
      percentage: attendancePercentage(attended, total),
      attended,
      total,
      opensAt: certificateOpensAt(module.monthKey).toISOString(),
    };
  });

  return NextResponse.json({ student, modules });
});
