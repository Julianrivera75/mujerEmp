import { randomUUID } from 'node:crypto';
import type { NotificationType } from '@prisma/client';
import { unreadByConversation } from './chat-db';
import prisma from './prisma';

/** Aviso "por vencer" para las tareas que vencen dentro de este margen. */
const DUE_SOON_HOURS = 48;
const SYNC_INTERVAL_MS = 10 * 60 * 1000;

const lastSync = new Map<string, number>();

export interface NotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  /** Ruta a la que lleva el aviso al pulsarlo. */
  href: string;
  /** Identifica el evento para no repetir el mismo aviso a la misma persona. */
  dedupeKey: string;
}

/** Largo máximo de la vista previa del mensaje en el aviso. */
const MESSAGE_PREVIEW_LENGTH = 80;

/**
 * Avisa de un mensaje nuevo a cada destinataria. Hay un solo aviso por conversación: si ya existe, se actualiza con el
 * mensaje más reciente y vuelve a quedar sin leer, para no llenar la campana con un aviso por mensaje.
 */
export async function notifyNewMessage(
  recipients: readonly { userId: string; conversationId: string }[],
  senderName: string,
  body: string,
) {
  if (recipients.length === 0) return;
  const preview = body.length > MESSAGE_PREVIEW_LENGTH ? `${body.slice(0, MESSAGE_PREVIEW_LENGTH)}…` : body;
  const title = `Mensaje de ${senderName}`;
  const ids = recipients.map(() => randomUUID());
  const userIds = recipients.map((r) => r.userId);
  const hrefs = recipients.map((r) => `/chat?c=${r.conversationId}`);
  const keys = recipients.map((r) => `msg:${r.conversationId}`);
  await prisma.$executeRaw`
    INSERT INTO "Notification" (id, "userId", type, title, body, href, "dedupeKey", "createdAt")
    SELECT t.id, t.uid, 'NEW_MESSAGE'::"NotificationType", ${title}, ${preview}, t.href, t.key, NOW()
    FROM unnest(${ids}::text[], ${userIds}::text[], ${hrefs}::text[], ${keys}::text[]) AS t(id, uid, href, key)
    ON CONFLICT ("userId", "dedupeKey") DO UPDATE
    SET title = EXCLUDED.title, body = EXCLUDED.body, href = EXCLUDED.href, "createdAt" = EXCLUDED."createdAt", "readAt" = NULL`;
}

/** Marca como leído el aviso de mensaje nuevo de una conversación (al abrirla). */
export async function markMessageNoticeRead(userId: string, conversationId: string) {
  await prisma.notification.updateMany({
    where: { userId, dedupeKey: `msg:${conversationId}`, readAt: null },
    data: { readAt: new Date() },
  });
}

/** Crea el aviso para cada persona indicada, sin repetir los que ya existen. */
export async function notifyMany(userIds: readonly string[], input: NotificationInput) {
  const unique = Array.from(new Set(userIds));
  if (unique.length === 0) return;
  await prisma.notification.createMany({
    data: unique.map((userId) => ({ userId, ...input })),
    skipDuplicates: true,
  });
}

/**
 * Genera los avisos de tareas por vencer de una estudiante (sin entrega y con fecha límite en las próximas 48 horas).
 * Se ejecuta con el latido de actividad, como máximo una vez cada 10 minutos por persona.
 */
export async function syncDueSoon(userId: string, now = new Date()) {
  const previous = lastSync.get(userId) ?? 0;
  if (now.getTime() - previous < SYNC_INTERVAL_MS) return;
  lastSync.set(userId, now.getTime());

  const until = new Date(now.getTime() + DUE_SOON_HOURS * 3600 * 1000);
  const pending = await prisma.assignment.findMany({
    where: {
      dueDate: { gt: now, lte: until },
      classSession: { enrollments: { some: { studentId: userId } } },
      submissions: { none: { studentId: userId } },
    },
    select: { id: true, title: true, dueDate: true },
  });

  await Promise.all(
    pending.map((assignment) =>
      notifyMany([userId], {
        type: 'ASSIGNMENT_DUE_SOON',
        title: 'Tarea por vencer',
        body: `"${assignment.title}" vence pronto.`,
        href: `/estudiante/tareas?tarea=${assignment.id}`,
        dedupeKey: `due:${assignment.id}`,
      }),
    ),
  );
}

/** Solo para pruebas: reinicia el límite de sincronización. */
export function resetDueSoonThrottle() {
  lastSync.clear();
}

/** Cantidad de mensajes sin leer de una persona en todas sus conversaciones. */
export async function countUnreadMessages(userId: string): Promise<number> {
  const counts = await unreadByConversation(userId);
  let total = 0;
  for (const n of counts.values()) total += n;
  return total;
}
