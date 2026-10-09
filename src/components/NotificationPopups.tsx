'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, m } from 'framer-motion';
import { X } from 'lucide-react';
import { NotificationIcon, type NotificationItem } from '@/components/NotificationBell';
import { DURATION, EASE } from '@/lib/motion';

export interface LatestNotification {
  id: string;
  type: NotificationItem['type'];
  title: string;
  body: string;
}

interface NotificationPopupsProps {
  userId: string | null;
  unread: number;
  latest: LatestNotification | null;
}

interface Popup extends LatestNotification {
  /** Cuántas notificaciones sin leer había al mostrarse. */
  count: number;
}

const MAX_POPUPS = 2;
const AUTO_HIDE_MS = 12_000;
const POPUP_KEY_PREFIX = 'popup-last:';

/** Olvida qué avisos ya se mostraron (al iniciar o cerrar sesión), para que vuelvan a salir al entrar. */
export function resetNotificationPopups() {
  try {
    for (const key of Object.keys(window.sessionStorage)) {
      if (key.startsWith(POPUP_KEY_PREFIX)) window.sessionStorage.removeItem(key);
    }
  } catch {
    // sin almacenamiento disponible: no hay nada que olvidar
  }
}

function PopupCard({ popup, onClose, onOpen }: { popup: Popup; onClose: () => void; onOpen: () => void }) {
  const [paused, setPaused] = useState(false);

  // Se oculta solo, salvo mientras se pasa el cursor o se enfoca.
  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(onClose, AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [paused, onClose]);

  const heading = popup.count > 1 ? `Tienes ${popup.count} notificaciones nuevas` : 'Nueva notificación';

  return (
    <m.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: DURATION.base, ease: EASE }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto relative rounded-2xl border border-role-accent/30 bg-white/95 shadow-lift backdrop-blur"
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-start gap-3 rounded-2xl p-3.5 pr-10 text-left transition-colors hover:bg-role-soft/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-role-accent"
      >
        <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-role-soft text-role-ink">
          <NotificationIcon type={popup.type} className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-slate-800">{heading}</span>
          <span className="block truncate text-xs font-semibold text-role-ink">{popup.title}</span>
          <span className="line-clamp-2 text-xs text-slate-600">{popup.body}</span>
          <span className="mt-1 block text-[11px] font-bold text-role-ink">Ver notificaciones →</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar este aviso"
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
      >
        <X className="h-4 w-4" />
      </button>
    </m.div>
  );
}

/**
 * Avisos emergentes de notificaciones nuevas: al entrar a la plataforma (si hay sin leer) y cuando llega una mientras
 * se navega. Se pueden pulsar para ir a /notificaciones. No se repiten en cada página: se recuerda el último mostrado.
 */
export function NotificationPopups({ userId, unread, latest }: NotificationPopupsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [popups, setPopups] = useState<Popup[]>([]);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    if (!userId || !latest || unread === 0) return;
    const key = `${POPUP_KEY_PREFIX}${userId}`;
    try {
      if (window.sessionStorage.getItem(key) === latest.id) return;
      window.sessionStorage.setItem(key, latest.id);
    } catch {
      // sin almacenamiento: podría repetirse el aviso al cambiar de página, pero se muestra
    }
    // Si ya está leyendo las notificaciones, no hace falta avisarle.
    if (pathRef.current.startsWith('/notificaciones')) return;
    setPopups((prev) => [{ ...latest, count: unread }, ...prev.filter((p) => p.id !== latest.id)].slice(0, MAX_POPUPS));
  }, [userId, unread, latest]);

  const close = useCallback((id: string) => setPopups((prev) => prev.filter((p) => p.id !== id)), []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed left-4 right-4 top-[max(4.75rem,env(safe-area-inset-top))] z-toast flex flex-col gap-2 sm:left-auto sm:w-96"
    >
      <AnimatePresence>
        {popups.map((popup) => (
          <PopupCard
            key={popup.id}
            popup={popup}
            onClose={() => close(popup.id)}
            onOpen={() => {
              close(popup.id);
              router.push('/notificaciones');
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
