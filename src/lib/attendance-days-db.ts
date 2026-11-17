import prisma from './prisma';
import { dayKeyOf, summarizeDays, type DayClass, type DaySummary } from './attendance-days';

const CLASS_SELECT = { id: true, title: true, dateStart: true, status: true, meetLink: true } as const;

/**
 * Resumen de asistencia por día de varias estudiantes. Con `mentorId` solo se consideran las clases de esa mentora.
 * Incluye las clases inscritas y las de las asistencias, aunque la inscripción ya no exista.
 */
export async function loadDaySummaries(
  studentIds: readonly string[],
  options: { mentorId?: string; now?: Date } = {},
): Promise<Map<string, DaySummary>> {
  if (studentIds.length === 0) return new Map();
  const classFilter = options.mentorId ? { classSession: { mentorId: options.mentorId } } : {};

  const [enrollments, attendances] = await Promise.all([
    prisma.classEnrollment.findMany({
      where: { studentId: { in: [...studentIds] }, ...classFilter },
      select: { studentId: true, classSession: { select: CLASS_SELECT } },
    }),
    prisma.attendance.findMany({
      where: { studentId: { in: [...studentIds] }, ...classFilter },
      select: { studentId: true, classId: true, joinedAt: true, classSession: { select: CLASS_SELECT } },
    }),
  ]);

  const classesOf = new Map<string, Map<string, DayClass>>();
  const attendancesOf = new Map<string, { classId: string; joinedAt: Date }[]>();
  const addClass = (studentId: string, cls: DayClass) => {
    if (!classesOf.has(studentId)) classesOf.set(studentId, new Map());
    classesOf.get(studentId)?.set(cls.id, cls);
  };
  for (const e of enrollments) addClass(e.studentId, e.classSession);
  for (const a of attendances) {
    addClass(a.studentId, a.classSession);
    attendancesOf.set(a.studentId, [
      ...(attendancesOf.get(a.studentId) ?? []),
      { classId: a.classId, joinedAt: a.joinedAt },
    ]);
  }

  return new Map(
    studentIds.map((id) => [
      id,
      summarizeDays([...(classesOf.get(id)?.values() ?? [])], attendancesOf.get(id) ?? [], options.now),
    ]),
  );
}

/**
 * Rango de días con charla de un módulo (todo el programa, sin depender de la inscripción de nadie en particular):
 * cuántos días contables tiene y el primero y el último, para mostrar el periodo exacto del módulo.
 */
export async function loadModuleDayRange(
  monthKey: string,
  now: Date = new Date(),
): Promise<{ totalDays: number; firstDay: string | null; lastDay: string | null }> {
  const [year, month] = monthKey.split('-').map(Number);
  // Un mes de margen a cada lado: el día en Colombia de una clase cerca de medianoche puede caer en el mes de
  // calendario vecino al de su `dateStart` en UTC.
  const rangeStart = new Date(year, month - 2, 1);
  const rangeEnd = new Date(year, month + 1, 1);

  const classes = await prisma.classSession.findMany({
    where: { status: { not: 'CANCELADA' }, dateStart: { gte: rangeStart, lt: rangeEnd } },
    select: { dateStart: true, meetLink: true },
  });

  const days = new Set<string>();
  for (const c of classes) {
    if (!c.meetLink) continue;
    if (c.dateStart.getTime() > now.getTime()) continue;
    const day = dayKeyOf(c.dateStart);
    if (day.startsWith(monthKey)) days.add(day);
  }
  const sorted = [...days].sort();
  return { totalDays: sorted.length, firstDay: sorted[0] ?? null, lastDay: sorted.at(-1) ?? null };
}

/** Total de pares estudiante-día con al menos un ingreso (el día es el de la charla, en hora de Colombia). */
export async function countAttendanceDays(): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM (
      SELECT DISTINCT a."studentId",
        ((c."dateStart" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Bogota')::date AS day
      FROM "Attendance" a
      JOIN "ClassSession" c ON c."id" = a."classId"
      WHERE c."status" <> 'CANCELADA'
    ) AS days`;
  return Number(rows[0]?.count ?? 0);
}
