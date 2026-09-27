import type { Role } from './roles';

/** Tipos de cuenta que la administración elige al crear o editar una persona. */
export const ACCOUNT_TYPES = [
  { value: 'STUDENT', label: 'Estudiante', role: 'STUDENT', extraRoles: [] },
  { value: 'MENTOR', label: 'Mentor / Mentora', role: 'MENTOR', extraRoles: [] },
  { value: 'MENTOR_STUDENT', label: 'Mentor / Mentora y estudiante', role: 'MENTOR', extraRoles: ['STUDENT'] },
  { value: 'ADMIN', label: 'Administrador', role: 'ADMIN', extraRoles: [] },
] as const satisfies readonly { value: string; label: string; role: Role; extraRoles: readonly Role[] }[];

export type AccountTypeValue = (typeof ACCOUNT_TYPES)[number]['value'];

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((r) => b.includes(r));

/** Tipo de cuenta que corresponde a un rol principal y sus roles adicionales; `CUSTOM` si no es uno de los cuatro. */
export function accountTypeOf(role: string, extraRoles: readonly string[]): AccountTypeValue | 'CUSTOM' {
  const found = ACCOUNT_TYPES.find((t) => t.role === role && sameSet(t.extraRoles, extraRoles));
  return found ? found.value : 'CUSTOM';
}

/** La cuenta cumple funciones de estudiante (rol principal o adicional). */
export const isStudentAccount = (role: string, extraRoles: readonly string[]) =>
  role === 'STUDENT' || extraRoles.includes('STUDENT');
