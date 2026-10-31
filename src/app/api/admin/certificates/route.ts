import { NextResponse } from 'next/server';
import { isTestAccountEmail } from '@/lib/account-types';
import { MAX_ROWS, withAuth } from '@/lib/api';
import { loadModuleEligibility } from '@/lib/certificate-eligibility-db';
import { CERTIFICATE_MODULES, type ModuleStatus } from '@/lib/modules';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** Elegibilidad del certificado de cada módulo de cada estudiante, para la tabla de administración. */
export const GET = withAuth('admin/certificates GET', ['ADMIN'], async (req) => {
  const { searchParams } = new URL(req.url);
  const moduleFilter = Number(searchParams.get('moduleNumber')) || null;
  const statusFilter = searchParams.get('status') as ModuleStatus | null;
  const includeTest = searchParams.get('includeTest') === 'true';

  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: { id: true, name: true, email: true, memberNumber: true, status: true },
    orderBy: { name: 'asc' },
    take: MAX_ROWS,
  });

  const eligibility = await loadModuleEligibility(students.map((s) => s.id));

  const rows = students.flatMap((student) => {
    const isTestAccount = isTestAccountEmail(student.email);
    if (isTestAccount && !includeTest) return [];
    return (eligibility.get(student.id) ?? [])
      .filter((m) => !moduleFilter || m.number === moduleFilter)
      .filter((m) => !statusFilter || m.status === statusFilter)
      .map((m) => ({
        studentId: student.id,
        name: student.name,
        email: student.email,
        memberNumber: student.memberNumber,
        accountStatus: student.status,
        isTestAccount,
        moduleNumber: m.number,
        moduleTitle: m.title,
        status: m.status,
        percentage: m.percentage,
        attended: m.attended,
        total: m.total,
        ruleType: m.rule.ruleType,
        threshold: m.rule.threshold,
      }));
  });

  const modules = CERTIFICATE_MODULES.map((m) => ({ number: m.number, title: m.title }));

  return NextResponse.json({ modules, rows });
});
