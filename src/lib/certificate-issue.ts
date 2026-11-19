import { HttpError } from './api';
import { generateCertificatePdf } from './certificate-pdf';
import { loadModuleEligibility } from './certificate-eligibility-db';
import { getOrCreateIssuance } from './certificate-verification';
import { CERTIFICATE_MODULES } from './modules';
import prisma from './prisma';

/**
 * Revalida la elegibilidad en el servidor y genera el PDF del certificado. Usado tanto por la
 * descarga de la estudiante (siempre revalida) como por la de soporte de admin, que puede pasar
 * `bypassEligibility: true` para descargar sin ninguna condición, sin importar qué.
 */
export async function issueCertificatePdf(
  studentId: string,
  moduleNumber: number,
  options: { notEligibleMessage?: string; bypassEligibility?: boolean } = {},
): Promise<Uint8Array> {
  const { notEligibleMessage = 'Esta estudiante todavía no es elegible para este módulo.', bypassEligibility = false } =
    options;

  const module = CERTIFICATE_MODULES.find((m) => m.number === moduleNumber);
  if (!module) throw new HttpError(400, 'Módulo inválido.');

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { name: true, memberNumber: true },
  });
  if (!student) throw new HttpError(404, 'Estudiante no encontrada.');

  if (!bypassEligibility) {
    const eligibility = (await loadModuleEligibility([studentId])).get(studentId) ?? [];
    const status = eligibility.find((m) => m.number === moduleNumber)?.status;
    if (status !== 'available') throw new HttpError(403, notEligibleMessage);
  }

  const studentName = student.name;
  const studentNumber = student.memberNumber ?? '';
  const issuance = await getOrCreateIssuance(studentId, moduleNumber, studentName, studentNumber);

  return generateCertificatePdf({
    module,
    studentName,
    studentNumber,
    verificationCode: issuance.verificationCode,
    issuedAt: issuance.issuedAt,
  });
}
