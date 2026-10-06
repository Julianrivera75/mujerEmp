'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { ResponsiveTable } from '@/components/ui/Table';
import { StatusPill } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { formatTime, formatWeekdayDate } from '@/lib/format';
import { logClientError } from '@/lib/client-log';

interface DayRow {
  studentId: string;
  name: string;
  email: string;
  day: string;
  firstJoinedAt: string | null;
  classesAttended: number;
  classesInDay: number;
}

/** El día viene como AAAA-MM-DD en hora de Colombia; se muestra a mediodía para que ninguna zona lo mueva de fecha. */
const dayDate = (day: string) => new Date(`${day}T12:00:00-05:00`);

export default function MentorAttendancesPage() {
  const [days, setDays] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/attendances');
        const data = await res.json();
        setDays(data.days || []);
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
        description="Una estudiante está presente un día si entró al menos a una de tus charlas de ese día. Aquí ves un registro por estudiante y día."
      />

      <Card variant="glass" className="p-4 sm:p-6">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : days.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Aún no hay registros de asistencia a tus clases" />
        ) : (
          <ResponsiveTable
            caption="Asistencia de las estudiantes a mis clases por día"
            rows={days}
            rowKey={(d) => `${d.studentId}-${d.day}`}
            columns={[
              {
                header: 'Estudiante',
                primary: true,
                cell: (d) => (
                  <>
                    <p className="font-bold text-slate-800">{d.name}</p>
                    <p className="text-[11px] font-normal text-slate-500">{d.email}</p>
                  </>
                ),
              },
              {
                header: 'Día',
                cell: (d) => (
                  <span className="font-semibold text-slate-700 first-letter:uppercase">
                    {formatWeekdayDate(dayDate(d.day))}
                  </span>
                ),
              },
              {
                header: 'Charlas a las que entró',
                cell: (d) => (
                  <span className="font-medium text-slate-600">
                    {d.classesAttended} de {d.classesInDay}
                  </span>
                ),
              },
              {
                header: 'Primer ingreso',
                cell: (d) => (
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                    <Clock className="h-3.5 w-3.5 text-role-ink" />
                    {d.firstJoinedAt ? formatTime(d.firstJoinedAt) : '—'}
                  </span>
                ),
              },
              { header: 'Estado', align: 'center', cell: () => <StatusPill label="Presente" tone="success" /> },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
