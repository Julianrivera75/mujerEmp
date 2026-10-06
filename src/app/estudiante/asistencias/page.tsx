'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Calendar, Award } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { ResponsiveTable } from '@/components/ui/Table';
import { StatusPill } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { useSessionUser } from '@/lib/user-context';
import { summarizeDays, type DayClass, type DaySummary } from '@/lib/attendance-days';
import { formatTime, formatWeekdayDate } from '@/lib/format';
import { logClientError } from '@/lib/client-log';

interface StudentClass extends DayClass {
  attendances: { studentId: string; joinedAt: string }[];
}

/** El día viene como AAAA-MM-DD en hora de Colombia; se muestra a mediodía para que ninguna zona lo mueva de fecha. */
const dayDate = (day: string) => new Date(`${day}T12:00:00-05:00`);

export default function StudentAttendanceHistoryPage() {
  const user = useSessionUser();
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/classes');
        const data = await res.json();
        const classes: StudentClass[] = data.classes || [];
        setSummary(
          summarizeDays(
            classes,
            classes.flatMap((c) =>
              c.attendances
                .filter((a) => a.studentId === user.id)
                .map((a) => ({ classId: c.id, joinedAt: a.joinedAt })),
            ),
          ),
        );
      } catch (err) {
        logClientError('Error cargando asistencias:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user.id]);

  const days = [...(summary?.days ?? [])].reverse();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Mi progreso"
        title="Mi historial de asistencia virtual"
        description="Tu asistencia se mide por día: con entrar al menos a una de las charlas del día por Google Meet, ese día ya cuenta."
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <StatCard label="Días asistidos" value={summary?.attendedDays ?? 0} icon={CheckCircle2} />
        <StatCard label="Días con charlas" value={summary?.totalDays ?? 0} icon={Calendar} />
        <StatCard
          label="Porcentaje de participación"
          value={summary?.percentage ?? 0}
          icon={Award}
          hint="% de los días con charlas"
        />
      </div>

      <Card variant="glass" className="p-4 sm:p-6">
        <h2 className="mb-4 font-display text-lg font-bold text-slate-800">Detalle por día</h2>

        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : days.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Aún no hay días con charlas"
            description="Cuando empiecen tus clases, aquí verás qué días asististe."
          />
        ) : (
          <ResponsiveTable
            caption="Mi asistencia por día"
            rows={days}
            rowKey={(d) => d.day}
            columns={[
              {
                header: 'Día',
                primary: true,
                cell: (d) => <span className="first-letter:uppercase">{formatWeekdayDate(dayDate(d.day))}</span>,
              },
              {
                header: 'Charlas a las que entré',
                cell: (d) => (
                  <span className="text-slate-600">
                    {d.classesAttended} de {d.classesInDay}
                  </span>
                ),
              },
              {
                header: 'Primer ingreso',
                cell: (d) =>
                  d.firstJoinedAt ? (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                      <Clock className="h-3.5 w-3.5 text-emerald-600" />
                      {formatTime(d.firstJoinedAt)}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  ),
              },
              {
                header: 'Estado',
                align: 'center',
                cell: (d) => (
                  <StatusPill label={d.present ? 'Presente' : 'Sin ingreso'} tone={d.present ? 'success' : 'neutral'} />
                ),
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
