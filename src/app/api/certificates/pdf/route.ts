import { HttpError, withAuth } from '@/lib/api';
import { generateCertificatePdf } from '@/lib/certificate-pdf';
import { loadModuleEligibility } from '@/lib/certificate-eligibility-db';
import { getOrCreateIssuance } from '@/lib/certificate-verification';
import { CERTIFICATE_MODULES } from '@/lib/modules';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** Descarga el certificado en PDF de un módulo de la estudiante con sesión, si ya es elegible. */
export const GET = withAuth('certificates/pdf GET', ['STUDENT'], async (req, user) => {
  const moduleNumber = Number(new URL(req.url).searchParams.get('moduleNumber'));
  const module = CERTIFICATE_MODULES.find((m) => m.number === moduleNumber);
  if (!module) throw new HttpError(400, 'Módulo inválido.');

  const student = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, memberNumber: true },
  });
  if (!student) throw new HttpError(404, 'Usuario no encontrado.');

  // Vuelve a validar la elegibilidad en el servidor: nunca confiar en lo que mostró la interfaz.
  const eligibility = (await loadModuleEligibility([user.id])).get(user.id) ?? [];
  const status = eligibility.find((m) => m.number === moduleNumber)?.status;
  if (status !== 'available') throw new HttpError(403, 'Todavía no puedes descargar el certificado de este módulo.');

  const studentName = student.name;
  const studentNumber = student.memberNumber ?? '';
  const issuance = await getOrCreateIssuance(user.id, moduleNumber, studentName, studentNumber);

  const pdfBytes = await generateCertificatePdf({
    module,
    studentName,
    studentNumber,
    verificationCode: issuance.verificationCode,
    issuedAt: issuance.issuedAt,
  });

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="certificado-modulo-${moduleNumber}.pdf"`,
    },
  });
});
