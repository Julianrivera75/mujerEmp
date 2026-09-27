import type { TokenPayload } from '@/lib/auth';

/** Usuaria "conectada" para las pruebas de la API. null equivale a una persona anónima. */
export const session: { current: TokenPayload | null } = { current: null };

export function actAs(
  user: {
    id: string;
    email: string;
    name: string;
    role: TokenPayload['role'];
    roles?: TokenPayload['roles'];
    mustChangePassword?: boolean;
    pwdSkip?: boolean;
  } | null,
) {
  session.current = user
    ? {
        ...user,
        roles: user.roles ?? [user.role],
        mustChangePassword: user.mustChangePassword ?? false,
        pwdSkip: user.pwdSkip ?? false,
        status: 'ACTIVO',
      }
    : null;
}
