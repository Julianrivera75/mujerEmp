import { NextResponse } from 'next/server';
import { HttpError, withAuth } from '@/lib/api';
import { presenceForViewer } from '@/lib/presence';
import prisma from '@/lib/prisma';
import { rolesOf } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * Perfil de otra persona, solo lectura: nombre, foto, roles, número y presencia. No expone correo, teléfono ni datos
 * de menores; la administración sí ve el correo y el contacto.
 */
export const GET = withAuth('users profile', 'any', async (req, user) => {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) throw new HttpError(400, 'Falta la persona.');

  const [me, person] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { showOnlineStatus: true } }),
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
        extraRoles: true,
        memberNumber: true,
        createdAt: true,
        lastSeenAt: true,
        showOnlineStatus: true,
        status: true,
        anonymizedAt: true,
      },
    }),
  ]);
  if (!person || person.anonymizedAt) throw new HttpError(404, 'No se encontró a esa persona.');

  const isAdmin = user.roles.includes('ADMIN');
  const viewer = { isAdmin, showOnlineStatus: me?.showOnlineStatus ?? true };

  return NextResponse.json({
    profile: {
      id: person.id,
      name: person.name,
      avatar: person.avatar,
      roles: rolesOf(person),
      memberNumber: person.memberNumber,
      memberSince: person.createdAt,
      presence: presenceForViewer(viewer, person),
      ...(isAdmin ? { email: person.email, phone: person.phone, status: person.status } : {}),
    },
  });
});
