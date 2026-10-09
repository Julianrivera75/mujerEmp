import type { Prisma, Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { reachableUsersFilter } from '@/lib/chat-db';
import { rolesOf } from '@/lib/roles';
import { ROLES } from '@/lib/validators';
import { presenceForViewer } from '@/lib/presence';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;

/**
 * Directorio de personas con las que se puede iniciar una conversación: cuentas activas que la persona puede
 * escribir, con búsqueda por nombre, filtro por rol y paginación (`offset`). No expone correo ni documentos.
 */
export const GET = withAuth('chat contacts', 'any', async (req, user) => {
  const params = new URL(req.url).searchParams;
  const q = params.get('q')?.trim().slice(0, 80);
  const roleParam = params.get('role');
  const role = ROLES.find((r) => r === roleParam) as Role | undefined;
  const limit = Math.min(Math.max(Number(params.get('limit')) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(Number(params.get('offset')) || 0, 0);

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { showOnlineStatus: true, isMinor: true, role: true, extraRoles: true },
  });

  const where: Prisma.UserWhereInput = {
    AND: [
      {
        id: { not: user.id },
        status: 'ACTIVO',
        anonymizedAt: null,
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      me ? reachableUsersFilter(me) : {},
      role ? { OR: [{ role }, { extraRoles: { has: role } }] } : {},
    ],
  };

  const [total, page] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip: offset,
      take: limit,
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

  const existing = await prisma.conversation.findMany({
    where: {
      OR: [
        { userAId: user.id, userBId: { in: page.map((p) => p.id) } },
        { userBId: user.id, userAId: { in: page.map((p) => p.id) } },
      ],
    },
    select: { id: true, userAId: true, userBId: true },
  });
  const conversationWith = new Map(existing.map((c) => [c.userAId === user.id ? c.userBId : c.userAId, c.id]));

  const viewer = { isAdmin: user.roles.includes('ADMIN'), showOnlineStatus: me?.showOnlineStatus ?? true };
  return NextResponse.json({
    total,
    nextOffset: offset + page.length < total ? offset + page.length : null,
    contacts: page.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      roles: rolesOf(p),
      presence: presenceForViewer(viewer, p),
      conversationId: conversationWith.get(p.id) ?? null,
    })),
  });
});
