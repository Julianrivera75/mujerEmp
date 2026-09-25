import type { TokenPayload } from '@/lib/auth';

/** Usuaria "conectada" para las pruebas de la API. null equivale a una persona anónima. */
export const session: { current: TokenPayload | null } = { current: null };

export function actAs(user: { id: string; email: string; name: string; role: TokenPayload['role'] } | null) {
  session.current = user ? { ...user, status: 'ACTIVO' } : null;
}
