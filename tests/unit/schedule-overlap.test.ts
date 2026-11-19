import { describe, expect, it } from 'vitest';
import { bogotaDayRangeUtc, findMentorOverlaps, overlaps, type OverlapCandidate } from '@/lib/schedule-overlap';

const at = (hhmm: string, day = '2026-10-05') => new Date(`${day}T${hhmm}:00Z`);

describe('overlaps', () => {
  it('detecta un cruce parcial', () => {
    expect(overlaps(at('09:00'), at('10:00'), at('09:30'), at('10:30'))).toBe(true);
  });

  it('detecta el mismo horario', () => {
    expect(overlaps(at('09:00'), at('10:00'), at('09:00'), at('10:00'))).toBe(true);
  });

  it('un intervalo que contiene al otro sí se cruza', () => {
    expect(overlaps(at('09:00'), at('12:00'), at('10:00'), at('11:00'))).toBe(true);
  });

  it('back-to-back, justo tocándose, no se cruza', () => {
    expect(overlaps(at('09:00'), at('10:00'), at('10:00'), at('11:00'))).toBe(false);
  });

  it('sin relación en el tiempo no se cruza', () => {
    expect(overlaps(at('09:00'), at('10:00'), at('11:00'), at('12:00'))).toBe(false);
  });
});

describe('bogotaDayRangeUtc', () => {
  it('devuelve el rango UTC de 24 horas de un día de Bogotá (UTC-5)', () => {
    const [start, end] = bogotaDayRangeUtc('2026-10-05');
    expect(start.toISOString()).toBe('2026-10-05T05:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-06T05:00:00.000Z');
  });
});

describe('findMentorOverlaps', () => {
  const base = (id: string, mentorId: string, mentorName: string, start: string, end: string): OverlapCandidate => ({
    mentorId,
    mentorName,
    title: `Clase ${id}`,
    dateStart: at(start),
    dateEnd: at(end),
  });

  it('la misma mentora en dos horarios sin cruce no genera aviso', () => {
    const classes = [base('A', 'm1', 'Carolina', '09:00', '10:00'), base('B', 'm1', 'Carolina', '10:00', '11:00')];
    expect(findMentorOverlaps(classes)).toEqual([]);
  });

  it('la misma mentora con horarios cruzados genera un aviso con ambos títulos', () => {
    const classes = [base('A', 'm1', 'Carolina', '09:00', '10:00'), base('B', 'm1', 'Carolina', '09:30', '10:30')];
    const warnings = findMentorOverlaps(classes);
    expect(warnings).toEqual([
      { mentorId: 'm1', mentorName: 'Carolina', classATitle: 'Clase A', classBTitle: 'Clase B' },
    ]);
  });

  it('mentoras distintas que se cruzan en el tiempo no generan aviso', () => {
    const classes = [base('A', 'm1', 'Carolina', '09:00', '10:00'), base('B', 'm2', 'Valeria', '09:30', '10:30')];
    expect(findMentorOverlaps(classes)).toEqual([]);
  });

  it('con tres clases, solo el par que se cruza genera un aviso', () => {
    const classes = [
      base('A', 'm1', 'Carolina', '09:00', '10:00'),
      base('B', 'm1', 'Carolina', '09:30', '10:30'),
      base('C', 'm1', 'Carolina', '11:00', '12:00'),
    ];
    const warnings = findMentorOverlaps(classes);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ classATitle: 'Clase A', classBTitle: 'Clase B' });
  });
});
