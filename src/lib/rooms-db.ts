import prisma from './prisma';
import type { RoomClass } from './rooms';

/** Ventana de clases que se revisan alrededor de un instante. */
const WINDOW_MS = 24 * 60 * 60 * 1000;

/** Clases con enlace de Meet que empiezan alrededor de un instante (candidatas a formar una sala). */
export async function loadRoomClasses(around: Date): Promise<RoomClass[]> {
  return prisma.classSession.findMany({
    where: {
      meetLink: { not: null },
      status: { not: 'CANCELADA' },
      dateStart: { gte: new Date(around.getTime() - WINDOW_MS), lte: new Date(around.getTime() + WINDOW_MS) },
    },
    select: { id: true, title: true, dateStart: true, dateEnd: true, meetLink: true, status: true },
    orderBy: { dateStart: 'asc' },
  });
}
