'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Flag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { useActivity } from '@/components/ActivityProvider';
import { logClientError } from '@/lib/client-log';
import { formatDayMonthTime } from '@/lib/format';

interface Report {
  id: string;
  messageBody: string;
  reason: string;
  createdAt: string;
  reviewedAt: string | null;
  reporter: { id: string; name: string };
  reported: { id: string; name: string };
}

/** Mensajes del chat que las personas reportaron, con una copia del texto y el motivo. */
export default function ReportesPage() {
  const { show } = useToast();
  const { refresh } = useActivity();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/reports');
      const data = await res.json();
      setReports(data.reports ?? []);
    } catch (err) {
      logClientError('Error cargando reportes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markReviewed = async (id: string) => {
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        show('error', 'No se pudo marcar el reporte como revisado.');
        return;
      }
      await load();
      void refresh();
    } catch (err) {
      logClientError('Error marcando el reporte:', err);
      show('error', 'Error de conexión.');
    }
  };

  const pending = reports.filter((r) => !r.reviewedAt).length;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Chat"
        title="Mensajes reportados"
        description="Revisa los mensajes que las personas reportaron. Solo la administración los ve."
      />

      {loading ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="No hay reportes"
          description="Cuando alguien reporte un mensaje, aparecerá aquí."
        />
      ) : (
        <>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600" aria-live="polite">
            {pending} {pending === 1 ? 'pendiente' : 'pendientes'}
          </p>
          <ul className="space-y-3">
            {reports.map((r) => (
              <li key={r.id} className="space-y-3 rounded-2xl border border-white/70 bg-white/85 p-4 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    <strong className="text-slate-800">{r.reporter.name}</strong> reportó un mensaje de{' '}
                    <strong className="text-slate-800">{r.reported.name}</strong>
                  </span>
                  <span>{formatDayMonthTime(r.createdAt)}</span>
                </div>
                <blockquote className="whitespace-pre-wrap break-words rounded-xl bg-slate-100 px-3.5 py-2.5 text-sm text-slate-800">
                  {r.messageBody || 'Mensaje sin texto'}
                </blockquote>
                <p className="text-xs text-slate-700">
                  <span className="font-bold">Motivo:</span> {r.reason}
                </p>
                <div className="flex items-center justify-end">
                  {r.reviewedAt ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Revisado {formatDayMonthTime(r.reviewedAt)}
                    </span>
                  ) : (
                    <Button size="sm" onClick={() => void markReviewed(r.id)}>
                      Marcar como revisado
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
