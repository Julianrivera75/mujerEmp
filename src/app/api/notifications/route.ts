import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const MAX_NOTIFICATIONS = 100;

/** Notificaciones de la persona, las más recientes primero. */
export const GET = withAuth('notifications GET', 'any', async (req, user) => {
  const limit = Math.min(Number(new URL(req.url).searchParams.get('limit')) || 30, MAX_NOTIFICATIONS);

  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, type: true, title: true, body: true, href: true, createdAt: true, readAt: true },
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  return NextResponse.json({ notifications, unread });
});
