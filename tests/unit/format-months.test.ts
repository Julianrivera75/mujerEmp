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
  it('monthKeyOf usa el formato AAAA-MM', () => {
    expect(monthKeyOf(new Date(2026, 0, 31))).toBe('2026-01');
    expect(monthKeyOf(new Date(2026, 11, 1))).toBe('2026-12');
  });

  it('monthOptions cubre el rango pedido, cruza años y marca el mes actual', () => {
    const options = monthOptions(new Date(2026, 10, 15), 2, 3);
    expect(options.map((o) => o.value)).toEqual(['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02']);
    expect(options.filter((o) => o.current).map((o) => o.value)).toEqual(['2026-11']);
    expect(options[0].label).toMatch(/^Septiembre/);
  });

  it('localInputValue produce el valor de un datetime-local', () => {
    expect(localInputValue(new Date(2026, 8, 5, 7, 3))).toBe('2026-09-05T07:03');
  });
});
