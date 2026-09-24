import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { CURRENT_TERMS_VERSION, LEGAL_REVIEW_COMPLETED } from '@/lib/legal';
import type { SessionUser } from '@/lib/user-context';

/**
 * getCurrentUser() sólo trae id/name/email/role/status (ver lib/auth.ts).
 * Los layouts necesitan además avatar/documentId/phone/vigencia para Navbar y el certificado,
 * y los datos de aceptación de términos, así que las completamos acá.
 */
export async function getSessionProfile(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const extra = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      avatar: true,
      documentId: true,
      phone: true,
      startDate: true,
      endDate: true,
      termsVersion: true,
      isMinor: true,
      guardianConsentAt: true,
    },
  });

  return {
    ...user,
    avatar: extra?.avatar ?? null,
    documentId: extra?.documentId ?? null,
    phone: extra?.phone ?? null,
    startDate: extra?.startDate ? extra.startDate.toISOString() : null,
    endDate: extra?.endDate ? extra.endDate.toISOString() : null,
    termsVersion: extra?.termsVersion ?? null,
    isMinor: extra?.isMinor ?? false,
    guardianConsentAt: extra?.guardianConsentAt ? extra.guardianConsentAt.toISOString() : null,
  };
}

/** Bloquea el acceso a la plataforma hasta aceptar la versión vigente de los términos y la política de datos. */
export function requireAcceptedTerms(user: SessionUser) {
  if (!LEGAL_REVIEW_COMPLETED) return;
  if (user.termsVersion !== CURRENT_TERMS_VERSION || (user.isMinor && !user.guardianConsentAt)) {
    redirect('/aceptar-terminos');
  }
}
