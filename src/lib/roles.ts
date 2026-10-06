import { ShieldCheck, Presentation, GraduationCap, type LucideIcon } from 'lucide-react';

export type Role = 'ADMIN' | 'MENTOR' | 'STUDENT';
export type RoleVariant = 'brand' | 'admin' | 'mentor' | 'student';

interface RoleMeta {
  label: string;
  variant: RoleVariant;
  icon: LucideIcon;
}

export const ROLE_META: Record<Role, RoleMeta> = {
  ADMIN: { label: 'Administradora', variant: 'admin', icon: ShieldCheck },
  MENTOR: { label: 'Mentor / Mentora', variant: 'mentor', icon: Presentation },
  STUDENT: { label: 'Estudiante', variant: 'student', icon: GraduationCap },
};

/** Nombre corto de cada rol, para botones y avisos. */
export const ROLE_SHORT_LABEL: Record<Role, string> = {
  ADMIN: 'Administradora',
  MENTOR: 'Mentora',
  STUDENT: 'Estudiante',
};

/** Todos los roles de una cuenta: el principal y los adicionales, sin repetir. */
export function rolesOf(user: { role: Role; extraRoles?: readonly Role[] | null }): Role[] {
  return Array.from(new Set<Role>([user.role, ...(user.extraRoles ?? [])]));
}

/** Panel de inicio de cada rol. */
export const HOME_BY_ROLE: Record<Role, string> = { ADMIN: '/admin', MENTOR: '/mentor', STUDENT: '/estudiante' };

export function roleFromPathname(pathname: string): RoleVariant {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/mentor')) return 'mentor';
  if (pathname.startsWith('/estudiante')) return 'student';
  return 'brand';
}
