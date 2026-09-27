'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useActivity } from '@/components/ActivityProvider';
import { NotificationIcon, type NotificationItem } from '@/components/NotificationBell';
import { useNotificationOpener } from '@/components/useNotificationOpener';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { logClientError } from '@/lib/client-log';
import { formatDayMonthTime } from '@/lib/format';

export default function NotificationsPage() {
  const { refresh } = useActivity();
  const openNotification = useNotificationOpener();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=100');
      const data = await res.json();
      setItems(data.notifications ?? []);
    } catch (err) {
      logClientError('Error cargando notificaciones:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markAll = async () => {
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    }).catch(() => undefined);
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    void refresh();
  };

  const unread = items.filter((n) => !n.readAt).length;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 font-display text-2xl font-bold text-slate-800 sm:text-3xl">
            <Bell className="h-7 w-7 text-role-ink" />
            <span>Notificaciones</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tareas nuevas, entregas, calificaciones y tareas por vencer. Pulsa una para ir a su lugar.
          </p>
        </div>
        {unread > 0 && (
          <Button variant="secondary" size="sm" leftIcon={<CheckCheck className="h-4 w-4" />} onClick={markAll}>
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {loading ? (
        <SkeletonCard />
      ) : items.length === 0 ? (
        <div className="glass-card rounded-3xl border border-white/70">
          <EmptyState
            icon={Bell}
            title="No tienes notificaciones"
            description="Cuando haya una tarea nueva, una entrega, una calificación o algo por vencer, aparecerá aquí."
          />
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => void openNotification(n)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors hover:border-role-accent/40',
                  n.readAt ? 'border-slate-100 bg-white' : 'border-role-accent/30 bg-role-soft/60',
                )}
              >
                <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-role-soft text-role-ink">
                  <NotificationIcon type={n.type} className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    {n.title}
                    {!n.readAt && <span aria-label="sin leer" className="h-2 w-2 rounded-full bg-rose-600" />}
                  </span>
                  <span className="block text-sm text-slate-600">{n.body}</span>
                  <span className="mt-1 block text-xs text-slate-500">{formatDayMonthTime(n.createdAt)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
