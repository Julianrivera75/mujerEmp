import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { parseBody, withAuth } from '@/lib/api';
import { initialPassword } from '@/lib/credentials';
import prisma from '@/lib/prisma';
import { credentialsSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

const BCRYPT_COST = 12;

/**
 * Restablece la contraseña de un lote de cuentas a su contraseña inicial y la devuelve en claro una sola vez,
 * para que la administración entregue las credenciales. Las contraseñas se guardan cifradas y no se pueden leer,
 * por eso descargar credenciales implica fijarlas de nuevo. Cierra las sesiones abiertas de esas cuentas.
 */
export const POST = withAuth('admin/users credentials', ['ADMIN'], async (req, currentUser) => {
  const { ids } = await parseBody(req, credentialsSchema);

  const users = await prisma.user.findMany({
    where: {
      id: { in: ids, not: currentUser.id },
      role: { not: 'ADMIN' },
      status: 'ACTIVO',
      anonymizedAt: null,
    },
    select: { id: true, name: true, email: true, role: true, memberNumber: true },
  });

  const credentials: {
    id: string;
    name: string;
    email: string;
    role: string;
    memberNumber: string | null;
    password: string;
  }[] = [];
  for (const user of users) {
    const password = initialPassword(user.memberNumber, user.role);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(password, BCRYPT_COST),
        tokenVersion: { increment: 1 },
        mustChangePassword: true,
      },
    });
    credentials.push({ ...user, password });
  }

  return NextResponse.json({ credentials, skipped: ids.length - credentials.length });
});
