import { describe, expect, it } from 'vitest';
import { dayKeyOf, isPastClass, summarizeByMonth, summarizeDays, type DayClass } from '@/lib/attendance-days';

const LINK = 'https://meet.google.com/abc-defg-hij';
/** Hora de Colombia (UTC−5): 14:00 en Bogotá es 19:00Z. */
const bogota = (day: string, hhmm: string) => new Date(`${day}T${hhmm}:00-05:00`);

const make = (id: string, day: string, hhmm: string, extra: Partial<DayClass> = {}): DayClass => ({
  id,
  title: `Charla ${id}`,
  dateStart: bogota(day, hhmm),
  status: 'PROGRAMADA',
  meetLink: LINK,
  ...extra,
});

const NOW = bogota('2026-10-09', '12:00');

describe('dayKeyOf', () => {
  it('usa el día de Colombia, no el UTC', () => {
    // 22:30 del 5 de octubre en Bogotá es 03:30Z del 6.
    expect(dayKeyOf(new Date('2026-10-06T03:30:00Z'))).toBe('2026-10-05');
    expect(dayKeyOf(new Date('2026-10-06T05:00:00Z'))).toBe('2026-10-06');
  });

  it('una charla que cruza la medianoche pertenece al día en que empieza', () => {
    expect(dayKeyOf(bogota('2026-10-05', '23:30'))).toBe('2026-10-05');
  });
});

describe('summarizeDays', () => {
  const classes = [
    make('A', '2026-10-05', '14:00'),
    make('B', '2026-10-05', '16:00'),
    make('C', '2026-10-05', '18:00'),
    make('D', '2026-10-06', '14:00'),
    make('E', '2026-10-07', '14:00'),
  ];

  it('entrar a una sola charla del día basta para estar presente ese día', () => {
    const s = summarizeDays(classes, [{ classId: 'B', joinedAt: bogota('2026-10-05', '16:01') }], NOW);
    expect(s.totalDays).toBe(3);
    expect(s.attendedDays).toBe(1);
    expect(s.percentage).toBe(33);
    expect(s.days[0]).toMatchObject({ day: '2026-10-05', present: true, classesAttended: 1, classesInDay: 3 });
  });

  it('entrar a varias charlas el mismo día no duplica el día', () => {
    const attendances = ['A', 'B', 'C'].map((classId) => ({ classId, joinedAt: bogota('2026-10-05', '14:05') }));
    const s = summarizeDays(classes, attendances, NOW);
    expect(s.attendedDays).toBe(1);
    expect(s.days[0]).toMatchObject({ classesAttended: 3, classesInDay: 3 });
  });

  it('un ingreso repetido a la misma charla se cuenta una vez', () => {
    const joined = bogota('2026-10-05', '14:05');
    const s = summarizeDays(
      classes,
      [
        { classId: 'A', joinedAt: joined },
        { classId: 'A', joinedAt: joined },
      ],
      NOW,
    );
    expect(s.days[0].classesAttended).toBe(1);
  });

  it('calcula el porcentaje sobre los días con charlas, no sobre las clases', () => {
    const s = summarizeDays(
      classes,
      [
        { classId: 'A', joinedAt: bogota('2026-10-05', '14:05') },
        { classId: 'D', joinedAt: bogota('2026-10-06', '14:05') },
        { classId: 'E', joinedAt: bogota('2026-10-07', '14:05') },
      ],
      NOW,
    );
    // 3 días con charlas y presente en los 3, aunque entró solo a 3 de las 5 charlas.
    expect(s).toMatchObject({ totalDays: 3, attendedDays: 3, percentage: 100 });
  });

  it('guarda el primer ingreso del día', () => {
    const s = summarizeDays(
      classes,
      [
        { classId: 'C', joinedAt: bogota('2026-10-05', '18:02') },
        { classId: 'A', joinedAt: bogota('2026-10-05', '14:03') },
      ],
      NOW,
    );
    expect(s.days[0].firstJoinedAt).toBe(bogota('2026-10-05', '14:03').toISOString());
  });

  it('no cuenta los días que todavía no empiezan', () => {
    const early = bogota('2026-10-05', '08:00');
    const s = summarizeDays(classes, [{ classId: 'A', joinedAt: bogota('2026-10-05', '14:05') }], early);
    // A las 8:00 del 5 de octubre aún no ha empezado ninguna charla.
    expect(s.totalDays).toBe(1);
    expect(s.attendedDays).toBe(1);
  });

  it('ignora las charlas canceladas y los días solo con canceladas', () => {
    const withCancelled = [...classes, make('X', '2026-10-08', '14:00', { status: 'CANCELADA' })];
    const s = summarizeDays(withCancelled, [{ classId: 'X', joinedAt: bogota('2026-10-08', '14:05') }], NOW);
    expect(s.days.some((d) => d.day === '2026-10-08')).toBe(false);
    expect(s.attendedDays).toBe(0);
  });

  it('un día cuyas charlas no tienen enlace no cuenta, salvo que ya tenga asistencia', () => {
    const noLink = make('N', '2026-10-08', '14:00', { meetLink: null });
    expect(summarizeDays([noLink], [], NOW).totalDays).toBe(0);
    expect(summarizeDays([noLink], [{ classId: 'N', joinedAt: bogota('2026-10-08', '14:05') }], NOW)).toMatchObject({
      totalDays: 1,
      attendedDays: 1,
    });
  });

  it('un día sin charlas no existe y una charla a medianoche cuenta en su día de inicio', () => {
    const late = make('L', '2026-10-05', '23:30');
    const s = summarizeDays([late], [{ classId: 'L', joinedAt: new Date('2026-10-06T05:10:00Z') }], NOW);
    expect(s.days.map((d) => d.day)).toEqual(['2026-10-05']);
    expect(s.percentage).toBe(100);
  });

  it('ignora una asistencia a una clase que no está en la lista', () => {
    const s = summarizeDays(classes, [{ classId: 'desconocida', joinedAt: bogota('2026-10-05', '14:05') }], NOW);
    expect(s.attendedDays).toBe(0);
  });

  it('sin días el porcentaje es 0', () => {
    expect(summarizeDays([], [], NOW)).toEqual({ days: [], totalDays: 0, attendedDays: 0, percentage: 0 });
  });
});

