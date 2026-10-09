import { NextResponse } from 'next/server';
import { HttpError, parseBody, withAuth } from '@/lib/api';
import { markMessageNoticeRead } from '@/lib/notifications';
import prisma from '@/lib/prisma';
import { markConversationReadSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

/** Marca la conversación como leída hasta este momento para quien la abre. */
export const POST = withAuth('chat read', 'any', async (req, user) => {
  const { conversationId } = await parseBody(req, markConversationReadSchema);

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || (conversation.userAId !== user.id && conversation.userBId !== user.id)) {
    throw new HttpError(404, 'Conversación no encontrada.');
  }

  const now = new Date();
  await prisma.conversation.update({
    where: { id: conversationId },
    data: conversation.userAId === user.id ? { lastReadAtA: now } : { lastReadAtB: now },
  });
  await markMessageNoticeRead(user.id, conversationId);
  return NextResponse.json({ success: true });
});
