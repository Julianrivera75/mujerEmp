import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { rolesOf } from '@/lib/roles';
import { presenceForViewer } from '@/lib/presence';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const MAX_CONTACTS = 50;

/** Personas con las que se puede iniciar una conversación (cualquier cuenta activa), con búsqueda por nombre. */
export const GET = withAuth('chat contacts', 'any', async (req, user) => {
  const q = new URL(req.url).searchParams.get('q')?.trim().slice(0, 80);

  const where: Prisma.UserWhereInput = {
    id: { not: user.id },
    status: 'ACTIVO',
    anonymizedAt: null,
    ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
  };

  const [me, people] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { showOnlineStatus: true } }),
    prisma.user.findMany({
      where,
      orderBy: { name: 'asc' },
      take: MAX_CONTACTS,
      select: {
        id: true,
        name: true,
        avatar: true,
        role: true,
        extraRoles: true,
        lastSeenAt: true,
        showOnlineStatus: true,
      },
    }),
  ]);

  const viewer = { isAdmin: user.roles.includes('ADMIN'), showOnlineStatus: me?.showOnlineStatus ?? true };
  return NextResponse.json({
    contacts: people.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      roles: rolesOf(p),
      presence: presenceForViewer(viewer, p),
    })),
  });
});
