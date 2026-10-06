/**
 * Asistencia por día. Una estudiante está presente un día si entró al menos a una de las charlas de ese día; los demás
 * ingresos del mismo día no suman ni duplican. El porcentaje se calcula sobre los días con charlas, no sobre las clases.
 *
 * Todo se deriva de los ingresos por charla (`Attendance`) y de las fechas de las clases, así que no hay nada que
 * migrar: al cambiar la fecha de una clase, el día se recalcula solo. Funciones puras: sirven en servidor y navegador.
 */

/** El día se cuenta siempre en la hora de Colombia (UTC−5, sin horario de verano). */
const ATTENDANCE_TIME_ZONE = 'America/Bogota';

const DAY_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: ATTENDANCE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

type DateInput = Date | string;

const toDate = (value: DateInput) => (value instanceof Date ? value : new Date(value));

/** Día (AAAA-MM-DD) en que empieza una charla. Una charla que cruza la medianoche pertenece al día en que empieza. */
export function dayKeyOf(value: DateInput): string {
  return DAY_FORMAT.format(toDate(value));
}

export interface DayClass {
  id: string;
  title?: string;
  dateStart: DateInput;
  status?: string | null;
  meetLink?: string | null;
}

export interface DayAttendance {
  classId: string;
  joinedAt: DateInput;
}

export interface AttendanceDay {
  day: string;
  present: boolean;
  firstJoinedAt: string | null;
  classesAttended: number;
  classesInDay: number;
  classTitles: string[];
}

export interface DaySummary {
  days: AttendanceDay[];
  totalDays: number;
  attendedDays: number;
  percentage: number;
}

function percentOf(attended: number, total: number): number {
  return total > 0 ? Math.round((attended / total) * 100) : 0;
}

/** Una clase que empezó en un día anterior a hoy y hace más de esto ya terminó, aunque su fecha de fin esté mal guardada. */
const STALE_AFTER_MS = 12 * 60 * 60 * 1000;

/**
 * Si una clase ya pasó: está finalizada, su fin ya llegó o empezó en un día anterior a hoy hace más de 12 horas. La
 * última condición evita que una fecha de fin mal guardada deje una clase de ayer como "próxima", sin ocultar una clase
 * nocturna que cruza la medianoche.
 */
export function isPastClass(
  cls: Pick<DayClass, 'dateStart' | 'status'> & { dateEnd: DateInput },
  now: Date = new Date(),
): boolean {
  if (cls.status === 'FINALIZADA') return true;
  if (toDate(cls.dateEnd).getTime() < now.getTime()) return true;
  return dayKeyOf(cls.dateStart) < dayKeyOf(now) && now.getTime() - toDate(cls.dateStart).getTime() > STALE_AFTER_MS;
}

/**
 * Resumen de una estudiante. `classes` debe incluir sus clases inscritas y también las de sus asistencias; una
 * asistencia a una clase que no está en la lista se ignora.
 *
 * Cuenta como día con charlas el que tiene al menos una clase ya empezada, no cancelada y con enlace de Meet (sin enlace
 * no se puede marcar), más cualquier día en que haya asistido (así el porcentaje nunca pasa de 100 %).
 */
export function summarizeDays(
  classes: readonly DayClass[],
  attendances: readonly DayAttendance[],
  now: Date = new Date(),
): DaySummary {
  const active = classes.filter((c) => c.status !== 'CANCELADA');
  const byId = new Map(active.map((c) => [c.id, c]));

  const days = new Map<string, AttendanceDay & { countable: boolean; seen: Set<string> }>();
  const entryOf = (day: string) => {
    let entry = days.get(day);
    if (!entry) {
      entry = {
        day,
        present: false,
        firstJoinedAt: null,
        classesAttended: 0,
        classesInDay: 0,
        classTitles: [],
        countable: false,
        seen: new Set(),
      };
      days.set(day, entry);
    }
    return entry;
  };

  for (const c of active) {
    const entry = entryOf(dayKeyOf(c.dateStart));
    entry.classesInDay += 1;
    if (toDate(c.dateStart).getTime() <= now.getTime() && c.meetLink !== null && c.meetLink !== '') {
      entry.countable = true;
    }
  }

  for (const a of attendances) {
    const cls = byId.get(a.classId);
    if (!cls) continue;
    const entry = entryOf(dayKeyOf(cls.dateStart));
    if (entry.seen.has(a.classId)) continue;
    entry.seen.add(a.classId);
    entry.classesAttended += 1;
    entry.present = true;
    if (cls.title) entry.classTitles.push(cls.title);
    const joined = toDate(a.joinedAt).toISOString();
    if (!entry.firstJoinedAt || joined < entry.firstJoinedAt) entry.firstJoinedAt = joined;
  }

  const result: AttendanceDay[] = [...days.values()]
    .filter((d) => d.countable || d.present)
    .sort((a, b) => a.day.localeCompare(b.day))
    .map(({ day, present, firstJoinedAt, classesAttended, classesInDay, classTitles }) => ({
      day,
      present,
      firstJoinedAt,
      classesAttended,
      classesInDay,
      classTitles,
    }));

  const attendedDays = result.filter((d) => d.present).length;
  return { days: result, totalDays: result.length, attendedDays, percentage: percentOf(attendedDays, result.length) };
}

/** Días presentes y total por mes (AAAA-MM del día en Colombia); sirve para los módulos de certificado. */
export function summarizeByMonth(days: readonly AttendanceDay[]): Map<string, Omit<DaySummary, 'days'>> {
  const months = new Map<string, { totalDays: number; attendedDays: number }>();
  for (const d of days) {
    const key = d.day.slice(0, 7);
    const m = months.get(key) ?? { totalDays: 0, attendedDays: 0 };
    m.totalDays += 1;
    if (d.present) m.attendedDays += 1;
    months.set(key, m);
  }
  return new Map(
    [...months].map(([key, m]) => [key, { ...m, percentage: percentOf(m.attendedDays, m.totalDays) }] as const),
  );
}
