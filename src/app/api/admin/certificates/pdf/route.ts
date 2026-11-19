import { HttpError, withAuth } from '@/lib/api';
import { issueCertificatePdf } from '@/lib/certificate-issue';

export const dynamic = 'force-dynamic';

/**
 * Descarga de soporte: la administración puede descargar el certificado de cualquier estudiante,
 * para cualquier módulo, sin ninguna condición (ni asistencia, ni fecha, ni si el mes del módulo
 * ya pasó o ni siquiera ha llegado).
 */
export const GET = withAuth('admin/certificates/pdf GET', ['ADMIN'], async (req) => {
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get('studentId');
  const moduleNumber = Number(searchParams.get('moduleNumber'));
  if (!studentId) throw new HttpError(400, 'Falta el identificador de la estudiante.');

  const pdfBytes = await issueCertificatePdf(studentId, moduleNumber, { bypassEligibility: true });

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="certificado-modulo-${moduleNumber}.pdf"`,
    },
  });
});
