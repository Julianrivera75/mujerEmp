import { describe, expect, it } from 'vitest';
import {
  currentClassOf,
  followingClasses,
  groupRooms,
  meetKey,
  planCarryOver,
  resolveTargetClass,
  type RoomClass,
} from '@/lib/rooms';

const LINK = 'https://meet.google.com/abc-defg-hij';
const at = (hhmm: string, day = '2026-10-05') => new Date(`${day}T${hhmm}:00Z`);

const make = (id: string, start: string, end: string, extra: Partial<RoomClass> = {}): RoomClass => ({
  id,
  title: `Clase ${id}`,
  dateStart: at(start),
  dateEnd: at(end),
  meetLink: LINK,
  status: 'PROGRAMADA',
  ...extra,
});

// Tres clases seguidas con el mismo enlace.
const A = make('A', '14:00', '15:00');
const B = make('B', '15:00', '16:00');
const C = make('C', '16:00', '17:00');

describe('meetKey', () => {
  it('ignora mayúsculas, parámetros y la barra final', () => {
    expect(meetKey('https://meet.google.com/ABC-defg-hij/?authuser=1')).toBe('meet.google.com/abc-defg-hij');
    expect(meetKey(LINK)).toBe('meet.google.com/abc-defg-hij');
  });

  it('rechaza enlaces vacíos, ajenos a Meet o sin sala', () => {
    expect(meetKey(null)).toBeNull();
    expect(meetKey('')).toBeNull();
    expect(meetKey('https://zoom.us/j/123')).toBeNull();
    expect(meetKey('http://meet.google.com/abc-defg-hij')).toBeNull();
    expect(meetKey('https://meet.google.com/')).toBeNull();
  });
});

describe('groupRooms', () => {
  it('junta las clases seguidas que comparten enlace en una cadena ordenada', () => {
    expect(groupRooms([C, A, B]).map((chain) => chain.map((c) => c.id))).toEqual([['A', 'B', 'C']]);
  });

  it('tolera un hueco corto entre clases y corta uno largo', () => {
    const shortGap = make('S', '16:08', '17:00');
    const longGap = make('L', '18:00', '19:00');
    expect(groupRooms([A, B, shortGap, longGap]).map((chain) => chain.map((c) => c.id))).toEqual([
      ['A', 'B', 'S'],
      ['L'],
    ]);
  });

  it('no mezcla otro enlace ni otro día, e ignora canceladas y clases sin enlace', () => {
    const other = make('O', '15:00', '16:00', { meetLink: 'https://meet.google.com/zzz-zzzz-zzz' });
    const nextDay = {
      ...make('D', '14:00', '15:00'),
      dateStart: at('14:00', '2026-10-06'),
      dateEnd: at('15:00', '2026-10-06'),
    };
    const cancelled = make('X', '15:00', '16:00', { status: 'CANCELADA' });
    const noLink = make('N', '15:00', '16:00', { meetLink: null });
    const groups = groupRooms([A, other, nextDay, cancelled, noLink]).map((chain) => chain.map((c) => c.id));
    expect(groups).toHaveLength(3);
    expect(groups).toEqual(expect.arrayContaining([['A'], ['O'], ['D']]));
  });
});

describe('currentClassOf', () => {
  const chain = [A, B, C];

  it('devuelve la clase que se está dictando', () => {
    expect(currentClassOf(chain, at('15:30'))?.id).toBe('B');
  });

  it('en el cambio de clase prefiere la que empieza, no la que termina', () => {
    expect(currentClassOf(chain, at('15:00'))?.id).toBe('B');
  });

  it('antes de empezar acepta la entrada anticipada de hasta 15 minutos', () => {
    expect(currentClassOf([A], at('13:50'))?.id).toBe('A');
    expect(currentClassOf([A], at('13:40'))).toBeNull();
  });

  it('después de la última clase no hay ninguna en curso', () => {
    expect(currentClassOf(chain, at('17:00'))).toBeNull();
  });
});

describe('resolveTargetClass', () => {
  const all = [A, B, C];

  it('cuenta el clic a la clase en curso aunque se pulse el botón de otra', () => {
    expect(resolveTargetClass('A', all, at('15:20'))).toBe('B');
    expect(resolveTargetClass('C', all, at('14:10'))).toBe('A');
  });

  it('si no hay clase en curso deja la clase pulsada', () => {
    expect(resolveTargetClass('B', all, at('12:00'))).toBe('B');
  });

  it('una clase sin sala compartida no cambia', () => {
    expect(resolveTargetClass('A', [A], at('14:30'))).toBe('A');
    expect(resolveTargetClass('Z', all, at('14:30'))).toBe('Z');
  });
});

describe('followingClasses', () => {
  it('lista las clases que siguen dentro de la cadena', () => {
    expect(followingClasses('A', [A, B, C]).map((c) => c.id)).toEqual(['B', 'C']);
    expect(followingClasses('C', [A, B, C])).toEqual([]);
  });
});

describe('planCarryOver', () => {
  const chain = [A, B, C];
  const enroll = (...ids: string[]) =>
    ids.flatMap((classId) => ['s1', 's2'].map((studentId) => ({ classId, studentId })));

  it('propaga la asistencia de A a B y a C cuando ya empezaron', () => {
    const rows = planCarryOver(
      chain,
      at('16:10'),
      [{ classId: 'A', studentId: 's1', leftAt: null }],
      enroll('A', 'B', 'C'),
    );
    expect(rows.map((r) => `${r.classId}:${r.studentId}`)).toEqual(['B:s1', 'C:s1']);
    expect(rows[0].joinedAt).toEqual(B.dateStart);
  });

  it('no crea la de una clase que todavía no empieza', () => {
    const rows = planCarryOver(
      chain,
      at('15:30'),
      [{ classId: 'A', studentId: 's1', leftAt: null }],
      enroll('A', 'B', 'C'),
    );
    expect(rows.map((r) => r.classId)).toEqual(['B']);
  });

  it('no propaga si la estudiante avisó que salió', () => {
    const rows = planCarryOver(
      chain,
      at('16:10'),
      [{ classId: 'A', studentId: 's1', leftAt: at('14:50') }],
      enroll('A', 'B', 'C'),
    );
    expect(rows).toEqual([]);
  });

  it('solo propaga a quien está inscrita en la clase siguiente', () => {
    const rows = planCarryOver(
      chain,
      at('16:10'),
      [{ classId: 'A', studentId: 's1', leftAt: null }],
      [
        { classId: 'B', studentId: 's2' },
        { classId: 'C', studentId: 's1' },
      ],
    );
    expect(rows).toEqual([]);
  });

  it('no duplica una asistencia que ya existe y no arrastra a quien no estaba', () => {
    const rows = planCarryOver(
      chain,
      at('16:10'),
      [
        { classId: 'A', studentId: 's1', leftAt: null },
        { classId: 'B', studentId: 's1', leftAt: null },
      ],
      enroll('A', 'B', 'C'),
    );
    expect(rows.map((r) => `${r.classId}:${r.studentId}`)).toEqual(['C:s1']);
    expect(planCarryOver(chain, at('16:10'), [], enroll('A', 'B', 'C'))).toEqual([]);
  });

  it('quien entra en B directamente la arrastra a C', () => {
    const rows = planCarryOver(
      chain,
      at('16:10'),
      [{ classId: 'B', studentId: 's2', leftAt: null }],
      enroll('A', 'B', 'C'),
    );
    expect(rows.map((r) => `${r.classId}:${r.studentId}`)).toEqual(['C:s2']);
  });
});
