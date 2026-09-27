import { formatDayMonthShort } from './format';

/** Una persona figura "en línea" si envió un latido en los últimos 2 minutos. */
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export interface Presence {
  online: boolean;
  /** Texto para mostrar; null cuando no se puede mostrar (estado oculto o sin actividad registrada). */
  label: string | null;
}

const HIDDEN: Presence = { online: false, label: null };

/** Estado de presencia de una persona a partir de su última actividad. `visible` es false si ocultó su estado. */
export function presenceOf(lastSeenAt: Date | string | null | undefined, visible: boolean, now = new Date()): Presence {
  if (!visible || !lastSeenAt) return HIDDEN;
  const seen = new Date(lastSeenAt);
  const elapsed = now.getTime() - seen.getTime();
  if (Number.isNaN(elapsed)) return HIDDEN;
  if (elapsed <= ONLINE_WINDOW_MS) return { online: true, label: 'En línea' };

  const minutes = Math.round(elapsed / 60_000);
  if (minutes < 60) return { online: false, label: `Activa hace ${minutes} min` };
  const hours = Math.round(minutes / 60);
  if (hours < 24) return { online: false, label: `Activa hace ${hours} h` };
  if (hours < 48) return { online: false, label: 'Activa ayer' };
  return { online: false, label: `Activa el ${formatDayMonthShort(seen)}` };
}

/**
 * Presencia que ve `viewer` de `target`: quien oculta su estado no lo muestra, y quien lo oculta tampoco ve el de
 * las demás (reciprocidad). La administración siempre lo ve.
 */
export function presenceForViewer(
  viewer: { isAdmin: boolean; showOnlineStatus: boolean },
  target: { lastSeenAt: Date | string | null; showOnlineStatus: boolean },
  now = new Date(),
): Presence {
  if (viewer.isAdmin) return presenceOf(target.lastSeenAt, true, now);
  return presenceOf(target.lastSeenAt, target.showOnlineStatus && viewer.showOnlineStatus, now);
}
