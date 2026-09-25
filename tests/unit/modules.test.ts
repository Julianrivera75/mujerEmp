import { describe, expect, it } from 'vitest';
import { CERTIFICATE_MODULES, attendancePercentage, certificateOpensAt, moduleStatus } from '@/lib/modules';

describe('certificateOpensAt', () => {
  it('abre en los últimos 5 días del mes del módulo', () => {
    expect(certificateOpensAt('2026-10')).toEqual(new Date(2026, 9, 27)); // 27 al 31 de octubre
    expect(certificateOpensAt('2026-11')).toEqual(new Date(2026, 10, 26)); // noviembre tiene 30 días
    expect(certificateOpensAt('2027-02')).toEqual(new Date(2027, 1, 24)); // febrero de 2027 tiene 28 días
  });
});

describe('moduleStatus', () => {
  const inWindow = new Date(2026, 9, 28, 10);

  it('está bloqueado antes de la ventana, aunque tenga asistencia completa', () => {
    expect(moduleStatus('2026-10', new Date(2026, 9, 26, 23, 59), 4, 4)).toBe('locked');
    expect(moduleStatus('2026-10', new Date(2026, 8, 25), 4, 4)).toBe('locked');
  });

  it('se habilita desde el primer instante de la ventana y sigue disponible después', () => {
    expect(moduleStatus('2026-10', new Date(2026, 9, 27, 0, 0), 4, 4)).toBe('available');
    expect(moduleStatus('2026-10', new Date(2027, 5, 1), 4, 4)).toBe('available');
  });

  it('exige el 80 % de asistencia', () => {
    expect(moduleStatus('2026-10', inWindow, 4, 5)).toBe('available'); // 80 %
    expect(moduleStatus('2026-10', inWindow, 3, 5)).toBe('low-attendance'); // 60 %
    expect(moduleStatus('2026-10', inWindow, 0, 4)).toBe('low-attendance');
  });

  it('sin clases en el módulo no hay certificado', () => {
    expect(moduleStatus('2026-10', inWindow, 0, 0)).toBe('no-classes');
  });
});

describe('attendancePercentage', () => {
  it('redondea y evita dividir entre cero', () => {
    expect(attendancePercentage(2, 3)).toBe(67);
    expect(attendancePercentage(0, 0)).toBe(0);
  });
});

describe('CERTIFICATE_MODULES', () => {
  it('son cinco módulos mensuales consecutivos, de octubre de 2026 a febrero de 2027', () => {
    expect(CERTIFICATE_MODULES.map((m) => m.monthKey)).toEqual(['2026-10', '2026-11', '2026-12', '2027-01', '2027-02']);
    expect(CERTIFICATE_MODULES.map((m) => m.number)).toEqual([1, 2, 3, 4, 5]);
  });

  it('cada módulo tiene su arte y líneas válidas', () => {
    for (const m of CERTIFICATE_MODULES) {
      expect(m.art).toBe(`/certificados/modulo-${m.number}.jpg`);
      expect(m.name.x2).toBeGreaterThan(m.name.x1);
      expect(m.studentNumber.x2).toBeGreaterThan(m.studentNumber.x1);
      expect(m.studentNumber.y).toBeGreaterThan(m.name.y);
    }
  });
});
