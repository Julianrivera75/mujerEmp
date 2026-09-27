import { randomInt } from 'node:crypto';

/** Contraseña inicial: el número de estudiante sin guiones ni espacios; sin número, 9 dígitos al azar. */
export function initialPassword(studentNumber: string | null, role: string): string {
  const fromNumber = role === 'STUDENT' ? (studentNumber ?? '').replace(/[^A-Za-z0-9]/g, '') : '';
  return fromNumber.length >= 8 ? fromNumber : String(randomInt(100_000_000, 1_000_000_000));
}
