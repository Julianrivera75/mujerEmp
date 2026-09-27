import { NextResponse } from 'next/server';
import { HttpError, parseBody, withAuth } from '@/lib/api';
import { canChat, MESSAGE_MAX_LENGTH, MESSAGES_PER_MINUTE } from '@/lib/chat';
import prisma from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { sendMessageSchema } from '@/lib/schemas';
import { cleanText } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 100;

/** Carga la conversación solo si la persona es una de las dos participantes. */
async function loadOwnConversation(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || (conversation.userAId !== userId && conversation.userBId !== userId)) {
    throw new HttpError(404, 'Conversación no encontrada.');
  }
  return conversation;
}

/** Mensajes de una conversación. Con `after` (fecha ISO) devuelve solo los más recientes. */
export const GET = withAuth('chat messages GET', 'any', async (req, user) => {
  const params = new URL(req.url).searchParams;
  const conversationId = params.get('conversationId');
  if (!conversationId) throw new HttpError(400, 'Falta la conversación.');
  await loadOwnConversation(conversationId, user.id);

  const after = params.get('after');
  const afterDate = after ? new Date(after) : null;

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      ...(afterDate && !Number.isNaN(afterDate.getTime()) ? { createdAt: { gt: afterDate } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE,
    select: { id: true, body: true, createdAt: true, senderId: true },
  });

  return NextResponse.json({
    messages: messages
      .reverse()
      .map((m) => ({ id: m.id, body: m.body, createdAt: m.createdAt, mine: m.senderId === user.id })),
  });
});

/** Envía un mensaje de texto. */
export const POST = withAuth('chat messages POST', 'any', async (req, user) => {
  const { conversationId, body } = await parseBody(req, sendMessageSchema);
  const text = cleanText(body, MESSAGE_MAX_LENGTH);
  if (!text) throw new HttpError(400, 'Escribe un mensaje.');

  const limit = rateLimit(`chat:${user.id}`, MESSAGES_PER_MINUTE, 60_000);
  if (!limit.ok) {
    throw new HttpError(429, 'Estás enviando mensajes muy rápido. Espera un momento.', {
      'Retry-After': String(limit.retryAfterSec),
    });
  }

  const conversation = await loadOwnConversation(conversationId, user.id);
  const otherId = conversation.userAId === user.id ? conversation.userBId : conversation.userAId;

  const [me, other] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { isMinor: true, role: true, extraRoles: true } }),
    prisma.user.findUnique({
      where: { id: otherId },
      select: { isMinor: true, role: true, extraRoles: true, status: true, anonymizedAt: true },
    }),
  ]);
  if (!me || !other || other.anonymizedAt || other.status !== 'ACTIVO') {
    throw new HttpError(403, 'Esta persona ya no está disponible para recibir mensajes.');
  }
  if (!canChat(me, other)) {
    throw new HttpError(
      403,
      'Por protección de menores de edad, solo pueden conversar con mentores o con la administración.',
    );
  }

  const now = new Date();
  const isA = conversation.userAId === user.id;
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId, senderId: user.id, body: text, createdAt: now },
      select: { id: true, body: true, createdAt: true },
    }),
    // Quien envía tiene la conversación al día.
    prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: now, ...(isA ? { lastReadAtA: now } : { lastReadAtB: now }) },
    }),
  ]);

  return NextResponse.json({ message: { ...message, mine: true } });
});
