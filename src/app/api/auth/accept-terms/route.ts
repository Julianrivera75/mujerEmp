import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { CURRENT_TERMS_VERSION } from '@/lib/legal';
import { logError } from '@/lib/log';

/** Registra la aceptación de los Términos y la autorización de tratamiento de datos (con fecha y versión). */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { version } = await req.json();
    if (version !== CURRENT_TERMS_VERSION) {
      return NextResponse.json(
        { error: 'La versión de los términos cambió. Recarga la página e inténtalo de nuevo.' },
        { status: 409 },
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isMinor: true, guardianConsentAt: true },
    });
    if (!dbUser) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }
    if (dbUser.isMinor && !dbUser.guardianConsentAt) {
      return NextResponse.json(
        {
          error:
            'Tu cuenta requiere la autorización de tu madre, padre o representante legal. Comunícate con la administración.',
        },
        { status: 403 },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { termsAcceptedAt: new Date(), termsVersion: CURRENT_TERMS_VERSION },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('auth/accept-terms', error);
    return NextResponse.json({ error: 'No se pudo registrar la aceptación.' }, { status: 500 });
  }
}
