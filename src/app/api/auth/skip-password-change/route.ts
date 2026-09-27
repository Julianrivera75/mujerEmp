import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { setSessionCookie, signToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Pospone el cambio de contraseña por esta sesión (se volverá a pedir en el próximo ingreso). No cambia la
 * contraseña ni la marca de `mustChangePassword`; solo permite continuar usando la plataforma por ahora.
 */
export const POST = withAuth(
  'auth/skip-password-change',
  'any',
  async (_req, user) => {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { tokenVersion: true } });
    if (!dbUser) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });

    await setSessionCookie(await signToken(user, dbUser.tokenVersion, true));
    return NextResponse.json({ success: true });
  },
  { allowPendingPasswordChange: true },
);
