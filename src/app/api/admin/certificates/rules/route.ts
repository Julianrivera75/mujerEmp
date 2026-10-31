import { NextResponse } from 'next/server';
import { parseBody, withAuth } from '@/lib/api';
import { getCertificateRules } from '@/lib/certificate-eligibility-db';
import { CERTIFICATE_MODULES } from '@/lib/modules';
import prisma from '@/lib/prisma';
import { certificateRuleSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

export const GET = withAuth('admin/certificates/rules GET', ['ADMIN'], async () => {
  const rules = await getCertificateRules();
  return NextResponse.json({
    rules: CERTIFICATE_MODULES.map((m) => ({ moduleNumber: m.number, title: m.title, ...rules.get(m.number) })),
  });
});

/** Cambia el tipo de regla y el umbral de un módulo. Afecta a todas las estudiantes de inmediato. */
export const PUT = withAuth('admin/certificates/rules PUT', ['ADMIN'], async (req) => {
  const { moduleNumber, ruleType, threshold } = await parseBody(req, certificateRuleSchema);

  const rule = await prisma.certificateModuleRule.upsert({
    where: { moduleNumber },
    create: { moduleNumber, ruleType, threshold },
    update: { ruleType, threshold },
  });

  return NextResponse.json({ success: true, rule });
});