describe('summarizeByMonth', () => {
  it('agrupa por el mes del día en Colombia', () => {
    const classes = [
      make('A', '2026-10-30', '14:00'),
      make('B', '2026-10-31', '14:00'),
      make('C', '2026-11-02', '14:00'),
    ];
    const s = summarizeDays(
      classes,
      [{ classId: 'A', joinedAt: bogota('2026-10-30', '14:05') }],
      bogota('2026-11-05', '12:00'),
    );
    const months = summarizeByMonth(s.days);
    expect(months.get('2026-10')).toEqual({ totalDays: 2, attendedDays: 1, percentage: 50 });
    expect(months.get('2026-11')).toEqual({ totalDays: 1, attendedDays: 0, percentage: 0 });
  });
});

describe('isPastClass', () => {
  const cls = (start: string, end: string, extra: Record<string, unknown> = {}) => ({
    dateStart: new Date(start),
    dateEnd: new Date(end),
    status: 'PROGRAMADA',
    ...extra,
  });
  const NOW = bogota('2026-10-06', '18:25');

  it('una clase de ayer que ya terminó es pasada aunque nadie la haya marcado como finalizada', () => {
    expect(isPastClass(cls('2026-10-05T17:00:00-05:00', '2026-10-05T17:30:00-05:00'), NOW)).toBe(true);
  });

  it('una clase de hoy en curso o que aún no empieza no es pasada', () => {
    expect(isPastClass(cls('2026-10-06T18:00:00-05:00', '2026-10-06T19:15:00-05:00'), NOW)).toBe(false);
    expect(isPastClass(cls('2026-10-06T19:20:00-05:00', '2026-10-06T20:30:00-05:00'), NOW)).toBe(false);
  });

  it('una clase finalizada es pasada aunque su fin esté en el futuro', () => {
    expect(
      isPastClass(cls('2026-10-06T19:20:00-05:00', '2026-10-06T20:30:00-05:00', { status: 'FINALIZADA' }), NOW),
    ).toBe(true);
  });

  it('una clase de ayer con la fecha de fin mal guardada (en el futuro) también es pasada', () => {
    expect(isPastClass(cls('2026-10-05T17:00:00-05:00', '2026-10-07T17:30:00-05:00'), NOW)).toBe(true);
  });

  it('una clase nocturna que cruza la medianoche sigue en curso en la madrugada', () => {
    const night = cls('2026-10-05T23:30:00-05:00', '2026-10-06T00:45:00-05:00');
    expect(isPastClass(night, bogota('2026-10-06', '00:15'))).toBe(false);
    expect(isPastClass(night, bogota('2026-10-06', '01:00'))).toBe(true);
  });
});
