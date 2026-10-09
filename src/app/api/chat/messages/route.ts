import { NextResponse } from 'next/server';
import { HttpError, parseBody, withAuth } from '@/lib/api';
import { canChat, MESSAGE_MAX_LENGTH, MESSAGES_PER_MINUTE } from '@/lib/chat';
import { isBlockedBetween } from '@/lib/chat-db';
import { notifyNewMessage } from '@/lib/notifications';
import prisma from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { createPresignedDownloadUrl, keyBelongsTo, UPLOAD_CATEGORIES, verifyUploadedObject } from '@/lib/s3';
import { sendMessageSchema } from '@/lib/schemas';
import { cleanText } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 100;
/** Las direcciones de descarga de los archivos duran 15 minutos. */
const ATTACHMENT_URL_SECONDS = 900;

/** Carga la conversación solo si la persona es una de las dos participantes. */
async function loadOwnConversation(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || (conversation.userAId !== userId && conversation.userBId !== userId)) {
    throw new HttpError(404, 'Conversación no encontrada.');
  }
  return conversation;
}

interface AttachmentRow {
  attachmentKey: string | null;
  attachmentName: string | null;
  attachmentType: string | null;
  attachmentSize: number | null;
}

async function attachmentOf(row: AttachmentRow) {
  if (!row.attachmentKey) return null;
  return {
    name: row.attachmentName,
    type: row.attachmentType,
    size: row.attachmentSize,
    url: await createPresignedDownloadUrl(row.attachmentKey, ATTACHMENT_URL_SECONDS).catch(() => null),
  };
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
    select: {
      id: true,
      body: true,
      createdAt: true,
      senderId: true,
      attachmentKey: true,
      attachmentName: true,
      attachmentType: true,
      attachmentSize: true,
    },
  });

  const items = await Promise.all(
    messages.reverse().map(async (m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt,
      mine: m.senderId === user.id,
      attachment: await attachmentOf(m),
    })),
  );
  return NextResponse.json({ messages: items });
});

/** Envía un mensaje de texto, con un archivo adjunto opcional (imagen o PDF). */
export const POST = withAuth('chat messages POST', 'any', async (req, user) => {
  const { conversationId, body, attachment } = await parseBody(req, sendMessageSchema);
  const text = cleanText(body, MESSAGE_MAX_LENGTH);
  if (!text && !attachment) throw new HttpError(400, 'Escribe un mensaje.');

  const limit = rateLimit(`chat:${user.id}`, MESSAGES_PER_MINUTE, 60_000);
  if (!limit.ok) {
    throw new HttpError(429, 'Estás enviando mensajes muy rápido. Espera un momento.', {
      'Retry-After': String(limit.retryAfterSec),
    });
  }

  const conversation = await loadOwnConversation(conversationId, user.id);
  const otherId = conversation.userAId === user.id ? conversation.userBId : conversation.userAId;

  const [me, other] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, isMinor: true, role: true, extraRoles: true },
    }),
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
  if (await isBlockedBetween(user.id, otherId)) {
    throw new HttpError(403, 'No puedes enviar mensajes a esta persona.');
  }

  // El archivo debe ser de quien escribe, existir en el almacenamiento y ser de un tipo permitido.
  if (attachment) {
    const typeAllowed = (UPLOAD_CATEGORIES.chat.allowedTypes as readonly string[]).includes(attachment.type);
    const valid =
      typeAllowed &&
      keyBelongsTo(attachment.key, 'chat', user.id) &&
      (await verifyUploadedObject(attachment.key, 'chat'));
    if (!valid) {
      throw new HttpError(400, 'El archivo no es válido. Adjunta una imagen JPG, PNG o WebP, o un PDF de hasta 10 MB.');
    }
  }

  const now = new Date();
  const isA = conversation.userAId === user.id;
  const attachmentData = attachment
    ? {
        attachmentKey: attachment.key,
        attachmentName: cleanText(attachment.name, 120) || 'archivo',
        attachmentType: attachment.type,
        attachmentSize: attachment.size,
      }
    : {};
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId, senderId: user.id, body: text ?? '', createdAt: now, ...attachmentData },
      select: {
        id: true,
        body: true,
        createdAt: true,
        attachmentKey: true,
        attachmentName: true,
        attachmentType: true,
        attachmentSize: true,
      },
    }),
    // Quien envía tiene la conversación al día.
    prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: now, ...(isA ? { lastReadAtA: now } : { lastReadAtB: now }) },
    }),
  ]);

  await notifyNewMessage(
    [{ userId: otherId, conversationId }],
    me.name,
    text ?? `Archivo adjunto: ${message.attachmentName ?? ''}`,
  );
  return NextResponse.json({
    message: {
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      mine: true,
      attachment: await attachmentOf(message),
    },
  });
});
