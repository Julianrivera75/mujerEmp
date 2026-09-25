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

export function roleFromPathname(pathname: string): RoleVariant {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/mentor')) return 'mentor';
  if (pathname.startsWith('/estudiante')) return 'student';
  return 'brand';
}
