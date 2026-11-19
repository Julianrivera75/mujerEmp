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

/** Autorización o bloqueo manual del certificado de este módulo para esta estudiante, si existe una activa. */
export type CertificateOverrideAction = 'AUTHORIZED' | 'BLOCKED';

/**
 * Estado del certificado de un módulo: se habilita al entrar en la ventana final del mes
 * y exige que la asistencia cumpla la regla configurada para ese módulo.
 *
 * `exempt` ("Madrina", ya pagó su cupo) tiene los 5 certificados disponibles desde el día uno,
 * sin importar la fecha, el mes del módulo ni la asistencia — bypass total y permanente. La única
 * excepción es un `override` `BLOCKED` puntual de admin, que bloquea igual a una estudiante exenta.
 *
 * Para una estudiante NO exenta, `override` manda sobre la regla de asistencia (`AUTHORIZED` la
 * salta, `BLOCKED` bloquea aunque cumpla la regla) pero nunca adelanta la fecha: antes de la
 * ventana de certificación el módulo sigue `locked` sin importar el override.
 */
export function moduleStatus(
  monthKey: string,
  now: Date,
  attended: number,
  total: number,
  rule: CertificateRule,
  exempt = false,
  override?: CertificateOverrideAction,
): ModuleStatus {
  if (exempt) return override === 'BLOCKED' ? 'blocked' : 'available';
  if (now < certificateOpensAt(monthKey)) return 'locked';
  if (override === 'BLOCKED') return 'blocked';
  if (override === 'AUTHORIZED') return 'available';
  if (total === 0) return 'no-classes';
  if (!meetsRule(rule, attended, total)) return 'low-attendance';
  return 'available';
}
