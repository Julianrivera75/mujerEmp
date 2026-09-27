import { NextResponse } from 'next/server';
import { parseBody, withAuth } from '@/lib/api';
import prisma from '@/lib/prisma';
import { markNotificationsReadSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

/** Marca como leída una notificación (`id`) o todas (`all: true`). Solo afecta a las de la propia persona. */
export const POST = withAuth('notifications read', 'any', async (req, user) => {
  const { id, all } = await parseBody(req, markNotificationsReadSchema);

  const result = await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null, ...(all ? {} : { id }) },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ success: true, updated: result.count });
});
