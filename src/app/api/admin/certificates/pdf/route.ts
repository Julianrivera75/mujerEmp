import { HttpError, withAuth } from '@/lib/api';
import { issueCertificatePdf } from '@/lib/certificate-issue';

export const dynamic = 'force-dynamic';

/** Descarga de soporte: la administración puede ver el certificado de cualquier estudiante. */
export const GET = withAuth('admin/certificates/pdf GET', ['ADMIN'], async (req) => {
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get('studentId');
  const moduleNumber = Number(searchParams.get('moduleNumber'));
  if (!studentId) throw new HttpError(400, 'Falta el identificador de la estudiante.');

  const pdfBytes = await issueCertificatePdf(studentId, moduleNumber);

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="certificado-modulo-${moduleNumber}.pdf"`,
    },
  });
});
