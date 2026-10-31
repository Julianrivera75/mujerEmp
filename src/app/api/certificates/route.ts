import { NextResponse } from 'next/server';
import { HttpError, withAuth } from '@/lib/api';
import { loadModuleEligibility } from '@/lib/certificate-eligibility-db';
import { CERTIFICATE_MODULES } from '@/lib/modules';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** Estado de los certificados por módulo de la estudiante con sesión. */
export const GET = withAuth('certificates GET', ['STUDENT'], async (_req, user) => {
  const student = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, memberNumber: true },
  });
  if (!student) throw new HttpError(404, 'Usuario no encontrado.');

  const eligibility = (await loadModuleEligibility([user.id])).get(user.id) ?? [];
  const byNumber = new Map(eligibility.map((m) => [m.number, m]));

  const modules = CERTIFICATE_MODULES.map((module) => {
    const m = byNumber.get(module.number);
    return {
      number: module.number,
      title: module.title,
      issuedOn: module.issuedOn,
      art: module.art,
      status: m?.status ?? 'no-classes',
      percentage: m?.percentage ?? 0,
      /** Días presentes y días con charlas del módulo. */
      attended: m?.attended ?? 0,
      total: m?.total ?? 0,
      opensAt: m?.opensAt ?? null,
      rule: m?.rule ?? { ruleType: 'MIN_ATTENDANCE_PERCENT', threshold: 80 },
    };
  });

  return NextResponse.json({ student: { name: student.name, studentNumber: student.memberNumber }, modules });
});
