'use client';

import { useCallback } from 'react';
import { useActivity } from '@/components/ActivityProvider';
import { isInternalHref, roleForHref } from '@/lib/notification-nav';
import { useSessionUser } from '@/lib/user-context';
import { logClientError } from '@/lib/client-log';

/**
 * Devuelve la acción de abrir una notificación: la marca como leída y lleva a su lugar. Si la ruta pertenece a otro
 * rol de la cuenta (por ejemplo, una tarea vista desde la vista de mentor), cambia de vista antes de navegar.
 */
export function useNotificationOpener() {
  const user = useSessionUser();
  const { refresh } = useActivity();

  return useCallback(
    async (notification: { id: string; href: string; readAt?: string | null }) => {
      try {
        if (!notification.readAt) {
          await fetch('/api/notifications/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: notification.id }),
          });
          void refresh();
        }

        const target = isInternalHref(notification.href) ? notification.href : '/';
        const needed = roleForHref(target);
        if (needed && needed !== user.role && user.roles.includes(needed)) {
          await fetch('/api/auth/switch-role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: needed }),
          });
        }
        // Recarga completa: la vista, el menú y los permisos se calculan de nuevo con el rol correcto.
        window.location.assign(target);
      } catch (err) {
        logClientError('Error abriendo la notificación:', err);
      }
    },
    [refresh, user.role, user.roles],
  );
}
