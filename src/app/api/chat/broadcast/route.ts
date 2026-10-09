import { NextResponse } from 'next/server';
import { HttpError, parseBody, withAuth } from '@/lib/api';
import { MESSAGE_MAX_LENGTH } from '@/lib/chat';
import {
  BROADCAST_MAX_RECIPIENTS,
  BROADCASTS_PER_HOUR,
  deliverBroadcast,
  resolveBroadcast,
  targetableClasses,
} from '@/lib/chat-db';
import { rateLimit } from '@/lib/rate-limit';
import { broadcastSendSchema } from '@/lib/schemas';
import { cleanText } from '@/lib/validators';

export const dynamic = 'force-dynamic';

/** Qué audiencias puede usar la persona para escribir a varias a la vez. */
export const GET = withAuth('chat broadcast GET', 'any', async (_req, user) => {
  const isAdmin = user.roles.includes('ADMIN');
  if (!isAdmin && !user.roles.includes('MENTOR')) return NextResponse.json({ allowed: false });
  const classes = await targetableClasses(user);
  return NextResponse.json({
    allowed: true,
    isAdmin,
    maxRecipients: BROADCAST_MAX_RECIPIENTS,
    classes: classes.map((c) => ({ id: c.id, title: c.title, dateStart: c.dateStart, students: c._count.enrollments })),
  });
});

/** Envía el mismo mensaje a varias personas, cada una en su conversación 1 a 1 con quien lo escribe. */
export const POST = withAuth('chat broadcast POST', 'any', async (req, user) => {
  const { audience, body, excludeIds } = await parseBody(req, broadcastSendSchema);
  const text = cleanText(body, MESSAGE_MAX_LENGTH);
  if (!text) throw new HttpError(400, 'Escribe un mensaje.');

  // Se calculan los destinatarios antes de gastar el límite, para que un error no cuente como envío.
  const { recipients, skipped } = await resolveBroadcast(user, audience);
  const excluded = new Set(excludeIds ?? []);
  const finalRecipients = recipients.filter((r) => !excluded.has(r.id));
  if (finalRecipients.length === 0) throw new HttpError(400, 'No hay personas a quienes enviar este mensaje.');

  const limit = rateLimit(`broadcast:${user.id}`, BROADCASTS_PER_HOUR, 3_600_000);
  if (!limit.ok) {
    throw new HttpError(429, `Solo puedes enviar ${BROADCASTS_PER_HOUR} mensajes a varias personas por hora.`, {
      'Retry-After': String(limit.retryAfterSec),
    });
  }

  const sent = await deliverBroadcast(
    user.id,
    user.name,
    finalRecipients.map((r) => r.id),
    text,
  );
  return NextResponse.json({ sent, skipped });
});
