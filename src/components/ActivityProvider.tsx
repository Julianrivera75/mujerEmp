'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface ActivityState {
  unreadNotifications: number;
  unreadMessages: number;
  /** Consulta de inmediato los contadores (por ejemplo, tras leer un mensaje o una notificación). */
  refresh: () => Promise<void>;
}

const ActivityContext = createContext<ActivityState>({
  unreadNotifications: 0,
  unreadMessages: 0,
  refresh: async () => undefined,
});

const HEARTBEAT_MS = 30_000;

/**
 * Envía el latido de actividad cada 30 segundos mientras la pestaña está visible (así se sabe quién está en línea)
 * y mantiene al día los contadores de notificaciones y mensajes sin leer que muestra la barra.
 */
export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = useState({ unreadNotifications: 0, unreadMessages: 0 });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/activity', { method: 'POST' });
      if (!res.ok) return;
      const data = await res.json();
      setCounts({ unreadNotifications: data.unreadNotifications ?? 0, unreadMessages: data.unreadMessages ?? 0 });
    } catch {
      // Sin conexión: se reintenta en el siguiente latido.
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, HEARTBEAT_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  const value = useMemo(() => ({ ...counts, refresh }), [counts, refresh]);
  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
}

export const useActivity = () => useContext(ActivityContext);
