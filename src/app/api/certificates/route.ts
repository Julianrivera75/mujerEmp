import { NextResponse } from 'next/server';
import { HttpError, withAuth } from '@/lib/api';
import { loadModuleEligibility } from '@/lib/certificate-eligibility-db';
import { CERTIFICATE_MODULES } from '@/lib/modules';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Estado de los certificados por módulo de la estudiante con sesión. No incluye porcentaje, días
 * asistidos/totales ni el umbral de la regla: la estudiante no debe ver su propia asistencia, solo si
 * el certificado está disponible y, si no, un mensaje neutro (ver estudiante/certificado/page.tsx).
 */
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
      monthKey: module.monthKey,
      title: module.title,
      issuedOn: module.issuedOn,
      art: module.art,
      status: m?.status ?? 'no-classes',
      opensAt: m?.opensAt ?? null,
    };
  });

  return NextResponse.json({ student: { name: student.name, studentNumber: student.memberNumber }, modules });
});
