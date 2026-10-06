import { logClientError } from './client-log';
import type { Role } from './roles';

/** Cambia la vista activa de una cuenta con más de un rol y recarga el panel de esa vista. */
export async function switchRole(role: Role): Promise<void> {
  try {
    const res = await fetch('/api/auth/switch-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (res.ok) {
      // Recarga completa para que el panel, el menú y los permisos se calculen con la vista nueva.
      window.location.assign(data.redirectUrl || '/');
    }
  } catch (err) {
    logClientError('Error cambiando de vista:', err);
  }
}
