import { NextResponse } from 'next/server';
import { HttpError, withAuth } from '@/lib/api';
import { CERTIFICATE_MODULES, attendancePercentage, certificateOpensAt, moduleStatus } from '@/lib/modules';
import prisma from '@/lib/prisma';
import { loadDaySummaries } from '@/lib/attendance-days-db';
import { summarizeByMonth } from '@/lib/attendance-days';

export const dynamic = 'force-dynamic';

/** Estado de los certificados por módulo de la estudiante con sesión. */
export const GET = withAuth('certificates GET', ['STUDENT'], async (_req, user) => {
  const student = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, memberNumber: true },
  });
  if (!student) throw new HttpError(404, 'Usuario no encontrado.');

  // Cada módulo se mide en días: presente el día si entró al menos a una charla, sobre los días con charlas del mes.
  const summary = (await loadDaySummaries([user.id])).get(user.id);
  const months = summarizeByMonth(summary?.days ?? []);

  const now = new Date();
  const modules = CERTIFICATE_MODULES.map((module) => {
    const month = months.get(module.monthKey);
    const total = month?.totalDays ?? 0;
    const attended = month?.attendedDays ?? 0;
    return {
      number: module.number,
      title: module.title,
      issuedOn: module.issuedOn,
      art: module.art,
      status: moduleStatus(module.monthKey, now, attended, total),
      percentage: attendancePercentage(attended, total),
      /** Días presentes y días con charlas del módulo. */
      attended,
      total,
      opensAt: certificateOpensAt(module.monthKey).toISOString(),
    };
  });

  return NextResponse.json({ student: { name: student.name, studentNumber: student.memberNumber }, modules });
});
