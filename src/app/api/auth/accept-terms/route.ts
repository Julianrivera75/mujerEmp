import { NextResponse } from 'next/server';
import { HttpError, parseBody, withAuth } from '@/lib/api';
import { CURRENT_TERMS_VERSION } from '@/lib/legal';
import prisma from '@/lib/prisma';
import { acceptTermsSchema } from '@/lib/schemas';

/** Registra la aceptación de los Términos y la autorización de tratamiento de datos (con fecha y versión). */
export const POST = withAuth('auth/accept-terms', 'any', async (req, user) => {
  const { version } = await parseBody(req, acceptTermsSchema);
  if (version !== CURRENT_TERMS_VERSION) {
    throw new HttpError(409, 'La versión de los términos cambió. Recarga la página e inténtalo de nuevo.');
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isMinor: true, guardianConsentAt: true },
  });
  if (!dbUser) throw new HttpError(404, 'Usuario no encontrado.');
  if (dbUser.isMinor && !dbUser.guardianConsentAt) {
    throw new HttpError(
      403,
      'Tu cuenta requiere la autorización de tu madre, padre o representante legal. Comunícate con la administración.',
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { termsAcceptedAt: new Date(), termsVersion: CURRENT_TERMS_VERSION },
  });

  return NextResponse.json({ success: true });
});
