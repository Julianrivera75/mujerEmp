import { NextResponse } from 'next/server';
import { HttpError, withAuth } from '@/lib/api';
import { presenceForViewer } from '@/lib/presence';
import prisma from '@/lib/prisma';
import { rolesOf } from '@/lib/roles';
import { readSocialLinks } from '@/lib/social-links';

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
        occupation: true,
        socialLinks: true,
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
      email: person.email,
      occupation: person.occupation,
      socialLinks: readSocialLinks(person.socialLinks),
      presence: presenceForViewer(viewer, person),
      // El contacto directo (WhatsApp) queda reservado a la administración; el correo ya es visible para conectar.
      ...(isAdmin ? { phone: person.phone, status: person.status } : {}),
    },
  });
});
