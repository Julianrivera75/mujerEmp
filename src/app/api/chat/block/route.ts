import { NextResponse } from 'next/server';
import { HttpError, parseBody, withAuth } from '@/lib/api';
import prisma from '@/lib/prisma';
import { blockUserSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

/** Bloquea o desbloquea a una persona: mientras dure el bloqueo, ninguna de las dos puede escribirle a la otra. */
export const POST = withAuth('chat block', 'any', async (req, user) => {
  const { userId, blocked } = await parseBody(req, blockUserSchema);
  if (userId === user.id) throw new HttpError(400, 'No puedes bloquearte a ti misma.');

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) throw new HttpError(404, 'No se encontró a esa persona.');

  if (blocked) {
    await prisma.chatBlock.upsert({
      where: { blockerId_blockedId: { blockerId: user.id, blockedId: userId } },
      update: {},
      create: { blockerId: user.id, blockedId: userId },
    });
  } else {
    await prisma.chatBlock.deleteMany({ where: { blockerId: user.id, blockedId: userId } });
  }
  return NextResponse.json({ success: true, blocked });
});
