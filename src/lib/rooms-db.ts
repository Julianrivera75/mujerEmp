import prisma from './prisma';
import { groupRooms, planCarryOver, type RoomClass } from './rooms';

/** Ventana de clases que se revisan alrededor de un instante. */
const WINDOW_MS = 24 * 60 * 60 * 1000;
/** No se recalcula la permanencia más de una vez en este intervalo por proceso. */
const SETTLE_MIN_INTERVAL_MS = 20 * 1000;

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

let lastSettledAt = 0;

/**
 * Registra la asistencia por permanencia de las clases que ya empezaron en salas continuas. Es idempotente y se llama
 * al leer asistencias, así que no necesita una tarea programada. Devuelve cuántas filas creó.
 */
export async function settleCarryOver(now: Date = new Date(), options: { force?: boolean } = {}): Promise<number> {
  if (!options.force && Date.now() - lastSettledAt < SETTLE_MIN_INTERVAL_MS) return 0;
  lastSettledAt = Date.now();

  const classes = await prisma.classSession.findMany({
    where: {
      meetLink: { not: null },
      status: { not: 'CANCELADA' },
      dateStart: { gte: new Date(now.getTime() - WINDOW_MS), lte: now },
    },
    select: { id: true, title: true, dateStart: true, dateEnd: true, meetLink: true, status: true },
  });
  const chains = groupRooms(classes).filter((chain) => chain.length > 1);
  if (chains.length === 0) return 0;

  const classIds = chains.flat().map((c) => c.id);
  const [attendances, enrollments] = await Promise.all([
    prisma.attendance.findMany({
      where: { classId: { in: classIds } },
      select: { classId: true, studentId: true, leftAt: true },
    }),
    prisma.classEnrollment.findMany({
      where: { classId: { in: classIds } },
      select: { classId: true, studentId: true },
    }),
  ]);

  const rows = chains.flatMap((chain) => planCarryOver(chain, now, attendances, enrollments));
  if (rows.length === 0) return 0;

  const result = await prisma.attendance.createMany({
    data: rows.map((r) => ({ ...r, source: 'CARRY' as const })),
    skipDuplicates: true,
  });
  return result.count;
}
