'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, ClipboardCheck, ClipboardList, Clock, Inbox, MessageCircle } from 'lucide-react';
import { useActivity } from '@/components/ActivityProvider';
import { useNotificationOpener } from '@/components/useNotificationOpener';
import { formatDayMonthTime } from '@/lib/format';
import { logClientError } from '@/lib/client-log';
import { cn } from '@/lib/cn';

export interface NotificationItem {
  id: string;
  type: 'NEW_ASSIGNMENT' | 'ASSIGNMENT_DUE_SOON' | 'SUBMISSION_RECEIVED' | 'SUBMISSION_GRADED' | 'NEW_MESSAGE';
  title: string;
  body: string;
  href: string;
  createdAt: string;
  readAt: string | null;
}

const ICONS = {
  NEW_ASSIGNMENT: ClipboardList,
  ASSIGNMENT_DUE_SOON: Clock,
  SUBMISSION_RECEIVED: Inbox,
  SUBMISSION_GRADED: ClipboardCheck,
  NEW_MESSAGE: MessageCircle,
} as const;

export function NotificationIcon({ type, className }: { type: NotificationItem['type']; className?: string }) {
  const Icon = ICONS[type];
  return <Icon className={className} strokeWidth={1.75} />;
}

/** Campana con el contador de avisos sin leer y un menú con los más recientes. */
export function NotificationBell() {
  const { unreadNotifications, unreadMessages, refresh } = useActivity();
  const openNotification = useNotificationOpener();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=10');
      const data = await res.json();
      setItems(data.notifications ?? []);
    } catch (err) {
      logClientError('Error cargando notificaciones:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const markAll = async () => {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    }).catch(() => undefined);
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    void refresh();
  };

  const total = unreadNotifications;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={total > 0 ? `Notificaciones: ${total} sin leer` : 'Notificaciones'}
        className="tap-target relative rounded-xl p-2 text-slate-600 transition-colors hover:bg-role-soft hover:text-role-ink"
      >
        <Bell className="h-5 w-5" strokeWidth={1.75} />
        {total > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="glass-panel absolute right-0 z-nav mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/60 p-2 shadow-lift"
        >
          <div className="flex items-center justify-between px-2 pb-2 pt-1">
            <p className="text-sm font-bold text-slate-800">Notificaciones</p>
            {total > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="flex items-center gap-1 text-xs font-bold text-role-ink hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Marcar todas</span>
              </button>
            )}
          </div>

          {unreadMessages > 0 && !items.some((n) => n.type === 'NEW_MESSAGE' && !n.readAt) && (
            <Link
              href="/chat"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="mb-1 flex items-center justify-between rounded-xl bg-role-soft px-3 py-2 text-xs font-semibold text-role-ink"
            >
              <span>
                {unreadMessages} mensaje{unreadMessages === 1 ? '' : 's'} sin leer en el chat
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          )}

          <div className="max-h-80 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="p-3 text-center text-xs text-slate-500">Cargando...</p>
            ) : items.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-500">No tienes notificaciones.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    void openNotification(n);
                  }}
                  className={cn(
                    'flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-role-soft',
                    !n.readAt && 'bg-role-soft/60',
                  )}
                >
                  <NotificationIcon type={n.type} className="mt-0.5 h-4 w-4 flex-shrink-0 text-role-ink" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      {n.title}
                      {!n.readAt && <span aria-label="sin leer" className="h-1.5 w-1.5 rounded-full bg-rose-600" />}
                    </span>
                    <span className="block truncate text-xs text-slate-600">{n.body}</span>
                    <span className="block text-[11px] text-slate-500">{formatDayMonthTime(n.createdAt)}</span>
                  </span>
                </button>
              ))
            )}
          </div>

          <Link
            href="/notificaciones"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mt-1 block rounded-xl px-3 py-2 text-center text-xs font-bold text-role-ink hover:bg-role-soft"
          >
            Ver todas
          </Link>
        </div>
      )}
    </div>
  );
}
