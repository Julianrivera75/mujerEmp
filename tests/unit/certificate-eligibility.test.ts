import { describe, expect, it } from 'vitest';
import { meetsRule, moduleStatus } from '@/lib/certificate-eligibility';

describe('meetsRule', () => {
  it('MIN_ATTENDANCE_PERCENT exige el porcentaje mínimo sobre los días con charlas', () => {
    const rule = { ruleType: 'MIN_ATTENDANCE_PERCENT' as const, threshold: 80 };
    expect(meetsRule(rule, 4, 5)).toBe(true); // 80 %
    expect(meetsRule(rule, 3, 5)).toBe(false); // 60 %
  });

  it('MIN_ATTENDED_DAYS exige una cantidad mínima de días, sin importar el porcentaje', () => {
    const rule = { ruleType: 'MIN_ATTENDED_DAYS' as const, threshold: 1 };
    expect(meetsRule(rule, 1, 10)).toBe(true); // 10 %, pero ya asistió al día mínimo
    expect(meetsRule(rule, 0, 10)).toBe(false);
  });
});

describe('moduleStatus', () => {
  const inWindow = new Date(2026, 9, 28, 10);
  const percentRule = { ruleType: 'MIN_ATTENDANCE_PERCENT' as const, threshold: 80 };
  const oneDayRule = { ruleType: 'MIN_ATTENDED_DAYS' as const, threshold: 1 };

  it('está bloqueado antes de la ventana, aunque tenga asistencia completa', () => {
    expect(moduleStatus('2026-10', new Date(2026, 9, 26, 23, 59), 4, 4, percentRule)).toBe('locked');
    expect(moduleStatus('2026-10', new Date(2026, 8, 25), 4, 4, percentRule)).toBe('locked');
  });

  it('se habilita desde el primer instante de la ventana y sigue disponible después', () => {
    expect(moduleStatus('2026-10', new Date(2026, 9, 27, 0, 0), 4, 4, percentRule)).toBe('available');
    expect(moduleStatus('2026-10', new Date(2027, 5, 1), 4, 4, percentRule)).toBe('available');
  });

  it('con regla de porcentaje, exige el umbral configurado', () => {
    expect(moduleStatus('2026-10', inWindow, 4, 5, percentRule)).toBe('available'); // 80 %
    expect(moduleStatus('2026-10', inWindow, 3, 5, percentRule)).toBe('low-attendance'); // 60 %
    expect(moduleStatus('2026-10', inWindow, 0, 4, percentRule)).toBe('low-attendance');
  });

  it('con regla de días mínimos (excepción del Módulo 1), basta con un día presente', () => {
    expect(moduleStatus('2026-10', inWindow, 1, 10, oneDayRule)).toBe('available');
    expect(moduleStatus('2026-10', inWindow, 0, 10, oneDayRule)).toBe('low-attendance');
  });

  it('sin clases en el módulo no hay certificado, sin importar la regla', () => {
    expect(moduleStatus('2026-10', inWindow, 0, 0, percentRule)).toBe('no-classes');
    expect(moduleStatus('2026-10', inWindow, 0, 0, oneDayRule)).toBe('no-classes');
  });
});
