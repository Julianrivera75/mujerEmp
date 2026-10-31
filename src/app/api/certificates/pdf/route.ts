import { withAuth } from '@/lib/api';
import { issueCertificatePdf } from '@/lib/certificate-issue';

export const dynamic = 'force-dynamic';

/** Descarga el certificado en PDF de un módulo de la estudiante con sesión, si ya es elegible. */
export const GET = withAuth('certificates/pdf GET', ['STUDENT'], async (req, user) => {
  const moduleNumber = Number(new URL(req.url).searchParams.get('moduleNumber'));
  const pdfBytes = await issueCertificatePdf(
    user.id,
    moduleNumber,
    'Todavía no puedes descargar el certificado de este módulo.',
  );

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="certificado-modulo-${moduleNumber}.pdf"`,
    },
  });
});
