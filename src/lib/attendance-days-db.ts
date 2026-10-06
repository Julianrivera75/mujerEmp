import prisma from './prisma';
import { summarizeDays, type DayClass, type DaySummary } from './attendance-days';

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
