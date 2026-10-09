import { NextResponse } from 'next/server';
import { HttpError, parseBody, withAuth } from '@/lib/api';
import { notifyMany } from '@/lib/notifications';
import prisma from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { reportMessageSchema } from '@/lib/schemas';
import { cleanText } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const REPORTS_PER_HOUR = 10;
const BODY_COPY_LENGTH = 2000;

/** Reporta a la administración un mensaje recibido. Guarda una copia del texto para poder revisarlo. */
export const POST = withAuth('chat report', 'any', async (req, user) => {
  const { messageId, reason } = await parseBody(req, reportMessageSchema);
  const cleanReason = cleanText(reason, 500);
  if (!cleanReason) throw new HttpError(400, 'Cuéntanos el motivo.');

  const limit = rateLimit(`report:${user.id}`, REPORTS_PER_HOUR, 3_600_000);
  if (!limit.ok) {
    throw new HttpError(429, 'Has enviado muchos reportes. Inténtalo más tarde.', {
      'Retry-After': String(limit.retryAfterSec),
    });
  }

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      body: true,
      senderId: true,
      conversationId: true,
      attachmentName: true,
      conversation: { select: { userAId: true, userBId: true } },
    },
  });
  const { userAId, userBId } = message?.conversation ?? {};
  if (!message || (userAId !== user.id && userBId !== user.id)) throw new HttpError(404, 'Mensaje no encontrado.');
  if (message.senderId === user.id) throw new HttpError(400, 'Solo puedes reportar mensajes que recibiste.');

  const text = message.body || (message.attachmentName ? `Archivo adjunto: ${message.attachmentName}` : '');
  const report = await prisma.messageReport.upsert({
    where: { messageId_reporterId: { messageId, reporterId: user.id } },
    update: {},
    create: {
      messageId,
      conversationId: message.conversationId,
      reporterId: user.id,
      reportedId: message.senderId,
      messageBody: text.slice(0, BODY_COPY_LENGTH),
      reason: cleanReason,
    },
    select: { id: true },
  });

  const admins = await prisma.user.findMany({
    where: { status: 'ACTIVO', anonymizedAt: null, OR: [{ role: 'ADMIN' }, { extraRoles: { has: 'ADMIN' } }] },
    select: { id: true },
  });
  await notifyMany(
    admins.map((a) => a.id),
    {
      type: 'CHAT_REPORT',
      title: 'Mensaje reportado',
      body: 'Una persona reportó un mensaje del chat. Revísalo.',
      href: '/admin/reportes',
      dedupeKey: `report:${report.id}`,
    },
  );
  return NextResponse.json({ success: true });
});
