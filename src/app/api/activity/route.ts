import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import { countUnreadMessages, syncDueSoon } from '@/lib/notifications';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const HEARTBEAT_MIN_INTERVAL_MS = 30_000;

/**
 * Latido de actividad: registra que la persona tiene la plataforma abierta (presencia) y devuelve los contadores
 * de avisos sin leer que muestra la barra. Se llama cada 30 segundos mientras la pestaña está visible.
 */
export const POST = withAuth('activity', 'any', async (_req, user) => {
  const now = new Date();
  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { lastSeenAt: true } });

  // No se escribe en la base más de una vez cada 30 segundos por persona.
  if (!me?.lastSeenAt || now.getTime() - me.lastSeenAt.getTime() >= HEARTBEAT_MIN_INTERVAL_MS) {
    await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: now } });
  }

  if (user.roles.includes('STUDENT')) await syncDueSoon(user.id, now);

  const [unreadNotifications, unreadMessages, latest] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    countUnreadMessages(user.id),
    // La notificación sin leer más reciente: la usan los avisos emergentes.
    prisma.notification.findFirst({
      where: { userId: user.id, readAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, type: true, title: true, body: true },
    }),
  ]);

  return NextResponse.json({ userId: user.id, unreadNotifications, unreadMessages, latest });
});
