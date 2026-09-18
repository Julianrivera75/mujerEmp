import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import type { SessionUser } from '@/lib/user-context';

/**
 * getCurrentUser() sólo trae id/name/email/role/status (ver lib/auth.ts, fuera de alcance).
 * Los layouts necesitan además avatar/documentId/phone/vigencia para Navbar y el certificado,
 * así que las completamos acá sin tocar ese archivo.
 */
export async function getSessionProfile(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const extra = await prisma.user.findUnique({
    where: { id: user.id },
    select: { avatar: true, documentId: true, phone: true, startDate: true, endDate: true },
  });

  return {
    ...user,
    avatar: extra?.avatar ?? null,
    documentId: extra?.documentId ?? null,
    phone: extra?.phone ?? null,
    startDate: extra?.startDate ? extra.startDate.toISOString() : null,
    endDate: extra?.endDate ? extra.endDate.toISOString() : null,
  };
}
