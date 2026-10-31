import { attendancePercentage, certificateOpensAt, type ModuleStatus } from './modules';
import type { CERTIFICATE_RULE_TYPES } from './validators';

/**
 * Regla de elegibilidad de un módulo: porcentaje mínimo de días con asistencia, o una cantidad
 * mínima de días (la excepción del Módulo 1: basta con 1). Editable por módulo desde admin.
 */
export interface CertificateRule {
  ruleType: (typeof CERTIFICATE_RULE_TYPES)[number];
  threshold: number;
}

/** ¿La asistencia de la estudiante en el módulo cumple la regla configurada? */
export function meetsRule(rule: CertificateRule, attended: number, total: number): boolean {
  if (rule.ruleType === 'MIN_ATTENDED_DAYS') return attended >= rule.threshold;
  return attendancePercentage(attended, total) >= rule.threshold;
}

/**
 * Estado del certificado de un módulo: se habilita al entrar en la ventana final del mes
 * y exige que la asistencia cumpla la regla configurada para ese módulo.
 */
export function moduleStatus(
  monthKey: string,
  now: Date,
  attended: number,
  total: number,
  rule: CertificateRule,
): ModuleStatus {
  if (now < certificateOpensAt(monthKey)) return 'locked';
  if (total === 0) return 'no-classes';
  if (!meetsRule(rule, attended, total)) return 'low-attendance';
  return 'available';
}
