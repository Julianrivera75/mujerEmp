import { describe, expect, it } from 'vitest';
import { formatDate, formatDue, formatTime, formatTimeRange, formatWeekdayDate } from '@/lib/format';
import { localInputValue, monthKeyOf, monthOptions } from '@/lib/months';

describe('format', () => {
  const date = new Date(2026, 8, 25, 15, 5);

  it('da formato a fechas y horas en español', () => {
    expect(formatDate(date)).toBe('25/9/2026');
    expect(formatWeekdayDate(date)).toContain('septiembre');
    expect(formatTime(date)).toMatch(/^0?3:05/);
    expect(formatDue(date)).toContain('septiembre');
  });

  it('acepta cadenas ISO y arma el rango horario', () => {
    expect(formatDate(date.toISOString())).toBe(formatDate(date));
    expect(formatTimeRange(date, new Date(2026, 8, 25, 17, 0))).toContain(' - ');
  });
});

describe('months', () => {
  it('monthKeyOf usa el formato AAAA-MM en la zona horaria de la organización', () => {
    expect(monthKeyOf(new Date('2026-01-15T12:00:00Z'))).toBe('2026-01');
    expect(monthKeyOf(new Date('2026-12-01T12:00:00Z'))).toBe('2026-12');
  });

  it('una clase a última hora del mes en Miami cae en ese mes aunque en UTC ya sea el siguiente', () => {
    // 30 de septiembre, 8:00 p. m. en Miami (UTC-4) = 1 de octubre 00:00 UTC
    const lateEvening = new Date('2026-10-01T00:00:00Z');
    expect(monthKeyOf(lateEvening)).toBe('2026-09');
    expect(monthKeyOf(lateEvening, 'UTC')).toBe('2026-10');
    // invierno (UTC-5): 31 de diciembre, 7:30 p. m. = 1 de enero 00:30 UTC
    expect(monthKeyOf(new Date('2027-01-01T00:30:00Z'))).toBe('2026-12');
  });

  it('monthOptions cubre el rango pedido, cruza años y marca el mes actual', () => {
    const options = monthOptions(new Date('2026-11-15T12:00:00Z'), 2, 3);
    expect(options.map((o) => o.value)).toEqual(['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02']);
    expect(options.filter((o) => o.current).map((o) => o.value)).toEqual(['2026-11']);
    expect(options[0].label).toMatch(/^Septiembre/);
  });

  it('localInputValue produce el valor de un datetime-local', () => {
    expect(localInputValue(new Date(2026, 8, 5, 7, 3))).toBe('2026-09-05T07:03');
  });
});
