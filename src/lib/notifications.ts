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
