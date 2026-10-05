'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { ResponsiveTable } from '@/components/ui/Table';
import { StatusPill } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { formatDayMonthTime } from '@/lib/format';
import { logClientError } from '@/lib/client-log';

interface MentorAttendanceLog {
  id: string;
  joinedAt: string;
  source?: 'CLICK' | 'CARRY';
  student: { id: string; name: string; email: string };
  classSession: { id: string; title: string; dateStart: string; meetLink: string | null };
}

export default function MentorAttendancesPage() {
  const [attendances, setAttendances] = useState<MentorAttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/attendances');
        const data = await res.json();
        setAttendances(data.attendances || []);
      } catch (err) {
        logClientError('Error cargando asistencias del mentor:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Asistencia"
        title="Asistencia de estudiantes a mis clases"
        description="Registro cronológico de las estudiantes que hicieron clic en el enlace de Google Meet de tus sesiones."
      />

      <Card variant="glass" className="p-4 sm:p-6">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : attendances.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Aún no hay registros de asistencia a tus clases" />
        ) : (
          <ResponsiveTable
            caption="Asistencias de las estudiantes a mis clases"
            rows={attendances}
            rowKey={(log) => log.id}
            columns={[
              {
                header: 'Estudiante',
                primary: true,
                cell: (log) => (
                  <>
                    <p className="font-bold text-slate-800">{log.student.name}</p>
                    <p className="text-[11px] font-normal text-slate-500">{log.student.email}</p>
                  </>
                ),
              },
              {
                header: 'Clase / sesión',
                cell: (log) => <span className="font-semibold text-slate-700">{log.classSession.title}</span>,
              },
              {
                header: 'Fecha y hora de clic',
                cell: (log) => (
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                    <Clock className="h-3.5 w-3.5 text-role-ink" />
                    {formatDayMonthTime(new Date(log.joinedAt))}
                  </span>
                ),
              },
              {
                header: 'Estado',
                align: 'center',
                cell: (log) => (
                  <StatusPill label={log.source === 'CARRY' ? 'Conectada (automática)' : 'Conectada'} tone="success" />
                ),
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
