'use client';

import React, { createContext, useContext } from 'react';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MENTOR' | 'STUDENT';
  status: 'ACTIVO' | 'INACTIVO';
  phone?: string | null;
  documentId?: string | null;
  avatar?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

const UserContext = createContext<SessionUser | null>(null);

export function UserProvider({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

/** Usuario de sesión ya resuelto por el layout del segmento (sin volver a pedir /api/auth/me). */
export function useSessionUser(): SessionUser {
  const user = useContext(UserContext);
  if (!user) {
    throw new Error('useSessionUser debe usarse dentro de un layout de segmento (admin/mentor/estudiante).');
  }
  return user;
}
